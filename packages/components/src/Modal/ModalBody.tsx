import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { AdvancedScrollerAuto, type AdvancedScrollerHandle } from '../AdvancedScroller';
import { useMergeRefs } from '../hooks';
import { HeadingLevel } from '../HeadingLevel';
import { ListAuto, type ListScrollerHandle, type ListScrollerProps } from '../ListScroller';
import { Text } from '../Text';
import styles from './Modal.module.css';

// Fades show once the content is scrolled more than this far from an edge.
const FADE_THRESHOLD = 12;

// lodash's throttle with leading and trailing calls, as the client uses for the fades.
const throttle = (fn: () => void, wait: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  const onTimeout = () => {
    if (pending) {
      pending = false;
      fn();
      timer = setTimeout(onTimeout, wait);
    } else {
      timer = null;
    }
  };
  const throttled = () => {
    if (timer == null) {
      fn();
      timer = setTimeout(onTimeout, wait);
    } else {
      pending = true;
    }
  };
  throttled.cancel = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
    pending = false;
  };
  return throttled;
};

export const hasModalBodyContent = (children: ReactNode) => Children.toArray(children).filter(Boolean).length > 0;

type ScrollHandle = AdvancedScrollerHandle | ListScrollerHandle;

export type ModalBodyListProps = ListScrollerProps;

export interface ModalBodyProps {
  // Rendered above the scrolling content (e.g. a search input); the content fades out under it.
  controls?: ReactNode;
  children?: ReactNode;
  // Renders a virtualized list instead of `children`.
  listProps?: ModalBodyListProps;
  onScroll?: () => void;
  scrollerRef?: Ref<ScrollHandle>;
}

const ModalBodyContent = ({ controls, children, listProps, onScroll, scrollerRef }: ModalBodyProps) => {
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(listProps != null);
  const scrollRef = useRef<ScrollHandle | null>(null);
  const mergedRef = useMergeRefs(scrollRef, listProps?.ref as Ref<ScrollHandle> | undefined, scrollerRef);
  const mainRef = useRef<HTMLElement>(null);
  const updateFadesRef = useRef<ReturnType<typeof throttle> | undefined>(undefined);
  const hasControls = controls != null;
  useEffect(() => {
    updateFadesRef.current = throttle(() => {
      if (scrollRef.current == null) return;
      if (hasControls) setShowTopFade(scrollRef.current.getDistanceFromTop() > FADE_THRESHOLD);
      setShowBottomFade(scrollRef.current.getDistanceFromBottom() > FADE_THRESHOLD);
    }, 200);
    return () => {
      updateFadesRef.current?.cancel();
    };
  }, [hasControls]);
  const handleScroll = useCallback(() => {
    updateFadesRef.current?.();
    onScroll?.();
  }, [onScroll]);
  useEffect(() => {
    updateFadesRef.current?.();
  });
  const isList = listProps != null;
  useLayoutEffect(() => {
    const view = mainRef.current?.ownerDocument?.defaultView ?? window;
    const observer = new view.ResizeObserver(() => {
      if (isList) {
        setShouldScroll(true);
        return;
      }
      const scroller = scrollRef.current?.getScrollerNode() ?? null;
      if (scroller == null || mainRef.current == null) return;
      const rect = scroller.getBoundingClientRect();
      setShouldScroll(mainRef.current.getBoundingClientRect().height > rect.height);
    });
    const scroller = scrollRef.current?.getScrollerNode() ?? null;
    if (scroller != null) observer.observe(scroller);
    if (mainRef.current != null) observer.observe(mainRef.current);
    return () => observer.disconnect();
  }, [isList]);
  return (
    <HeadingLevel>
      <div className={clsx(styles.bodySpacerTop, { [styles.bodySpacerTopBorder]: shouldScroll && controls == null })} />
      {controls != null && (
        <header className={clsx(styles.bodyControls, { [styles.showFade]: showTopFade })}>{controls}</header>
      )}
      {listProps != null ? (
        <ListAuto
          {...listProps}
          className={styles.bodyList}
          innerAriaOrientation={listProps.innerAriaOrientation ?? 'vertical'}
          innerRole={listProps.innerRole ?? 'listbox'}
          ref={mergedRef as Ref<ListScrollerHandle>}
          onScroll={(event) => {
            handleScroll();
            listProps.onScroll?.(event);
          }}
        />
      ) : (
        <AdvancedScrollerAuto
          ref={mergedRef as Ref<AdvancedScrollerHandle>}
          className={styles.body}
          onScroll={handleScroll}
          disableFocusRingScope
        >
          <main ref={mainRef} className={clsx(styles.bodyInner, { [styles.bodyInnerShouldScroll]: shouldScroll })}>
            {children}
          </main>
        </AdvancedScrollerAuto>
      )}
      <div
        className={clsx(styles.bodySpacerBottom, {
          [styles.bodyScrollingSpacerBottom]: shouldScroll,
          [styles.showFade]: showBottomFade,
        })}
      />
    </HeadingLevel>
  );
};

ModalBodyContent.displayName = 'ModalBodyContent';

// The modal's scrolling content area. Plain text children are styled as body text; with nothing to
// show it renders nothing.
export const ModalBody = ({ controls, children, listProps, onScroll, scrollerRef }: ModalBodyProps) => {
  if (!hasModalBodyContent(children) && controls == null && listProps == null) return null;
  const content =
    typeof children === 'string' ? (
      <Text variant="body-md/normal" color="text-subtle">
        {children}
      </Text>
    ) : (
      children
    );
  return (
    <ModalBodyContent controls={controls} listProps={listProps} onScroll={onScroll} scrollerRef={scrollerRef}>
      {content}
    </ModalBodyContent>
  );
};

ModalBody.displayName = 'ModalBody';
