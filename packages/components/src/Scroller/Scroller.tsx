import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { FocusRingScope } from 'react-focus-rings';
import styles from './Scroller.module.css';

export type ScrollerOrientation = 'vertical' | 'horizontal' | 'auto';
export type ScrollerOverflow = 'scroll' | 'auto';
// `false` lets the scrollbar take space from the content when it appears.
export type ScrollbarGutter = 'stable' | 'both-edges' | false;

export interface ScrollerProps extends HTMLAttributes<HTMLDivElement> {
  dir?: 'ltr' | 'rtl';
  orientation?: ScrollerOrientation;
  scrollbarGutter?: ScrollbarGutter;
  // Hide the scrollbar until the scroller is hovered.
  fade?: boolean;
  disableFocusRingScope?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const VERTICAL_SCROLL = Object.freeze({ overflowY: 'scroll', overflowX: 'hidden' } as const);
const VERTICAL_AUTO = Object.freeze({ overflowY: 'auto', overflowX: 'hidden' } as const);
const HORIZONTAL_SCROLL = Object.freeze({ overflowX: 'scroll', overflowY: 'hidden' } as const);
const HORIZONTAL_AUTO = Object.freeze({ overflowX: 'auto', overflowY: 'hidden' } as const);
const BOTH_AUTO = Object.freeze({ overflow: 'auto' } as const);

export const getScrollerStyle = (
  style?: CSSProperties | null,
  orientation: ScrollerOrientation = 'vertical',
  overflow: ScrollerOverflow = 'scroll',
): CSSProperties => {
  const base =
    orientation === 'vertical'
      ? overflow === 'auto'
        ? VERTICAL_AUTO
        : VERTICAL_SCROLL
      : orientation === 'horizontal'
        ? overflow === 'auto'
          ? HORIZONTAL_AUTO
          : HORIZONTAL_SCROLL
        : BOTH_AUTO;
  return style != null ? { ...base, ...style } : base;
};

const GUTTER_SPACER_STYLE: CSSProperties = {
  boxSizing: 'content-box',
  position: 'relative',
  pointerEvents: 'none',
  minWidth: 0,
  minHeight: 1,
  flex: '0 0 auto',
};

interface HorizontalGutterOptions {
  scrollbarGutter?: ScrollbarGutter;
  orientation?: ScrollerOrientation;
  className?: string;
  scrollerRef: RefObject<HTMLElement | null>;
}

// Padding at the end of a horizontal scroller is lost once its content overflows, so a spacer as
// wide as the start padding is appended to keep both edges symmetric.
export const useHorizontalScrollerGutter = ({
  scrollbarGutter = 'stable',
  orientation = 'vertical',
  className,
  scrollerRef,
}: HorizontalGutterOptions) => {
  const spacerRef = useRef<HTMLDivElement>(null);
  const enabled = scrollbarGutter !== false && orientation === 'horizontal';

  useLayoutEffect(() => {
    if (!enabled) return;
    const scroller = scrollerRef.current;
    const spacer = spacerRef.current;
    if (scroller == null || spacer == null) return;
    const view = scroller.ownerDocument?.defaultView;
    if (view == null) return;
    spacer.style.width = view.getComputedStyle(scroller).getPropertyValue('padding-left');
  }, [enabled, className, scrollerRef]);

  return useMemo(() => (enabled ? <div aria-hidden style={GUTTER_SPACER_STYLE} ref={spacerRef} /> : null), [enabled]);
};

interface MaybeFocusRingScopeProps {
  disableFocusRingScope?: boolean;
  containerRef: RefObject<Element | null>;
  children: ReactNode;
}

export const MaybeFocusRingScope = ({ disableFocusRingScope, containerRef, children }: MaybeFocusRingScopeProps) =>
  disableFocusRingScope ? children : <FocusRingScope containerRef={containerRef}>{children}</FocusRingScope>;

MaybeFocusRingScope.displayName = 'MaybeFocusRingScope';

const createScroller = (scrollerClassName: string, fadeClassName: string, displayName: string) => {
  const Scroller = ({
    children,
    className,
    dir = 'ltr',
    orientation = 'vertical',
    scrollbarGutter = 'stable',
    fade = false,
    disableFocusRingScope = false,
    // Discord's simple scrollers accept but never attach onScroll.
    onScroll: _onScroll,
    style,
    ref,
    ...props
  }: ScrollerProps) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const gutterSpacer = useHorizontalScrollerGutter({ scrollbarGutter, orientation, className, scrollerRef });
    const gutterClassName =
      scrollbarGutter === false || orientation !== 'vertical'
        ? undefined
        : scrollbarGutter === 'stable'
          ? styles.scrollbarGutterStable
          : styles.scrollbarGutter;

    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref != null) ref.current = node;
          scrollerRef.current = node;
        }}
        className={clsx(className, gutterClassName, { [scrollerClassName]: true, [fadeClassName]: fade })}
        style={getScrollerStyle(style, orientation)}
        dir={dir}
        {...props}
      >
        <MaybeFocusRingScope disableFocusRingScope={disableFocusRingScope} containerRef={scrollerRef}>
          {children}
          {gutterSpacer}
        </MaybeFocusRingScope>
      </div>
    );
  };
  Scroller.displayName = displayName;
  return Scroller;
};

export const ScrollerThin = createScroller(clsx(styles.thin, styles.scrollerBase), styles.fade, 'ScrollerThin');
export const ScrollerAuto = createScroller(clsx(styles.auto, styles.scrollerBase), styles.fade, 'ScrollerAuto');
export const ScrollerNone = createScroller(clsx(styles.none, styles.scrollerBase), styles.fade, 'ScrollerNone');
