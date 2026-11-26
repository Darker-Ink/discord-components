import {
  useCallback,
  useContext,
  useRef,
  type ElementType,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEventHandler,
  type Ref,
} from 'react';
import { FocusRing, type FocusRingProps } from 'react-focus-rings';
import { BlockInteractionsContext } from './BlockInteractionsContext';

export interface ClickableProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  tag?: ElementType;
  onClick?: MouseEventHandler<HTMLElement>;
  href?: string;
  // Don't turn Enter/Space into clicks.
  ignoreKeyPress?: boolean;
  focusProps?: FocusRingProps;
  innerRef?: Ref<HTMLElement>;
  ref?: Ref<HTMLElement>;
  rel?: string;
  target?: string;
}

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (ref == null) return;
  if (typeof ref === 'function') ref(value);
  else if (Object.prototype.hasOwnProperty.call(ref, 'current')) ref.current = value;
};

// A non-button element that behaves like a button: focusable, a focus ring, and Enter/Space
// dispatch a click (with the same modifier keys) when it has an onClick.
export const Clickable = ({
  tag: Tag = 'div',
  focusProps,
  innerRef,
  ref,
  onClick,
  ignoreKeyPress,
  className,
  children,
  ...rest
}: ClickableProps) => {
  // Defaults are filled in like class defaultProps, keeping the attribute order Discord renders.
  const props = {
    ...rest,
    role: rest.role === undefined ? 'button' : rest.role,
    tabIndex: rest.tabIndex === undefined ? 0 : rest.tabIndex,
  };
  const blockInteractions = useContext(BlockInteractionsContext);
  const elementRef = useRef<HTMLElement | null>(null);
  const { href, onKeyPress } = props;

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      assignRef(innerRef, element);
      assignRef(ref, element);
    },
    [innerRef, ref],
  );

  const handleKeyPress = (event: KeyboardEvent<HTMLElement>) => {
    if (event.repeat) return;
    const element = elementRef.current;
    if (!ignoreKeyPress && onClick != null && element != null && (event.key === ' ' || event.key === 'Enter')) {
      if (href == null) event.preventDefault();
      element.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          view: element.ownerDocument?.defaultView ?? window,
        }),
      );
    }
    onKeyPress?.(event);
  };

  if (blockInteractions) {
    const { role: _role, tabIndex: _tabIndex, ...inertProps } = props;
    return (
      <Tag ref={setRef} className={className} {...inertProps}>
        {children}
      </Tag>
    );
  }

  const inner =
    onClick == null ? (
      <Tag ref={setRef} className={className} {...props}>
        {children}
      </Tag>
    ) : (
      <Tag onClick={onClick} ref={setRef} onKeyPress={handleKeyPress} className={className} {...props}>
        {children}
      </Tag>
    );

  return <FocusRing {...focusProps}>{inner}</FocusRing>;
};

Clickable.displayName = 'Clickable';
