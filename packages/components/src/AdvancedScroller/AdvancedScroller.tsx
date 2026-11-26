import { useCallback, useImperativeHandle, useRef, type HTMLAttributes, type Ref } from 'react';
import clsx from 'clsx';
import { getScrollHelpers, useScrollSpring } from '../ListScroller/scrollSpring';
import {
  MaybeFocusRingScope,
  getScrollerStyle,
  useHorizontalScrollerGutter,
  type ScrollbarGutter,
  type ScrollerOrientation,
  type ScrollerOverflow,
} from '../Scroller';
import scrollerStyles from '../Scroller/Scroller.module.css';
import { Stack, type StackSpace } from '../Stack';

export interface AdvancedScrollerState {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  offsetHeight: number;
  offsetWidth: number;
  dirty: 0;
}

const EMPTY_STATE: AdvancedScrollerState = Object.freeze({
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 0,
  scrollWidth: 0,
  offsetHeight: 0,
  offsetWidth: 0,
  dirty: 0,
});

// Reads the scroller's measurements fresh each time (unlike the list scrollers, which cache them).
const useScrollerState = () => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const getScrollerState = useCallback((): AdvancedScrollerState => {
    const { current } = scrollerRef;
    if (current == null) return EMPTY_STATE;
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, offsetHeight, offsetWidth } = current;
    return { scrollTop, scrollLeft, scrollHeight, scrollWidth, offsetHeight, offsetWidth, dirty: 0 };
  }, []);
  return { scrollerRef, getScrollerState };
};

export type AdvancedScrollerHandle = {
  getScrollerNode: () => HTMLDivElement | null;
  getScrollerState: () => AdvancedScrollerState;
} & ReturnType<typeof getScrollHelpers>;

export interface AdvancedScrollerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'dir'> {
  dir?: 'ltr' | 'rtl';
  orientation?: ScrollerOrientation;
  overflow?: ScrollerOverflow;
  // Hide the scrollbar until the scroller is hovered.
  fade?: boolean;
  // Leave the scrollbar colors to the caller's styles.
  customTheme?: boolean;
  scrollbarGutter?: ScrollbarGutter;
  // Lays the children out in a Stack with this gap.
  gap?: StackSpace;
  experimental_useStack?: boolean;
  disableFocusRingScope?: boolean;
  ref?: Ref<AdvancedScrollerHandle>;
}

const createAdvancedScroller = (
  scrollerClassName: string,
  fadeClassName: string,
  customThemeClassName: string,
  displayName: string,
) => {
  const AdvancedScroller = ({
    children,
    className,
    dir = 'ltr',
    orientation = 'vertical',
    overflow = 'scroll',
    fade = false,
    customTheme = false,
    scrollbarGutter = 'stable',
    style,
    gap,
    experimental_useStack: useStack,
    disableFocusRingScope = false,
    ref,
    ...props
  }: AdvancedScrollerProps) => {
    const { scrollerRef, getScrollerState } = useScrollerState();
    const spring = useScrollSpring(scrollerRef, orientation === 'horizontal' ? 'horizontal' : 'vertical');
    useImperativeHandle(
      ref,
      () => ({
        getScrollerNode: () => scrollerRef.current,
        getScrollerState,
        ...getScrollHelpers(
          scrollerRef,
          getScrollerState,
          spring,
          orientation === 'horizontal' ? 'horizontal' : 'vertical',
        ),
      }),
      [scrollerRef, getScrollerState, orientation, spring],
    );
    const gutterSpacer = useHorizontalScrollerGutter({ scrollbarGutter, orientation, className, scrollerRef });
    const gutterClassName =
      scrollbarGutter === false || orientation !== 'vertical'
        ? undefined
        : scrollbarGutter === 'stable'
          ? scrollerStyles.scrollbarGutterStable
          : scrollerStyles.scrollbarGutter;
    const classNames = clsx(className, gutterClassName, {
      [scrollerClassName]: true,
      [fadeClassName]: fade,
      [customThemeClassName]: customTheme,
    });
    const content = (
      <MaybeFocusRingScope disableFocusRingScope={disableFocusRingScope} containerRef={scrollerRef}>
        {children}
        {gutterSpacer}
      </MaybeFocusRingScope>
    );
    return useStack ? (
      <Stack
        gap={gap}
        ref={scrollerRef}
        className={classNames}
        style={getScrollerStyle(style, orientation, overflow)}
        dir={dir}
        {...props}
      >
        {content}
      </Stack>
    ) : (
      <div
        ref={scrollerRef}
        className={classNames}
        style={getScrollerStyle(style, orientation, overflow)}
        dir={dir}
        {...props}
      >
        {content}
      </div>
    );
  };
  AdvancedScroller.displayName = displayName;
  return AdvancedScroller;
};

export const AdvancedScrollerNone = createAdvancedScroller(
  clsx(scrollerStyles.none, scrollerStyles.scrollerBase),
  scrollerStyles.fade,
  scrollerStyles.customTheme,
  'AdvancedScrollerNone',
);
export const AdvancedScrollerThin = createAdvancedScroller(
  clsx(scrollerStyles.thin, scrollerStyles.scrollerBase),
  scrollerStyles.fade,
  scrollerStyles.customTheme,
  'AdvancedScrollerThin',
);
export const AdvancedScrollerAuto = createAdvancedScroller(
  clsx(scrollerStyles.auto, scrollerStyles.scrollerBase),
  scrollerStyles.fade,
  scrollerStyles.customTheme,
  'AdvancedScrollerAuto',
);
