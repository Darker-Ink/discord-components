import { createContext, Fragment, useLayoutEffect, useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingOverlay,
  FloatingTree,
  hide,
  limitShift,
  offset,
  safePolygon,
  shift,
  size,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useHover,
  useInteractions,
  type Middleware,
  type MiddlewareData,
  type Placement,
} from '@floating-ui/react';
import clsx from 'clsx';
import { FLOATING_LAYER_ATTRIBUTE } from './constants';
import { PopoverPortal } from './PopoverPortal';
import styles from './FloatingLayer.module.css';

export type FloatingLayerPlacement = Placement;
export type FloatingLayerSide = 'top' | 'bottom' | 'left' | 'right';
export type FloatingLayerFocus = 'none' | 'modal' | 'non-modal';
export type FloatingLayerTrigger = 'click' | 'hover';

export interface FloatingLayerContextValue {
  focus: FloatingLayerFocus;
}

export const FloatingLayerContext = createContext<FloatingLayerContextValue | null>(null);

FloatingLayerContext.displayName = 'FloatingLayerContext';

export interface FloatingLayerRenderProps {
  placement: FloatingLayerPlacement;
  update: () => void;
  hidden: boolean;
  shift: MiddlewareData['shift'];
}

export interface FloatingLayerTriggerProps {
  ref: (element: Element | null) => void;
  props: Record<string, unknown>;
}

export interface FloatingLayerProps {
  focus?: FloatingLayerFocus;
  returnFocusElement?: HTMLElement | null;
  dismissOnEscapeKey?: boolean;
  ownerDocument?: Document;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  className?: string;
  // Positions against this element instead of the one `children` attaches its ref to.
  reference?: Element | null;
  overrideTargetRect?: DOMRect;
  placement?: FloatingLayerPlacement;
  spacing?: number;
  alignmentSpacing?: number;
  autoFlip?: boolean;
  crossAccessFlip?: boolean;
  autoShift?: boolean;
  strategy?: 'fixed' | 'absolute';
  portal?: boolean;
  blockPointerEvents?: boolean;
  children: (trigger: FloatingLayerTriggerProps) => ReactNode;
  renderLayer: (props: FloatingLayerRenderProps) => ReactNode;
  viewportPadding?: number;
  shiftPadding?: number;
  maxHeight?: number;
  trigger?: FloatingLayerTrigger;
  hoverDelay?: number;
  autoUpdate?: boolean;
}

