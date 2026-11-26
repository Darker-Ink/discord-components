/* eslint-disable react-hooks/refs, react-hooks/immutability, react-hooks/preserve-manual-memoization --
   The list keeps its measurements and last layout in refs and mutates them during render, like Discord's. */
import {
  Fragment,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  type UIEvent,
} from 'react';
import clsx from 'clsx';
import { MaybeFocusRingScope, getScrollerStyle, type ScrollbarGutter } from '../Scroller';
import scrollerStyles from '../Scroller/Scroller.module.css';
import {
  ListComputer,
  type FooterHeight,
  type GetAnchorId,
  type ListFooterItem,
  type ListHeaderHeight,
  type ListItem,
  type ListRowItem,
  type ListSectionItem,
  type RowHeight,
  type SectionHeight,
} from './ListComputer';
import { getScrollHelpers, useScrollSpring } from './scrollSpring';
import {
  NOOP_RESIZE_OBSERVER,
  useCachedScrollerState,
  useForceUpdate,
  useResizeObserverSubscription,
  useVirtualizedChunks,
  type ResizeObserverLike,
  type ScrollerDirtyLevel,
  type ScrollerState,
} from './scrollerState';

interface ListState {
  spacerTop: number;
  totalHeight: number;
  items: ListItem[];
  isSidebarVisible: boolean;
}

const EMPTY_STATE: ListState = Object.freeze({ spacerTop: 0, totalHeight: 0, items: [], isSidebarVisible: false });

interface Anchor {
  id: string | number;
  section: number;
  row: number | undefined;
  scrollOffset: number;
}

const useListState = ({
  sections,
  sectionHeight,
  rowHeight,
  footerHeight,
  sidebarHeight,
  listHeaderHeight,
  chunkSize = 256,
  paddingTop = 0,
  paddingBottom = 0,
  getScrollerState,
  getAnchorId,
}: {
  sections: number[];
  sectionHeight: SectionHeight;
  rowHeight: RowHeight;
  footerHeight: FooterHeight;
  sidebarHeight?: number;
  listHeaderHeight: ListHeaderHeight;
  chunkSize?: number;
  paddingTop?: number;
  paddingBottom?: number;
  getScrollerState: () => ScrollerState;
  getAnchorId?: GetAnchorId;
}) => {
  const forceUpdate = useForceUpdate();
  const previous = useRef<ListState>(EMPTY_STATE);
  const [listComputer] = useState(() => new ListComputer());
  const { dirty, chunkStart, chunkEnd, forceUpdateOnChunkChange } = useVirtualizedChunks({
    chunkSize,
    getScrollerState,
    forceUpdate,
  });
  // The first item at or below the scroll position, so a re-layout can keep it in place.
  const { items: previousItems } = previous.current;
  let anchor: Anchor | null = null;
  const { scrollTop } = getScrollerState();
  for (const item of previousItems) {
    if (scrollTop === 0) break;
    if (item.type === 'footer' || item.type === 'header' || item.anchorId == null) continue;
    const row = item.type === 'row' ? item.row : undefined;
    if (item.offsetTop >= scrollTop) {
      anchor = { id: item.anchorId, section: item.section, row, scrollOffset: item.offsetTop - scrollTop };
      break;
    }
  }
  const isSidebarVisible = useMemo(() => {
    const start = Math.max(0, chunkStart * chunkSize);
    return sidebarHeight != null && start < sidebarHeight;
  }, [chunkSize, chunkStart, sidebarHeight]);
  const state = useMemo(
    () => {
      // While measurements are stale the previous layout is kept; a forced update follows.
      if (dirty > 0) return previous.current;
      listComputer.mergeProps({
        sectionHeight,
        rowHeight,
        footerHeight,
        listHeaderHeight,
        paddingBottom,
        paddingTop,
        sections,
        getAnchorId,
      });
      return {
        ...listComputer.compute(Math.max(0, chunkStart * chunkSize), chunkEnd * chunkSize),
        isSidebarVisible: false,
      };
    },
    // isSidebarVisible is merged in below.
    [
      dirty,
      chunkStart,
      chunkEnd,
      sectionHeight,
      rowHeight,
      footerHeight,
      listHeaderHeight,
      paddingBottom,
      paddingTop,
      sections,
      listComputer,
      chunkSize,
      getAnchorId,
    ],
  );
  useLayoutEffect(() => {
    previous.current = state;
  });
  return { ...state, listComputer, forceUpdateOnChunkChange, anchor, isSidebarVisible };
};

