import { Component, createContext, createRef, Fragment, type ReactNode } from 'react';
import type { Theme } from '@discord-components/tokens';
import { HeadingLevel } from '../HeadingLevel';
import {
  appLayerContext,
  isElementWithinReferencePositionLayer,
  Layer,
  ReferencePositionLayer,
  type AvoidancePadding,
  type LayerContext,
  type ReferenceAlign,
  type ReferencePosition,
  type ReferencePositionLayerRenderState,
} from '../Layer';
import { ThemeContextProvider } from '../Theme';
import { modalStack } from './modalStack';
import { PopoutLoading } from './PopoutLoading';
import { ComponentActions, WindowContext, type WindowContextValue } from './windowDispatch';

// Returning this from onRequestClose keeps an uncontrolled popout open.
export const POPOUT_PREVENT_CLOSE = Symbol('POPOUT_PREVENT_CLOSE');

// Forces a theme on popouts rendered below it (they otherwise inherit the app's).
export const PopoutThemeContext = createContext<Theme | null>(null);

PopoutThemeContext.displayName = 'PopoutThemeContext';

export type PopoutCloseReason =
  'user:explicit' | 'user:escape' | 'system:click_outside' | 'system:scroll' | 'system:viewport_exit';

export type PopoutScrollBehavior = 'close' | 'sticky' | 'none';

export interface PopoutTriggerProps {
  onMouseDown: () => void;
  onMouseEnter?: () => void;
  onKeyDown: (event: { key: string }) => void;
  onClick: (event?: { shiftKey?: boolean; nativeEvent?: Event }) => void;
  'aria-controls': string | undefined;
  'aria-expanded': boolean;
}

export interface PopoutTriggerState {
  isShown: boolean;
  position: ReferencePosition | null;
}

export interface PopoutRenderProps extends ReferencePositionLayerRenderState {
  updatePosition: () => void;
  closePopout: (event?: Event, reason?: PopoutCloseReason) => void;
  setPopoutRef: (element: HTMLElement | null) => void;
}

export interface BasePopoutProps {
  children: (props: PopoutTriggerProps, state: PopoutTriggerState) => ReactNode;
  renderPopout: (props: PopoutRenderProps) => ReactNode;
  targetElementRef?: { current: Element | null };
  // Controls visibility; when left out the popout toggles itself on click.
  shouldShow?: boolean;
  onRequestOpen?: () => void;
  onRequestClose?: (event: Event | undefined, reason: PopoutCloseReason | undefined) => unknown;
  onShiftClick?: (event: { shiftKey?: boolean }) => void;
  position: ReferencePosition;
  align: ReferenceAlign;
  nudgeAlignIntoViewport?: boolean;
  avoidancePadding?: AvoidancePadding;
  useRawTargetDimensions?: boolean;
  spacing?: number;
  offset?: number;
  autoInvert?: boolean;
  fixed?: boolean;
  trackTargetPosition?: boolean;
  positionKey?: string;
  popoutKey?: string;
  disablePointerEvents?: boolean;
  layerContext?: LayerContext;
  clickTrap?: boolean;
  // Runs on mouse down before opening; a loading state shows if it takes longer than 250ms.
  preload?: () => Promise<unknown>;
  loadingComponent?: ReactNode;
  // Ignore outside clicks (and Escape) while a modal opened after the popout is on top.
  ignoreModalClicks?: boolean;
  closeOnClickOutside?: boolean;
  scrollBehavior?: PopoutScrollBehavior;
  useMouseEnter?: boolean;
}

interface BasePopoutState {
  renderedPosition: ReferencePosition | null;
  shouldShowPopout: boolean;
  shouldShowLoadingState: boolean;
  isLoading: boolean;
  isModalStackedOnTop: boolean;
}

const PRELOAD_KEYS = new Set(['Spacebar', ' ', 'Enter']);

let popoutCount = 0;

const isElement = (value: unknown): value is Element => {
  const view = (value as Element | null | undefined)?.ownerDocument?.defaultView;
  return view != null && value instanceof view.Element;
};

const throttle = <A extends unknown[]>(fn: (...args: A) => void, wait: number) => {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;
  return (...args: A) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    pendingArgs = args;
    if (remaining <= 0 || remaining > wait) {
      if (timer != null) clearTimeout(timer);
      timer = null;
      last = now;
      fn(...args);
    } else if (timer == null) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (pendingArgs != null) fn(...pendingArgs);
      }, remaining);
    }
  };
};

