// The trigger element lives in refs that are filled in by ref callbacks and event handlers and read
// while rendering to decide visibility, the way Discord's tooltips work; the compiler-oriented rules
// can't follow that.
/* eslint-disable react-hooks/refs, react-hooks/immutability, react-hooks/preserve-manual-memoization */
import {
  cloneElement,
  createElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import {
  assignRef,
  chainHandlers,
  mergeIds,
  renderTooltipContainer,
  type TooltipTriggerHandlers,
} from './tooltipUtils';

export interface TooltipVisibilityOptions {
  shouldShow?: boolean;
  // Milliseconds to wait after hover/focus before showing.
  delay?: number;
  onTooltipShow?: () => void;
  onTooltipHide?: () => void;
  forceOpen?: boolean;
  // Only show when the trigger's content is truncated.
  overflowOnly?: boolean;
  hideOnClick?: boolean;
}

export interface UseTooltipOptions extends TooltipVisibilityOptions {
  children?: ReactNode;
  targetElementRef?: Ref<HTMLElement>;
  // Wrap `children` in a `containerTag` element that receives the trigger handlers, instead of
  // cloning them onto the child.
  asContainer?: boolean;
  containerTag?: string;
  ariaHidden?: boolean;
}

const useTooltipVisibility = ({
  targetElementRef,
  shouldShow = true,
  delay,
  onTooltipShow,
  onTooltipHide,
  forceOpen = false,
  overflowOnly = false,
  hideOnClick = true,
}: TooltipVisibilityOptions & { targetElementRef?: RefObject<HTMLElement | null> }) => {
  const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
  const ownRef = useRef<HTMLElement | null>(null);
  const targetRef = targetElementRef ?? ownRef;
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Escape hides the tooltip until the pointer or focus comes back.
  const dismissedRef = useRef(false);

  const stopTimeout = () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  useEffect(() => stopTimeout, []);

  const hasTarget = targetRef.current != null;
  const isVisible = shouldShow !== false && (isHovered || forceOpen) && hasTarget && !dismissedRef.current;

  const show = useCallback(() => {
    if (dismissedRef.current || (overflowOnly && targetRef.current == null)) return;
    if (overflowOnly && targetRef.current != null) {
      const element = targetRef.current;
      const view = element.ownerDocument?.defaultView;
      if (view != null && element instanceof view.HTMLElement && element.offsetWidth >= element.scrollWidth) return;
    }
    // Only starts if no timer is pending.
    if (timeoutRef.current != null) return;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsHovered(true);
      onTooltipShow?.();
    }, delay ?? 0);
  }, [delay, onTooltipShow, overflowOnly, targetRef]);

  const hide = useCallback(() => {
    stopTimeout();
    setIsHovered(false);
    onTooltipHide?.();
  }, [onTooltipHide]);

  const handleClick = useCallback(() => {
    if (hideOnClick) hide();
  }, [hide, hideOnClick]);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (targetRef.current == null) targetRef.current = event.currentTarget;
      dismissedRef.current = false;
      show();
    },
    [show, targetRef],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (!keyboardModeEnabled) return;
      if (targetRef.current == null) targetRef.current = event.currentTarget;
      dismissedRef.current = false;
      show();
    },
    [keyboardModeEnabled, show, targetRef],
  );

  const handleMouseLeave = useCallback(() => {
    stopTimeout();
    hide();
  }, [hide]);

  const triggerProps = useMemo<TooltipTriggerHandlers>(
    () => ({
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: hide,
      onContextMenu: hide,
      onClick: handleClick,
    }),
    [handleMouseEnter, handleMouseLeave, handleFocus, hide, handleClick],
  );

  useEffect(() => {
    if (!isVisible) return;
    const ownerDocument = targetRef.current?.ownerDocument ?? document;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        dismissedRef.current = true;
        hide();
      }
    };
    ownerDocument.addEventListener('keydown', onKeyDown);
    return () => {
      ownerDocument.removeEventListener('keydown', onKeyDown);
    };
  }, [isVisible, hide, targetRef]);

  useEffect(() => {
    if (!isVisible) return;
    const ownerDocument = targetRef.current?.ownerDocument ?? document;
    const onClick = () => {
      hide();
    };
    ownerDocument.addEventListener('click', onClick);
    return () => {
      ownerDocument.removeEventListener('click', onClick);
    };
  }, [isVisible, hide, targetRef]);

  return { isVisible, triggerProps };
};

const EMPTY_SPAN = createElement('span');

type TriggerElementProps = {
  ref?: Ref<HTMLElement>;
  buttonRef?: Ref<HTMLElement>;
  innerRef?: Ref<HTMLElement>;
  'aria-describedby'?: string;
} & Partial<Record<keyof TooltipTriggerHandlers, ((...args: never[]) => void) | undefined>>;

