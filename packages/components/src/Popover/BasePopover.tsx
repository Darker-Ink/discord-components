import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { animated } from '@react-spring/web';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Dialog, ModalContext, ModalTransitionState } from '../Dialog';
import { GradientWrapper, type GradientColorName, type GradientColorStops } from '../GradientWrapper';
import { useTransition } from '../hooks';
import type { ReferencePosition } from '../Layer';
import { BasePopout, type PopoutCloseReason, type PopoutRenderProps, type PopoutScrollBehavior } from '../Popout';
import styles from './Popover.module.css';

export type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';
export type PopoverEdgeAlign = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type PopoverCaretAlign = 'start' | 'center' | 'end' | 'custom';
export type PopoverGradientColor = GradientColorName | GradientColorStops;

export interface PopoverCaretConfig {
  align: PopoverCaretAlign;
  // With align 'custom': the caret's offset from the center, in px.
  customOffset?: number;
}

export interface PopoverContextValue {
  position: PopoverPosition;
  caretConfig: PopoverCaretConfig;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

PopoverContext.displayName = 'PopoverContext';

// The caret sits on the side facing the target.
export const getPopoverCaretPosition = (position: string | null | undefined): PopoverPosition => {
  switch (position) {
    case 'top':
      return 'bottom';
    case 'bottom':
    default:
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
};

// Popovers align their caret with the target ('trigger-center'), or line an edge up with it.
export type PopoverAlignment =
  { alignmentStrategy?: 'trigger-center'; align?: never } | { alignmentStrategy: 'edge'; align?: PopoverEdgeAlign };

export type BasePopoverProps = {
  children?: ReactNode;
  targetElementRef: RefObject<Element | null>;
  shouldShow?: boolean;
  onRequestClose?: (event: Event | undefined, reason: PopoutCloseReason | undefined) => void;
  position?: PopoverPosition;
  caretConfig?: PopoverCaretConfig;
  hasVideo?: boolean;
  gradientColor?: PopoverGradientColor;
  gradientOffsetBottom?: number;
  onPositionChange?: (position: PopoverPosition) => void;
  onNudgeChange?: (nudge: number) => void;
  scrollBehavior?: PopoutScrollBehavior;
  trackTargetPosition?: boolean;
  // Trap focus inside the popover.
  modal?: boolean;
  returnRef?: RefObject<HTMLElement | null>;
  experimental_ignoreModalClicks?: boolean;
  closeOnClickOutside?: boolean;
} & PopoverAlignment;

const ENTER_CONFIG = { mass: 1, tension: 800, friction: 32 };
const LEAVE_CONFIG = { mass: 1, tension: 1200, friction: 48 };
const POPOVER_WIDTH = 240;

const getHiddenTransform = (caretPosition: PopoverPosition) => {
  switch (caretPosition) {
    case 'top':
      return 'translate3d(0, -10px, 0)';
    case 'bottom':
      return 'translate3d(0, 10px, 0)';
    case 'left':
      return 'translate3d(-10px, 0, 0)';
    case 'right':
      return 'translate3d(10px, 0, 0)';
  }
};

// Slides in from the caret's side, or just fades with reduced motion.
const usePopoverTransition = ({
  shouldShow,
  caretPosition,
  onExitComplete,
}: {
  shouldShow: boolean;
  caretPosition: PopoverPosition;
  onExitComplete?: () => void;
}) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const transform = getHiddenTransform(caretPosition);
  const props = reducedMotion.enabled
    ? { from: { opacity: 0 }, enter: { opacity: 1 }, leave: { opacity: 0 }, config: { duration: 150 } }
    : {
        from: { opacity: 0, transform },
        enter: { opacity: 1, transform: 'translate3d(0px, 0px, 0)' },
        leave: { opacity: 0, transform },
        config: shouldShow ? ENTER_CONFIG : LEAVE_CONFIG,
      };
  return useTransition(
    shouldShow,
    {
      ...props,
      onRest: () => {
        if (!shouldShow) onExitComplete?.();
      },
    },
    'animate-always',
  );
};

// Caret offset that keeps a start/end caret 20px (22px vertically) from the popover's corner.
const getCaretOffset = (
  align: PopoverCaretAlign = 'center',
  position: PopoverPosition = 'top',
  width: number | undefined,
  height = 0,
) => {
  if (align === 'center' || align === 'custom') return 0;
  const isVertical = position === 'left' || position === 'right';
  const size = isVertical ? height : (width ?? POPOVER_WIDTH);
  if (size === 0) return 0;
  const offset = size / 2 - (isVertical ? 22 : 20);
  switch (align) {
    case 'start':
      return offset;
    case 'end':
      return -offset;
    default:
      return 0;
  }
};

const useElementSize = () => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});
  useLayoutEffect(() => {
    if (element == null) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize?.[0];
      setSize({ width: box?.inlineSize, height: box?.blockSize });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { ref: setElement, width: size.width, height: size.height };
};

// Reports the position/nudge the layer settled on after it renders.
const LayerStateReporter = ({
  position,
  nudge,
  onPosition,
  onNudge,
}: {
  position: ReferencePosition | null;
  nudge: number;
  onPosition: (position: ReferencePosition | null) => void;
  onNudge: (nudge: number) => void;
}) => {
  useLayoutEffect(() => {
    onPosition(position);
  }, [position, onPosition]);
  useLayoutEffect(() => {
    onNudge(nudge);
  }, [nudge, onNudge]);
  return null;
};

LayerStateReporter.displayName = 'LayerStateReporter';

const renderNothing = () => null;

// The shared shell of Mana popovers: a Popout attached to `targetElementRef` with a caret pointing
// at the target, a slide/fade transition, an optional gradient, and a (non-modal by default) dialog
// around the content.
export const BasePopover = ({
  children,
  targetElementRef,
  shouldShow = true,
  onRequestClose,
  position = 'top',
  align,
  alignmentStrategy = 'trigger-center',
  caretConfig,
  hasVideo = false,
  gradientColor,
  gradientOffsetBottom = 0.4,
  onPositionChange,
  onNudgeChange,
  scrollBehavior = 'sticky',
  trackTargetPosition = true,
  modal = false,
  returnRef,
  experimental_ignoreModalClicks = true,
  closeOnClickOutside = false,
}: BasePopoverProps) => {
  const { transitionState } = useContext(ModalContext);
  const isModalTransitioning = transitionState != null && transitionState !== ModalTransitionState.ENTERED;
  const [isShown, setIsShown] = useState(shouldShow);
  const [renderedPosition, setRenderedPosition] = useState<PopoverPosition>(position);
  const positionRef = useRef(position);
  const nudgeRef = useRef(0);
  const { ref: rootRef, width, height } = useElementSize();
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  const updatePosition = useCallback((next: ReferencePosition | null) => {
    if (next != null && next !== positionRef.current) {
      positionRef.current = next as PopoverPosition;
      setRenderedPosition(next as PopoverPosition);
      onPositionChangeRef.current?.(next as PopoverPosition);
    }
  }, []);

  const updateNudge = useCallback(
    (nudge: number) => {
      if (nudge !== nudgeRef.current) {
        nudgeRef.current = nudge;
        onNudgeChange?.(nudge);
      }
    },
    [onNudgeChange],
  );

  useEffect(() => {
    // Only targets on the topmost app layer show popovers. Discord tracks its full-screen layers
    // (settings and the like) in a store; outside the client the base layer is the only one.
    const target = targetElementRef.current;
    const isOnTopLayer =
      target == null || (target.closest('[data-layer]')?.getAttribute('data-layer') ?? 'base') === 'base';
    // Mirrors the visibility inputs; the popout itself unmounts after the exit transition.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isModalTransitioning) setIsShown(false);
    else if (isOnTopLayer && shouldShow) setIsShown(true);
    else if (!isOnTopLayer) setIsShown(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [targetElementRef, shouldShow, isModalTransitioning]);

  useEffect(() => {
    updatePosition(position);
  }, [position, updatePosition]);

  const transition = usePopoverTransition({
    shouldShow: shouldShow && !isModalTransitioning,
    caretPosition: getPopoverCaretPosition(renderedPosition),
    onExitComplete: () => setIsShown(false),
  });

  const resolvedAlign = useMemo(() => {
    if (alignmentStrategy === 'edge' && align != null) {
      const isHorizontal = renderedPosition === 'top' || renderedPosition === 'bottom';
      const isVertical = renderedPosition === 'left' || renderedPosition === 'right';
      if (isHorizontal) {
        if (align === 'left' || align === 'center' || align === 'right') return align;
      } else if (isVertical && (align === 'top' || align === 'center' || align === 'bottom')) return align;
    }
    return 'center';
  }, [alignmentStrategy, align, renderedPosition]);

  const offset = useMemo(() => {
    if (alignmentStrategy !== 'edge')
      return getCaretOffset(caretConfig?.align ?? 'center', renderedPosition, width, height);
    return undefined;
  }, [alignmentStrategy, caretConfig, renderedPosition, width, height]);

  const contextValue = useMemo(
    () => ({ position: renderedPosition, caretConfig: caretConfig ?? { align: 'center' as const } }),
    [renderedPosition, caretConfig],
  );

  // Discord also spreads the remaining render props (isPositioned, updatePosition, closePopout) onto
  // the dialog, where React drops them; they are left out here.
  const renderPopout = ({ setPopoutRef, position: layerPosition, nudge }: PopoutRenderProps) =>
    transition((style, show) => {
      if (!show) return null;
      const dialog = (
        <Dialog
          setDialogRef={setPopoutRef}
          modal={modal}
          className={clsx(gradientColor != null ? styles.popoverContentWithGradient : styles.popover, {
            [styles['popover--video']]: hasVideo,
          })}
          returnRef={returnRef}
        >
          <PopoverContext.Provider value={contextValue}>{children}</PopoverContext.Provider>
        </Dialog>
      );
      const rootStyle = {
        ...style,
        '--custom-caret-edge-offset-horizontal': '20px',
        '--custom-caret-edge-offset-vertical': '22px',
        '--custom-caret-edge-offset-horizontal-nudge': `${nudge}px`,
        '--custom-popover-width': `${POPOVER_WIDTH}px`,
      } as unknown as CSSProperties;
      return (
        <>
          <LayerStateReporter
            position={layerPosition}
            nudge={nudge}
            onPosition={updatePosition}
            onNudge={updateNudge}
          />
          <animated.div ref={rootRef} data-mana-component="popover" className={styles.popoverRoot} style={rootStyle}>
            {gradientColor != null ? (
              <GradientWrapper
                offsetBottom={gradientOffsetBottom}
                color={gradientColor}
                className={styles.popoverGradientWrapper}
              >
                {dialog}
              </GradientWrapper>
            ) : (
              dialog
            )}
          </animated.div>
        </>
      );
    });

  return (
    <BasePopout
      targetElementRef={targetElementRef}
      shouldShow={isShown && !isModalTransitioning}
      onRequestClose={onRequestClose}
      position={renderedPosition}
      align={resolvedAlign}
      spacing={14}
      offset={offset}
      layerContext={undefined}
      positionKey={offset != null ? `${renderedPosition}-${offset}` : undefined}
      popoutKey={undefined}
      fixed={false}
      trackTargetPosition={trackTargetPosition}
      autoInvert
      nudgeAlignIntoViewport={renderedPosition === 'top' || renderedPosition === 'bottom'}
      closeOnClickOutside={closeOnClickOutside}
      ignoreModalClicks={experimental_ignoreModalClicks}
      scrollBehavior={scrollBehavior}
      renderPopout={renderPopout}
    >
      {renderNothing}
    </BasePopout>
  );
};

BasePopover.displayName = 'BasePopover';