// The click-to-open popout behind Popout and Popover: renders the trigger through `children`, and
// while shown, the popout in a ReferencePositionLayer on the app layer. It closes on outside
// clicks, Escape (POPOUT_CLOSE), and depending on `scrollBehavior`, scrolling.
export class BasePopout extends Component<BasePopoutProps, BasePopoutState> {
  static displayName = 'BasePopout';

  static override contextType = WindowContext;
  declare context: WindowContextValue;

  static defaultProps = {
    autoInvert: false,
    nudgeAlignIntoViewport: false,
    spacing: 0,
    loadingComponent: <PopoutLoading />,
    closeOnClickOutside: true,
  };

  domElementRef = createRef<Element>() as { current: Element | null };
  layerRef = createRef<ReferencePositionLayer>();
  popoutRef = createRef<HTMLElement>() as { current: HTMLElement | null };
  popoutId = `popout_${++popoutCount}`;
  loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  isValidClickStart = false;
  modalsAtOpen = new Set<string>();
  unsubscribeModalChanges: (() => void) | null = null;

  override state: BasePopoutState = {
    renderedPosition: this.props.position,
    shouldShowPopout: false,
    shouldShowLoadingState: false,
    isLoading: false,
    isModalStackedOnTop: false,
  };

  shouldShowPopout(props: BasePopoutProps, state: BasePopoutState) {
    return props.shouldShow != null ? props.shouldShow : state.shouldShowPopout;
  }

  override componentDidMount() {
    if (this.shouldShowPopout(this.props, this.state)) this.setupShowPopout();
  }

  override componentDidUpdate(prevProps: BasePopoutProps, prevState: BasePopoutState) {
    const isShown = this.shouldShowPopout(this.props, this.state);
    const wasShown = this.shouldShowPopout(prevProps, prevState);
    if (
      wasShown !== isShown ||
      prevState.isLoading !== this.state.isLoading ||
      prevProps.ignoreModalClicks !== this.props.ignoreModalClicks
    ) {
      if (isShown) this.setupShowPopout(!wasShown);
      else this.unsubscribe();
    }
    if (this.props.scrollBehavior !== prevProps.scrollBehavior) {
      const element = this.getDomElement();
      if (element == null) return;
      element.ownerDocument?.removeEventListener('scroll', this.handleScroll, true);
      element.ownerDocument?.removeEventListener('scroll', this.handleStickyScroll, true);
      if (this.props.scrollBehavior === 'close') {
        element.ownerDocument?.addEventListener('scroll', this.handleScroll, true);
      } else if (this.props.scrollBehavior === 'sticky') {
        element.ownerDocument?.addEventListener('scroll', this.handleStickyScroll, true);
      }
    }
  }

  getDomElement() {
    const element = this.props.targetElementRef?.current;
    if (!isElement(element)) {
      console.error(Error('Popout cannot find DOM node'));
      return null;
    }
    return element;
  }

  get closeAction() {
    return this.props.ignoreModalClicks && modalStack.hasModalOpenedSince(this.modalsAtOpen)
      ? ComponentActions.POPOUT_CLOSE_AFTER_MODALS
      : ComponentActions.POPOUT_CLOSE;
  }

  setupShowPopout(isOpening = true) {
    const element = this.getDomElement();
    if (element == null) return;
    const ownerDocument = element.ownerDocument;
    ownerDocument?.addEventListener('mousedown', this.handleDocumentMouseDown, true);
    ownerDocument?.addEventListener('mouseup', this.handleDocumentMouseUp, true);
    ownerDocument?.addEventListener('click', this.handleDocumentClick, true);
    if (this.props.scrollBehavior === 'close') ownerDocument?.addEventListener('scroll', this.handleScroll, true);
    else if (this.props.scrollBehavior === 'sticky') {
      ownerDocument?.addEventListener('scroll', this.handleStickyScroll, true);
    }
    this.domElementRef.current = element;
    this.isValidClickStart = false;
    if (isOpening) this.modalsAtOpen = modalStack.getOpenModalKeys();
    this.subscribeEscapeClose();
    this.subscribeToModalStack();
    this.forceUpdate();
  }

  subscribeEscapeClose() {
    const { windowDispatch } = this.context;
    windowDispatch.unsubscribe(ComponentActions.POPOUT_CLOSE, this.handleEscapeClose);
    windowDispatch.unsubscribe(ComponentActions.POPOUT_CLOSE_AFTER_MODALS, this.handleEscapeClose);
    windowDispatch.subscribe(this.closeAction, this.handleEscapeClose);
  }