// Adds the tooltip's handlers and aria-describedby to the trigger, merging with its own, and
// attaches the ref to whichever ref prop the component takes (buttonRef, innerRef or ref).
const useTriggerElement = (
  children: ReactNode,
  setTriggerRef: (element: HTMLElement | null) => void,
  triggerProps: TooltipTriggerHandlers,
  describedById: string | undefined,
) => {
  const element = (isValidElement(children) ? children : EMPTY_SPAN) as ReactElement<TriggerElementProps>;
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (node == null) setTriggerRef(null);
      else if (typeof node.getBoundingClientRect === 'function') setTriggerRef(node);
    },
    [setTriggerRef],
  );
  const childRef = element.props.ref;
  const childRefRef = useRef(childRef);
  childRefRef.current = childRef;
  const ref = useCallback(
    (node: HTMLElement | null) => {
      assignRef(childRefRef.current, node);
      setRef(node);
    },
    [setRef],
  );
  const { buttonRef, innerRef } = element.props;
  const mergedButtonRef = useCallback(
    (node: HTMLElement | null) => {
      assignRef(buttonRef, node);
      ref(node);
    },
    [buttonRef, ref],
  );
  const mergedInnerRef = useCallback(
    (node: HTMLElement | null) => {
      assignRef(innerRef, node);
      ref(node);
    },
    [innerRef, ref],
  );
  const { props } = element;
  const handlers: Record<string, unknown> = {
    onMouseEnter: chainHandlers(props.onMouseEnter, triggerProps.onMouseEnter),
    onMouseLeave: chainHandlers(props.onMouseLeave, triggerProps.onMouseLeave),
    onFocus: chainHandlers(props.onFocus, triggerProps.onFocus),
    onBlur: chainHandlers(props.onBlur, triggerProps.onBlur),
    onContextMenu: chainHandlers(props.onContextMenu, triggerProps.onContextMenu),
    onClick: chainHandlers(props.onClick, triggerProps.onClick),
  };
  if (describedById != null && describedById !== '') {
    handlers['aria-describedby'] = mergeIds(props['aria-describedby'], describedById);
  }
  if (typeof element.type === 'string') handlers.ref = ref;
  else if ('buttonRef' in props) {
    handlers.buttonRef = mergedButtonRef;
    handlers.ref = ref;
  } else if ('innerRef' in props) {
    handlers.innerRef = mergedInnerRef;
    handlers.ref = ref;
  } else {
    handlers.ref = ref;
    const type = element.type as { prototype?: { isReactComponent?: unknown } };
    if (typeof element.type === 'function' && type.prototype?.isReactComponent != null) handlers.innerRef = ref;
  }
  return cloneElement(element, handlers);
};

// Hover/focus visibility for a tooltip plus the trigger to render: `children` with the handlers
// cloned in, or (with `asContainer`) a wrapper element carrying them.
export const useTooltip = ({
  children,
  targetElementRef,
  asContainer = false,
  containerTag = 'span',
  ariaHidden = false,
  ...options
}: UseTooltipOptions) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const triggerRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      if (targetElementRef != null) assignRef(targetElementRef, element);
    },
    [targetElementRef],
  );
  const tooltipId = useId();
  const { isVisible, triggerProps } = useTooltipVisibility({ targetElementRef: elementRef, ...options });
  const describedById = ariaHidden ? undefined : tooltipId;
  const clonedTrigger = useTriggerElement(children, triggerRef, triggerProps, describedById);
  let containerTrigger: ReactNode = null;
  if (asContainer) {
    // The container can't hold aria-describedby for its focusable descendants, so it is added to
    // whichever element inside takes focus.
    const handlers: TooltipTriggerHandlers = ariaHidden
      ? triggerProps
      : {
          ...triggerProps,
          onFocus: chainHandlers(triggerProps.onFocus, (event: FocusEvent<HTMLElement>) => {
            const target = event.target;
            if (target != null)
              target.setAttribute(
                'aria-describedby',
                mergeIds(target.getAttribute('aria-describedby') ?? undefined, tooltipId),
              );
          }) as TooltipTriggerHandlers['onFocus'],
          onBlur: chainHandlers(triggerProps.onBlur, (event?: FocusEvent<HTMLElement>) => {
            const target = event?.target;
            if (target == null) return;
            const ids = target.getAttribute('aria-describedby');
            if (ids == null) return;
            const remaining = ids.split(' ').filter((id) => id !== tooltipId);
            if (remaining.length > 0) target.setAttribute('aria-describedby', remaining.join(' '));
            else target.removeAttribute('aria-describedby');
          }) as TooltipTriggerHandlers['onBlur'],
        };
    containerTrigger = renderTooltipContainer({
      tag: containerTag,
      children,
      triggerHandlers: handlers,
      triggerRef,
    });
  }
  return {
    tooltipId,
    isVisible,
    targetElementRef: elementRef,
    trigger: containerTrigger ?? clonedTrigger,
    describedById,
  };
};