const FloatingLayerInner = ({
  focus = 'none',
  returnFocusElement,
  dismissOnEscapeKey = true,
  ownerDocument = document,
  open,
  onOpenChange,
  id,
  className,
  reference,
  overrideTargetRect,
  placement = 'bottom',
  spacing = 8,
  alignmentSpacing,
  autoFlip = true,
  crossAccessFlip = true,
  autoShift = true,
  strategy = 'fixed',
  portal = true,
  blockPointerEvents = false,
  children,
  renderLayer,
  viewportPadding = 8,
  shiftPadding,
  maxHeight,
  trigger = 'click',
  hoverDelay = 100,
  autoUpdate: shouldAutoUpdate = false,
}: FloatingLayerProps) => {
  const returnFocusRef = useRef<HTMLElement | null>(returnFocusElement ?? null);
  useLayoutEffect(() => {
    returnFocusRef.current = returnFocusElement ?? null;
  }, [returnFocusElement]);

  const middleware = useMemo(() => {
    const result: Middleware[] = [offset({ mainAxis: spacing, alignmentAxis: alignmentSpacing })];
    if (autoFlip)
      result.push(flip({ crossAxis: crossAccessFlip, padding: viewportPadding, boundary: ownerDocument.body }));
    if (autoShift) {
      result.push(
        shift({ padding: shiftPadding ?? viewportPadding, limiter: limitShift(), boundary: ownerDocument.body }),
      );
    }
    result.push(hide({ strategy: 'referenceHidden' }));
    if (maxHeight != null) {
      result.push(
        size({
          padding: viewportPadding,
          boundary: ownerDocument.body,
          apply({ availableHeight, elements }) {
            const height = Math.min(maxHeight, availableHeight);
            elements.floating.style.setProperty('--custom-floating-layer-max-height', `${height}px`);
          },
        }),
      );
    }
    return result;
  }, [
    spacing,
    alignmentSpacing,
    autoFlip,
    autoShift,
    viewportPadding,
    shiftPadding,
    crossAccessFlip,
    ownerDocument,
    maxHeight,
  ]);

  const nodeId = useFloatingNodeId();
  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
    update,
    context,
  } = useFloating({
    nodeId,
    placement,
    open,
    onOpenChange,
    strategy,
    middleware,
    whileElementsMounted: shouldAutoUpdate
      ? (referenceElement, floatingElement, updateFn) =>
          autoUpdate(referenceElement, floatingElement, updateFn, {
            ancestorScroll: overrideTargetRect == null,
            ancestorResize: overrideTargetRect == null,
            layoutShift: overrideTargetRect == null,
          })
      : undefined,
  });

  useLayoutEffect(() => {
    if (overrideTargetRect != null) refs.setPositionReference({ getBoundingClientRect: () => overrideTargetRect });
    else if (reference != null) refs.setReference(reference);
  }, [refs, overrideTargetRect, reference]);

  const dismiss = useDismiss(context, { escapeKey: dismissOnEscapeKey });
  const hover = useHover(context, {
    restMs: hoverDelay,
    delay: { open: hoverDelay, close: 0 },
    enabled: trigger === 'hover',
    handleClose: safePolygon(),
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, hover]);
  const visibility = middlewareData.hide?.referenceHidden ? 'hidden' : 'visible';
  const contextValue = useMemo(() => ({ focus }), [focus]);

  let layer: ReactNode = (
    <div
      id={id}
      className={clsx(className, styles.layer)}
      {...{ [FLOATING_LAYER_ATTRIBUTE]: true }}
      style={{ ...floatingStyles, visibility }}
      ref={refs.setFloating}
      {...getFloatingProps()}
    >
      <FloatingLayerContext.Provider value={contextValue}>
        {renderLayer({
          placement: resolvedPlacement,
          update,
          hidden: visibility === 'hidden',
          shift: middlewareData.shift,
        })}
      </FloatingLayerContext.Provider>
    </div>
  );
  if (focus !== 'none') {
    layer = (
      <FloatingFocusManager context={context} modal={focus === 'modal'} returnFocus={returnFocusRef}>
        {layer as ReactElement}
      </FloatingFocusManager>
    );
  }
  const content = (
    <>
      {blockPointerEvents ? <FloatingOverlay lockScroll /> : null}
      {layer}
    </>
  );

  return (
    <>
      {/* floating-ui's setters are stable callbacks, not ref values. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {children({ ref: refs.setReference, props: getReferenceProps() })}
      <FloatingNode id={nodeId}>
        {open &&
          (portal ? (
            <PopoverPortal ownerDocument={ownerDocument}>{content}</PopoverPortal>
          ) : (
            <Fragment>{content}</Fragment>
          ))}
      </FloatingNode>
    </>
  );
};

FloatingLayerInner.displayName = 'FloatingLayerInner';

// A layer positioned next to a reference element with floating-ui: flips and shifts to stay in
// view, dismisses on outside press and Escape, and optionally opens on hover or traps focus.
export const FloatingLayer = (props: FloatingLayerProps) =>
  useFloatingParentNodeId() == null ? (
    <FloatingTree>
      <FloatingLayerInner {...props} />
    </FloatingTree>
  ) : (
    <FloatingLayerInner {...props} />
  );

FloatingLayer.displayName = 'FloatingLayer';

// The side of a floating-ui placement ('top-start' -> 'top').
export const getFloatingLayerSide = (placement: string): FloatingLayerSide => {
  const side = placement.split('-')[0];
  switch (side) {
    case 'top':
    case 'bottom':
    case 'left':
    case 'right':
      return side;
    default:
      return 'top';
  }
};

// Maps Mana's position/align pair to a floating-ui placement.
export const getFloatingLayerPlacement = (position: string, align?: string): FloatingLayerPlacement => {
  switch (position) {
    case 'center':
    case 'window_center':
    default:
      return 'top';
    case 'top':
    case 'bottom':
      if (align === 'left') return `${position}-start`;
      if (align === 'right') return `${position}-end`;
      return position;
    case 'left':
    case 'right':
      if (align === 'top') return `${position}-start`;
      if (align === 'bottom') return `${position}-end`;
      return position;
  }
};