  subscribeToModalStack() {
    if (this.props.clickTrap === true || this.props.ignoreModalClicks) {
      this.updateModalStackedOnTop();
      if (this.unsubscribeModalChanges == null) {
        this.unsubscribeModalChanges = modalStack.subscribe(this.updateModalStackedOnTop);
      }
    }
  }

  updateModalStackedOnTop = () => {
    this.subscribeEscapeClose();
    const isModalStackedOnTop = modalStack.hasModalOpenedSince(this.modalsAtOpen);
    if (this.state.isModalStackedOnTop !== isModalStackedOnTop) this.setState({ isModalStackedOnTop });
  };

  unsubscribe() {
    const element = this.domElementRef.current;
    if (element != null) {
      const ownerDocument = element.ownerDocument;
      ownerDocument?.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
      ownerDocument?.removeEventListener('mouseup', this.handleDocumentMouseUp, true);
      ownerDocument?.removeEventListener('click', this.handleDocumentClick, true);
      ownerDocument?.removeEventListener('scroll', this.handleScroll, true);
      ownerDocument?.removeEventListener('scroll', this.handleStickyScroll, true);
    }
    const { windowDispatch } = this.context;
    windowDispatch.unsubscribe(ComponentActions.POPOUT_CLOSE, this.handleEscapeClose);
    windowDispatch.unsubscribe(ComponentActions.POPOUT_CLOSE_AFTER_MODALS, this.handleEscapeClose);
    this.unsubscribeModalChanges?.();
    this.unsubscribeModalChanges = null;
  }

  override componentWillUnmount() {
    this.unsubscribe();
    this.domElementRef.current = null;
    if (this.loadingTimeout != null) clearTimeout(this.loadingTimeout);
  }

  override render() {
    const { children, useMouseEnter } = this.props;
    const isShown = this.shouldShowPopout(this.props, this.state);
    return (
      <Fragment>
        {children(
          {
            onMouseDown: this.handlePreload,
            ...(useMouseEnter ? { onMouseEnter: this.handleMouseEnter } : {}),
            onKeyDown: this.handleKeyboardPreload,
            onClick: this.handleClick,
            'aria-controls': isShown ? this.popoutId : undefined,
            'aria-expanded': isShown,
          },
          { isShown, position: this.state.renderedPosition },
        )}
        <HeadingLevel forceLevel={2}>{this.renderLayer()}</HeadingLevel>
      </Fragment>
    );
  }

  renderLayer() {
    if (!this.shouldShowPopout(this.props, this.state) || this.domElementRef.current == null) return null;
    const {
      position,
      align,
      nudgeAlignIntoViewport,
      avoidancePadding,
      useRawTargetDimensions,
      spacing,
      offset,
      autoInvert,
      fixed,
      trackTargetPosition,
      positionKey,
      disablePointerEvents,
      layerContext,
      clickTrap = false,
    } = this.props;
    const { isLoading, shouldShowLoadingState } = this.state;
    if (isLoading && !shouldShowLoadingState) return null;
    return (
      <Layer layerContext={layerContext ?? appLayerContext}>
        <PopoutThemeContext.Consumer>
          {(theme) => (
            <ThemeContextProvider theme={theme ?? undefined}>
              <ReferencePositionLayer
                ref={this.layerRef}
                onMount={this.handlePopoutShow}
                onUnmount={this.handlePopoutHide}
                id={this.popoutId}
                targetRef={this.domElementRef}
                position={position}
                align={align}
                nudgeAlignIntoViewport={nudgeAlignIntoViewport}
                avoidancePadding={avoidancePadding}
                useRawTargetDimensions={useRawTargetDimensions}
                spacing={spacing}
                offset={offset}
                autoInvert={autoInvert}
                fixed={fixed}
                trackTargetPosition={trackTargetPosition}
                positionKey={positionKey}
                disablePointerEvents={disablePointerEvents}
                onPositionChange={this.handlePopoutPositionChange}
                clickTrap={clickTrap && !this.state.isModalStackedOnTop}
              >
                {this.renderPopout}
              </ReferencePositionLayer>
            </ThemeContextProvider>
          )}
        </PopoutThemeContext.Consumer>
      </Layer>
    );
  }

  handlePopoutShow = () => {
    this.context.windowDispatch.dispatch(ComponentActions.POPOUT_SHOW, this.props.popoutKey);
  };

