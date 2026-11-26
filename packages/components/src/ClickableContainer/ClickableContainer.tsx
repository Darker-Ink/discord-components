import {
  useRef,
  type CSSProperties,
  type ElementType,
  type FocusEventHandler,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import type { FocusRingProps } from 'react-focus-rings';
import { Clickable } from '../Clickable';
import styles from './ClickableContainer.module.css';

export interface ClickableContainerProps {
  tag?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  focusProps?: Partial<FocusRingProps>;
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onDoubleClick?: MouseEventHandler<HTMLElement>;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  onMouseOver?: MouseEventHandler<HTMLElement>;
  onMouseDown?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  // Extra props for the focusable element (role, aria-*, id, children…).
  buttonProps?: HTMLAttributes<HTMLElement> & Record<`data-${string}`, unknown>;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'data-list-item-id'?: string;
  ref?: RefObject<HTMLElement | null>;
  buttonRef?: Ref<HTMLElement>;
}

/**
 * A container whose content can include other interactive elements: an empty, focusable element inside it
 * takes keyboard focus and clicks, and draws its focus ring around the whole container.
 */
export const ClickableContainer = ({
  tag: Tag = 'div',
  children,
  className,
  style,
  focusProps,
  onClick,
  onMouseEnter,
  onDoubleClick,
  onContextMenu,
  onKeyDown,
  onFocus,
  onBlur,
  onMouseOver,
  onMouseDown,
  onMouseLeave,
  buttonProps,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'data-list-item-id': listItemId,
  ref,
  buttonRef,
}: ClickableContainerProps) => {
  const ownRef = useRef<HTMLElement>(null);
  const containerRef = ref ?? ownRef;
  return (
    <Tag
      ref={containerRef}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <Clickable
        {...buttonProps}
        innerRef={buttonRef}
        focusProps={{ ringTarget: containerRef, ...focusProps }}
        className={styles.focusTarget}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        data-list-item-id={listItemId ?? buttonProps?.['data-list-item-id']}
        onClick={(event: MouseEvent<HTMLElement>) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseDown={onMouseDown}
      />
      {children}
    </Tag>
  );
};

ClickableContainer.displayName = 'ClickableContainer';
