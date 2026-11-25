import { createElement, type FocusEvent, type MouseEvent, type ReactNode, type Ref } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipTriggerHandlers {
  onMouseEnter: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event?: FocusEvent<HTMLElement>) => void;
  onContextMenu: () => void;
  onClick: () => void;
}

export const renderTooltipContainer = ({
  tag,
  className,
  tabIndex,
  children,
  triggerHandlers,
  describedById,
  triggerRef,
}: {
  tag: string;
  className?: string;
  tabIndex?: number;
  children?: ReactNode;
  triggerHandlers: TooltipTriggerHandlers;
  describedById?: string;
  triggerRef?: Ref<HTMLElement>;
}) =>
  createElement(
    tag,
    {
      ref: triggerRef,
      className,
      tabIndex,
      onMouseEnter: triggerHandlers.onMouseEnter,
      onMouseLeave: triggerHandlers.onMouseLeave,
      onFocus: triggerHandlers.onFocus,
      onBlur: triggerHandlers.onBlur,
      onContextMenu: triggerHandlers.onContextMenu,
      onClick: triggerHandlers.onClick,
      ...(describedById != null && describedById !== '' ? { 'aria-describedby': describedById } : {}),
    },
    children,
  );

// A stable string for keying the layer's position on its content.
export const stringifyTooltipContent = (content: unknown) => {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
};

export const assignRef = <T>(ref: Ref<T> | undefined | null, value: T | null) => {
  if (ref == null) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (typeof ref === 'object' && 'current' in ref) (ref as { current: T | null }).current = value;
};

export const chainHandlers = <A extends unknown[]>(
  first: ((...args: A) => void) | undefined,
  second: ((...args: A) => void) | undefined,
) => {
  if (first == null && second == null) return undefined;
  return (...args: A) => {
    if (typeof first === 'function') first(...args);
    if (typeof second === 'function') second(...args);
  };
};

// Adds the ids in `addition` that aren't already in the space-separated `ids`.
export const mergeIds = (ids: string | undefined, addition: string | undefined) => {
  const base = (ids ?? '').trim();
  const extra = (addition ?? '').trim();
  if (base === '') return extra;
  if (extra === '') return base;
  const padded = ` ${base} `;
  const missing = extra
    .split(/\s+/)
    .filter(Boolean)
    .filter((id) => !padded.includes(` ${id} `));
  return missing.length === 0 ? base : `${base} ${missing.join(' ')}`.trim();
};

// The side the caret sits on: opposite the side the tooltip is on.
export const getCaretPosition = (position: string | undefined): TooltipPosition => {
  switch (position) {
    case 'top':
    default:
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
};
