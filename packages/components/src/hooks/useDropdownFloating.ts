import { createContext, useContext, useEffect, useRef, useState, type RefObject } from 'react';
import {
  autoPlacement,
  autoUpdate,
  flip,
  offset as offsetMiddleware,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  type Placement,
  type Rect,
} from '@floating-ui/react';

export interface FloatingBoundary {
  ref: RefObject<Element | null>;
  padding?: number;
}

/** Keeps dropdowns rendered inside it (selects, date pickers) within its element. */
export const FloatingBoundaryContext = createContext<FloatingBoundary | null>(null);

FloatingBoundaryContext.displayName = 'FloatingBoundaryContext';

export interface UseDropdownFloatingOptions {
  defaultOpen?: boolean;
  offset?: number;
  // Without a placement the dropdown picks whichever side has the most room.
  placement?: Placement;
  matchReferenceWidth?: boolean;
  setHeight?: (reference: Rect) => number;
  setWidth?: (reference: Rect) => number;
  transform?: boolean;
}

/** A dropdown anchored to a trigger (fixed positioning, rendered in place), closed by Escape and outside presses. */
export const useDropdownFloating = ({
  defaultOpen,
  offset = 4,
  placement,
  matchReferenceWidth = true,
  setHeight,
  setWidth,
  transform,
}: UseDropdownFloatingOptions) => {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const boundary = useContext(FloatingBoundaryContext);
  // Middleware closures read these through refs so they don't need to be rebuilt each render.
  const setHeightRef = useRef(setHeight);
  useEffect(() => {
    setHeightRef.current = setHeight;
  }, [setHeight]);
  const setWidthRef = useRef(setWidth);
  useEffect(() => {
    setWidthRef.current = setWidth;
  }, [setWidth]);
  const matchWidthRef = useRef(matchReferenceWidth);
  useEffect(() => {
    matchWidthRef.current = matchReferenceWidth;
  }, [matchReferenceWidth]);

  const getBoundary = () => ({
    boundary: boundary?.ref.current ?? ('clippingAncestors' as const),
    padding: boundary?.padding,
  });

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    transform,
    middleware: [
      placement == null ? autoPlacement(getBoundary) : undefined,
      size(() => ({
        ...getBoundary(),
        apply({ rects, elements }) {
          if (matchWidthRef.current) {
            Object.assign(elements.floating.style, {
              minWidth: `${rects.reference.width}px`,
              width: `${rects.reference.width}px`,
            });
          }
          if (setWidthRef.current != null) {
            Object.assign(elements.floating.style, { width: `${setWidthRef.current(rects.reference)}px` });
          }
          if (setHeightRef.current != null) {
            Object.assign(elements.floating.style, { maxHeight: `${setHeightRef.current(rects.reference)}px` });
          }
        },
      })),
      offsetMiddleware(offset),
      flip(getBoundary),
      shift(getBoundary),
    ],
    whileElementsMounted: autoUpdate,
    placement,
    strategy: 'fixed',
  });
  const dismiss = useDismiss(context, { bubbles: { escapeKey: false } });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return { isOpen, setIsOpen, refs, floatingStyles, context, getReferenceProps, getFloatingProps };
};