  handlePopoutHide = () => {
    this.context.windowDispatch.dispatch(ComponentActions.POPOUT_HIDE, this.props.popoutKey);
  };

  handleSetPopoutRef = (element: HTMLElement | null) => {
    if (element != null) this.popoutRef.current = element;
  };

  renderPopout = (state: ReferencePositionLayerRenderState, updatePosition: () => void) => {
    if (this.state.isLoading) return this.props.loadingComponent;
    return this.props.renderPopout({
      ...state,
      updatePosition,
      closePopout: this.close,
      setPopoutRef: this.handleSetPopoutRef,
    });
  };

  toggleShow(shouldShowPopout: boolean) {
    if (this.state.shouldShowPopout !== shouldShowPopout) this.setState({ shouldShowPopout });
  }

  close = (event?: Event, reason?: PopoutCloseReason) => {
    const { onRequestClose, shouldShow } = this.props;
    if (onRequestClose?.(event, reason) !== POPOUT_PREVENT_CLOSE && shouldShow == null) this.toggleShow(false);
  };

  handleClick = (event?: { shiftKey?: boolean; nativeEvent?: Event }) => {
    const { onShiftClick, shouldShow, onRequestOpen, onRequestClose } = this.props;
    if (event?.shiftKey && onShiftClick != null) {
      onShiftClick(event);
      return;
    }
    const isControlled = shouldShow != null;
    if (isControlled ? shouldShow : this.state.shouldShowPopout) onRequestClose?.(event?.nativeEvent, 'user:explicit');
    else onRequestOpen?.();
    if (!isControlled) this.setState(({ shouldShowPopout }) => ({ shouldShowPopout: !shouldShowPopout }));
  };

  handleMouseEnter = () => {
    this.props.onRequestOpen?.();
    this.setState({ shouldShowPopout: true });
  };

  handlePreload = async () => {
    const { preload } = this.props;
    if (preload == null) return;
    this.setState({ isLoading: true });
    if (this.loadingTimeout != null) clearTimeout(this.loadingTimeout);
    this.loadingTimeout = setTimeout(() => {
      this.loadingTimeout = null;
      this.setState({ shouldShowLoadingState: true });
    }, 250);
    try {
      await preload();
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleKeyboardPreload = (event: { key: string }) => {
    if (PRELOAD_KEYS.has(event.key)) void this.handlePreload();
  };

  isDismissingEventOutside(event: Event) {
    const { ignoreModalClicks, closeOnClickOutside } = this.props;
    if (closeOnClickOutside === false) return false;
    const element = this.domElementRef.current;
    return !(
      element == null ||
      (event.target instanceof Element && isElementWithinReferencePositionLayer(element, event.target)) ||
      (ignoreModalClicks && modalStack.hasModalOpenedSince(this.modalsAtOpen))
    );
  }

  handleDocumentMouseDown = (event: MouseEvent) => {
    if (this.isDismissingEventOutside(event)) this.isValidClickStart = true;
  };

  handleDocumentMouseUp = (event: MouseEvent) => {
    if (this.isValidClickStart) {
      this.isValidClickStart = false;
      this.close(event, 'system:click_outside');
    }
  };

  // Keyboard-triggered clicks (detail 0) have no mouse down/up pair.
  handleDocumentClick = (event: MouseEvent) => {
    if (event.detail === 0 && this.isDismissingEventOutside(event)) this.close(event, 'system:click_outside');
  };

  handlePopoutPositionChange = (renderedPosition: ReferencePosition | null) => {
    this.setState({ renderedPosition });
  };

  handleScroll = (event: Event) => {
    const target = event.target as Node | null;
    if (target?.contains(this.domElementRef.current)) this.close(undefined, 'system:scroll');
  };

  handleEscapeClose = (event?: unknown) => {
    this.close(event as Event | undefined, 'user:escape');
  };

  handleStickyScroll = throttle(() => {
    requestAnimationFrame(() => {
      const popout = this.popoutRef.current;
      if (popout == null || !this.shouldShowPopout(this.props, this.state)) return;
      const rect = popout.getBoundingClientRect();
      const view = popout.ownerDocument?.defaultView;
      const height = view?.innerHeight ?? 0;
      const width = view?.innerWidth ?? 0;
      if (!(rect.top < height && rect.bottom > 0 && rect.left < width && rect.right > 0)) {
        this.close(undefined, 'system:viewport_exit');
      }
      this.layerRef.current?.updatePosition();
    });
  }, 1000 / 60);
}