// After a re-layout, scrolls so the anchored item sits where it was.
const useAnchorRestoration = ({
  scrollerRef,
  anchor,
  getScrollerState,
  listComputer,
  getAnchorId,
  totalHeight,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
  anchor: Anchor | null;
  getScrollerState: () => ScrollerState;
  listComputer: ListComputer;
  getAnchorId?: GetAnchorId;
  totalHeight: number;
}) => {
  useLayoutEffect(() => {
    const { current } = scrollerRef;
    const { scrollTop } = getScrollerState();
    const restore = (row: number) => {
      if (
        anchor == null ||
        getAnchorId == null ||
        current == null ||
        row < 0 ||
        row >= listComputer.sections[anchor.section] ||
        getAnchorId(anchor.section, anchor.row) !== anchor.id
      ) {
        return false;
      }
      const [position] = listComputer.computeScrollPosition(anchor.section, row);
      const target = position - anchor.scrollOffset;
      if (scrollTop !== target) current.scrollTop = target;
      return true;
    };
    if (anchor != null && anchor.row != null && current != null && getAnchorId != null && scrollTop !== 0) {
      void (restore(anchor.row) || restore(anchor.row - 1) || restore(anchor.row + 1));
    }
    // Only a change in total height can move the anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHeight]);
};

interface RenderItemsOptions {
  renderSection?: (item: ListSectionItem) => ReactNode;
  renderRow: (item: ListRowItem) => ReactNode;
  renderFooter?: (item: ListFooterItem) => ReactNode;
  renderListHeader?: () => ReactNode;
  stickyListHeader?: boolean;
  wrapSection?: (section: number, children: ReactNode[]) => ReactNode;
  items: ListItem[];
  spacerTop: number;
}

const renderItems = ({
  renderSection,
  renderRow,
  renderFooter,
  renderListHeader,
  stickyListHeader,
  wrapSection,
  items,
  spacerTop,
}: RenderItemsOptions) => {
  const nodes: (ReactNode | ReactNode[])[] = [
    <div aria-hidden key="---list-spacer-top" style={{ height: spacerTop }} />,
  ];
  let sectionNodes: ReactNode[] = [];
  let currentSection = 0;
  if (stickyListHeader === true && renderListHeader != null) {
    nodes.push(<Fragment key="---sticky-header">{renderListHeader()}</Fragment>);
  }
  items.forEach((item) => {
    if (item.section !== currentSection && sectionNodes.length > 0) {
      nodes.push(wrapSection?.(currentSection, sectionNodes) ?? sectionNodes);
      sectionNodes = [];
    }
    currentSection = item.section ?? 0;
    switch (item.type) {
      case 'section':
        if (renderSection != null) sectionNodes.push(renderSection(item));
        break;
      case 'row':
        sectionNodes.push(renderRow(item));
        break;
      case 'footer':
        if (renderFooter != null) sectionNodes.push(renderFooter(item));
        break;
      case 'header':
        if (renderListHeader != null && stickyListHeader !== true) sectionNodes.push(renderListHeader());
    }
  });
  if (sectionNodes.length > 0) nodes.push(wrapSection?.(currentSection, sectionNodes) ?? sectionNodes);
  return nodes.flat();
};

export interface ScrollToIndexOptions {
  section: number;
  row?: number;
  animate?: boolean;
  callback?: () => void;
  padding?: number;
}

export type ListScrollerHandle = ReturnType<typeof getScrollHelpers> & {
  getScrollerNode: () => HTMLDivElement | null;
  getScrollerState: () => ScrollerState;
  getItems: () => ListItem[];
  getSectionRowFromIndex: (index: number) => [number, number];
  getScrollPosition: (section: number, row?: number) => [number, number];
  isItemVisible: (section: number, row?: number, completely?: boolean) => boolean;
  scrollToIndex: (options: ScrollToIndexOptions) => void;
};

export interface ListScrollerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onScroll' | 'onResize'> {
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onResize?: (() => void) | null;
  onContentResize?: (() => void) | null;
  sections: number[];
  sectionHeight: SectionHeight;
  rowHeight: RowHeight;
  footerHeight?: FooterHeight;
  sidebarHeight?: number;
  listHeaderHeight?: ListHeaderHeight;
  renderSection?: (item: ListSectionItem) => ReactNode;
  renderRow: (item: ListRowItem) => ReactNode;
  renderFooter?: (item: ListFooterItem) => ReactNode;
  renderSidebar?: (isListVisible: boolean, isSidebarVisible: boolean) => ReactNode;
  renderListHeader?: () => ReactNode;
  stickyListHeader?: boolean;
  wrapSection?: (section: number, children: ReactNode[]) => ReactNode;
  getAnchorId?: GetAnchorId;
  paddingTop?: number;
  paddingBottom?: number;
  scrollbarGutter?: ScrollbarGutter;
  fade?: boolean;
  customTheme?: boolean;
  chunkSize?: number;
  style?: CSSProperties;
  innerId?: string;
  innerRole?: string;
  innerAriaLabel?: string;
  innerAriaMultiselectable?: boolean;
  innerAriaOrientation?: 'horizontal' | 'vertical';
  innerClassName?: string;
  innerTag?: ElementType;
  disableFocusRingScope?: boolean;
  ref?: Ref<ListScrollerHandle>;
}

type ResizeObserverConstructor = new (callback: ResizeObserverCallback) => ResizeObserverLike;

/** Builds a virtualized, sectioned list scroller with the given scroller classes. */
export const createListScroller = (
  scrollerClassName: string,
  fadeClassName: string,
  customThemeClassName: string,
  ResizeObserverImpl: ResizeObserverConstructor,
  displayName: string,
) => {
  const listenerMap = new Map<Element, (entry: ResizeObserverEntry) => void>();
  const resizeObserver: ResizeObserverLike =
    typeof document === 'undefined'
      ? NOOP_RESIZE_OBSERVER
      : new ResizeObserverImpl((entries) => {
          entries.forEach((entry) => {
            listenerMap.get(entry.target)?.(entry);
          });
        });

  const ListScroller = ({
    className,
    onScroll,
    onResize = null,
    onContentResize = null,
    sections,
    sectionHeight,
    rowHeight,
    footerHeight = 0,
    sidebarHeight,
    listHeaderHeight = 0,
    renderSection,
    renderRow,
    renderFooter,
    renderSidebar,
    renderListHeader,
    stickyListHeader,
    wrapSection,
    getAnchorId,
    paddingTop,
    paddingBottom,
    scrollbarGutter = 'stable',
    fade = false,
    customTheme = false,
    chunkSize,
    style,
    innerId,
    innerRole,
    innerAriaLabel,
    innerAriaMultiselectable,
    innerAriaOrientation,
    innerClassName,
    innerTag: InnerTag = 'div',
    disableFocusRingScope = false,
    ref,
    ...props
  }: ListScrollerProps) => {
    const scrollingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const { scrollerRef, scrollerState, getScrollerState } = useCachedScrollerState();
    const { spacerTop, totalHeight, items, isSidebarVisible, listComputer, forceUpdateOnChunkChange, anchor } =
      useListState({
        sections,
        sectionHeight,
        rowHeight,
        footerHeight,
        sidebarHeight,
        listHeaderHeight,
        paddingTop,
        paddingBottom,
        chunkSize,
        getScrollerState,
        getAnchorId,
      });
    const spring = useScrollSpring(scrollerRef);
    const onResizeRef = useRef(onResize);
    const onContentResizeRef = useRef(onContentResize);
    useLayoutEffect(() => {
      onResizeRef.current = onResize;
      onContentResizeRef.current = onContentResize;
    });
    const markDirty = useCallback(
      (level: ScrollerDirtyLevel = 2) => {
        if (level > scrollerState.current.dirty) scrollerState.current.dirty = level;
        if (level === 2) onResizeRef.current?.();
        forceUpdateOnChunkChange(level);
      },
      [forceUpdateOnChunkChange, scrollerState],
    );
    const handleContainerResize = useCallback(() => markDirty(), [markDirty]);
    useResizeObserverSubscription({
      ref: scrollerRef,
      onUpdate: handleContainerResize,
      key: 'container',
      resizeObserver,
      listenerMap,
    });
    useResizeObserverSubscription({
      ref: contentRef,
      onUpdate: () => onContentResizeRef.current?.(),
      key: 'content',
      resizeObserver,
      listenerMap,
    });
    const itemsRef = useRef(items);
    useLayoutEffect(() => {
      itemsRef.current = items;
    }, [items]);
    const getItems = useCallback(() => itemsRef.current, []);
    const sectionsRef = useRef(sections);
    useLayoutEffect(() => {
      sectionsRef.current = sections;
    }, [sections]);
    const getSectionRowFromIndex = useCallback((index: number): [number, number] => {
      const { current } = sectionsRef;
      let start = 0;
      for (let section = 0; section < current.length; section++) {
        const rows = current[section];
        if (start <= index && start + rows >= index) return [section, index - start];
        start += rows;
      }
      return [0, 0];
    }, []);

    useImperativeHandle(ref, () => {
      const helpers = getScrollHelpers(scrollerRef, getScrollerState, spring);
      const getScrollPosition = (section: number, row?: number) => listComputer.computeScrollPosition(section, row);
      return {
        getScrollerNode: () => scrollerRef.current,
        getScrollerState,
        getItems,
        getSectionRowFromIndex,
        ...helpers,
        getScrollPosition,
        isItemVisible(section: number, row?: number, completely = false) {
          const [top, height] = getScrollPosition(section, row);
          const state = getScrollerState();
          return completely
            ? top >= state.scrollTop && top + height <= state.scrollTop + state.offsetHeight
            : top + height >= state.scrollTop && top <= state.scrollTop + state.offsetHeight;
        },
        scrollToIndex({ section, row, animate, callback, padding = 0 }: ScrollToIndexOptions) {
          const [top, height] = getScrollPosition(section, row);
          helpers.scrollIntoViewRect({ start: top, end: top + height, padding, animate, callback });
        },
      };
    }, [scrollerRef, getScrollerState, getSectionRowFromIndex, getItems, listComputer, spring]);

    const handleScroll = useCallback(
      (event: UIEvent<HTMLDivElement>) => {
        markDirty(1);
        if (scrollingTimeout.current == null) setIsScrolling(true);
        else clearTimeout(scrollingTimeout.current);
        scrollingTimeout.current = setTimeout(() => {
          scrollingTimeout.current = null;
          setIsScrolling(false);
        }, 200);
        onScroll?.(event);
      },
      [onScroll, markDirty],
    );

    useLayoutEffect(() => {
      if (scrollerState.current.dirty !== 2) scrollerState.current.dirty = 2;
    }, [renderSection, renderRow, renderFooter, wrapSection, totalHeight, spacerTop, scrollerState]);

    useAnchorRestoration({ scrollerRef, anchor, getScrollerState, listComputer, getAnchorId, totalHeight });

    const content = useMemo(
      () => (
        <InnerTag
          id={innerId}
          role={innerRole}
          aria-label={innerAriaLabel}
          aria-multiselectable={innerAriaMultiselectable}
          aria-orientation={innerAriaOrientation}
          style={{ height: totalHeight }}
          className={clsx(scrollerStyles.content, innerClassName)}
          ref={contentRef}
        >
          <MaybeFocusRingScope disableFocusRingScope={disableFocusRingScope} containerRef={contentRef}>
            {renderItems({
              items,
              renderListHeader,
              stickyListHeader,
              renderSection,
              renderRow,
              renderFooter,
              wrapSection,
              spacerTop,
            })}
          </MaybeFocusRingScope>
        </InnerTag>
      ),
      [
        InnerTag,
        innerId,
        innerRole,
        innerAriaLabel,
        innerAriaMultiselectable,
        innerAriaOrientation,
        totalHeight,
        innerClassName,
        items,
        renderListHeader,
        stickyListHeader,
        renderSection,
        renderRow,
        renderFooter,
        wrapSection,
        spacerTop,
        disableFocusRingScope,
      ],
    );
    const sidebar = useMemo(
      () =>
        sidebarHeight == null || renderSidebar == null ? null : renderSidebar(items.length !== 0, isSidebarVisible),
      [isSidebarVisible, renderSidebar, sidebarHeight, items.length],
    );

    return (
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={clsx(
          className,
          scrollbarGutter === false
            ? undefined
            : scrollbarGutter === 'stable'
              ? scrollerStyles.scrollbarGutterStable
              : scrollerStyles.scrollbarGutter,
          {
            [scrollerClassName]: true,
            [fadeClassName]: fade,
            [customThemeClassName]: customTheme,
            [scrollerStyles.scrolling]: isScrolling,
          },
        )}
        style={getScrollerStyle(style)}
        {...props}
      >
        {content}
        {sidebar}
      </div>
    );
  };
  ListScroller.displayName = displayName;
  return ListScroller;
};

const ResizeObserverImpl: ResizeObserverConstructor =
  typeof window === 'undefined'
    ? class {
        observe() {}
        unobserve() {}
      }
    : (window.ResizeObserver ??
      class {
        observe() {}
        unobserve() {}
      });

export const ListThin = createListScroller(
  clsx(scrollerStyles.thin, scrollerStyles.scrollerBase),
  scrollerStyles.fade,
  '',
  ResizeObserverImpl,
  'ListThin',
);

export const ListAuto = createListScroller(
  clsx(scrollerStyles.auto, scrollerStyles.scrollerBase),
  scrollerStyles.fade,
  '',
  ResizeObserverImpl,
  'ListAuto',
);
