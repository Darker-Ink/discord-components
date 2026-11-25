import { Component, createRef, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { autoUpdate } from '@floating-ui/react';
import clsx from 'clsx';
import { FocusRingScope } from '../FocusRing';
import { ThemeContext, ThemeProvider } from '../Theme';
import { FLOATING_LAYER_ATTRIBUTE } from '../FloatingLayer/constants';
import styles from './Layer.module.css';

export type ReferencePosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'window_center';
export type ReferenceAlign = 'top' | 'bottom' | 'left' | 'right' | 'center';
type InternalPosition = ReferencePosition | 'overlap_vertical' | 'overlap_horizontal';

export interface AvoidancePadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface ReferenceRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface ReferencePositionLayerRenderState {
  position: ReferencePosition | null;
  nudge: number;
  isPositioned: boolean;
}

export interface ReferencePositionLayerProps {
  id?: string;
  className?: string;
  targetRef: { current: Element | null };
  overrideTargetRect?: ReferenceRect | DOMRect;
  position: ReferencePosition;
  align: ReferenceAlign;
  spacing?: number;
  offset?: number;
  // Keep the layer 12px inside the container along the alignment axis.
  nudgeAlignIntoViewport?: boolean;
  avoidancePadding?: AvoidancePadding;
  // Flip to the opposite side when there isn't enough room.
  autoInvert?: boolean;
  useRawTargetDimensions?: boolean;
  fixed?: boolean;
  trackTargetPosition?: boolean;
  positionKey?: string;
  disablePointerEvents?: boolean;
  clickTrap?: boolean;
  onMount?: () => void;
  onUnmount?: () => void;
  onPositionChange?: (position: ReferencePosition | null) => void;
  children: (state: ReferencePositionLayerRenderState, updatePosition: () => void) => ReactNode;
}

type PositionStyle = Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>;

interface PositionState {
  position: ReferencePosition | null;
  style: PositionStyle;
  nudge: number;
}

interface ReferencePositionLayerState extends PositionState {
  isPositioned: boolean;
}

const LAYER_SELECTOR_CLASS = styles.layer;

// Each positioned layer remembers the element it is attached to, so clicks inside nested layers
// (a popout opened from a popout) count as inside their ancestors.
const layerTargets = new WeakMap<Element, Element>();

const findParent = (element: Element, predicate: (element: Element) => boolean) => {
  let parent = element.parentElement;
  while (parent != null) {
    if (predicate(parent)) return parent;
    parent = parent.parentElement;
  }
  return null;
};

const getParentLayer = (element: Element) =>
  findParent(element, (parent) => parent.classList.contains(LAYER_SELECTOR_CLASS)) ??
  findParent(element, (parent) => parent.getAttribute(FLOATING_LAYER_ATTRIBUTE) != null);

export const getParentLayerContainer = (element: Element) => {
  const container =
    findParent(element, (parent) => parent.classList.contains(styles.layerContainer)) ??
    findParent(element, (parent) => parent.getAttribute(FLOATING_LAYER_ATTRIBUTE) != null);
  if (container == null) throw Error('Unexpected missing parent container');
  return container as HTMLElement;
};

export const isElementWithinReferencePositionLayer = (container: Element, element: Element) => {
  if (container.contains(element)) return true;
  let layer = getParentLayer(element);
  while (layer != null) {
    const target = layerTargets.get(layer);
    if (target == null) break;
    if (container.contains(target)) return true;
    layer = getParentLayer(target);
  }
  return false;
};

const invariant: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw Error(`Invariant Violation: ${message}`);
};

const getPositionKey = ({ positionKey, position, align }: ReferencePositionLayerProps) =>
  positionKey != null ? positionKey : `${position}:${align}`;

// How much room is left between the layer and the container edge it grows towards.
const getRemainingSpace = (
  position: InternalPosition,
  style: PositionStyle,
  element: HTMLElement,
  container: HTMLElement,
  avoidancePadding?: AvoidancePadding,
) => {
  switch (position) {
    case 'top':
      invariant(style.bottom != null, 'Missing bottom');
      return container.offsetHeight - (style.bottom + element.offsetHeight) - (avoidancePadding?.top ?? 0);
    case 'bottom':
      invariant(style.top != null, 'Missing top');
      return container.offsetHeight - (style.top + element.offsetHeight) - (avoidancePadding?.bottom ?? 0);
    case 'left':
      invariant(style.right != null, 'Missing right');
      return container.offsetWidth - (style.right + element.offsetWidth) - (avoidancePadding?.left ?? 0);
    case 'right':
      invariant(style.left != null, 'Missing left');
      return container.offsetWidth - (style.left + element.offsetWidth) - (avoidancePadding?.right ?? 0);
    case 'center':
    case 'window_center':
      invariant(style.left != null, 'Missing left');
      return container.offsetWidth - (style.left + element.offsetWidth / 2);
    default:
      throw Error(`Unexpected position: ${position}`);
  }
};

const getOppositePosition = (position: ReferencePosition): ReferencePosition => {
  switch (position) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'center':
      return 'center';
    case 'window_center':
      return 'window_center';
    default:
      throw Error();
  }
};

const getTargetRect = ({ targetRef, overrideTargetRect }: ReferencePositionLayerProps) => {
  if (overrideTargetRect != null) return overrideTargetRect;
  invariant(targetRef.current != null, 'Invalid ref');
  return targetRef.current.getBoundingClientRect();
};

// Positions its content next to a target element inside the nearest layer container, flipping and
// nudging it to stay in view, and keeps it there as the target or the content moves or resizes.
export class ReferencePositionLayer extends Component<ReferencePositionLayerProps, ReferencePositionLayerState> {
  static displayName = 'ReferencePositionLayer';

  static defaultProps = { nudgeAlignIntoViewport: false, spacing: 0, autoInvert: false, disablePointerEvents: false };

  elementRef = createRef<HTMLDivElement>();
  resizeObserver?: ResizeObserver;
  stopTrackingTargetPosition?: () => void;

  override state: ReferencePositionLayerState = {
    style: Object.freeze({}),
    position: this.props.autoInvert ? null : this.props.position,
    nudge: 0,
    isPositioned: false,
  };

  formatDimension(value: number) {
    return this.props.useRawTargetDimensions ? value : Math.ceil(value);
  }

  nudgeLeftAlignment(left: number, element: HTMLElement, container: HTMLElement) {
    if (!this.props.nudgeAlignIntoViewport) return left;
    const overflow = left + element.offsetWidth - container.offsetWidth + 12;
    return overflow > 0 ? Math.max(12, left - overflow) : Math.max(12, left);
  }

  nudgeRightAlignment(right: number, element: HTMLElement, container: HTMLElement) {
    if (!this.props.nudgeAlignIntoViewport) return 0;
    return Math.min(container.offsetWidth - right - element.offsetWidth - 12, 0);
  }

  getHorizontalAlignmentStyle(
    rect: ReferenceRect,
    element: HTMLElement,
    container: HTMLElement,
    style: PositionStyle,
  ): { style: PositionStyle; nudge: number } {
    const { align, offset = 0 } = this.props;
    switch (align) {
      case 'left': {
        const left = this.formatDimension(this.nudgeLeftAlignment(rect.left + offset, element, container));
        return { style: { ...style, left }, nudge: this.formatDimension(rect.left + offset) - left };
      }
      case 'right': {
        const right = this.formatDimension(container.offsetWidth - rect.right - offset);
        const nudge = this.nudgeRightAlignment(right, element, container);
        return { style: { ...style, right: right + nudge }, nudge: 0 };
      }
      case 'center': {
        const center = rect.left + (rect.width - element.offsetWidth) / 2 + offset;
        const left = this.formatDimension(this.nudgeLeftAlignment(center, element, container));
        return { style: { ...style, left }, nudge: this.formatDimension(center) - left };
      }
      default:
        throw Error(`Unsupported align: ${align}`);
    }
  }

  nudgeTopAlignment(top: number, element: HTMLElement, container: HTMLElement) {
    if (!this.props.nudgeAlignIntoViewport) return top;
    if (top < 0) return 0;
    const overflow = top + Math.ceil(element.getBoundingClientRect().height) - container.offsetHeight + 12;
    return overflow > 0 ? Math.max(12, top - overflow) : top;
  }

  nudgeBottomAlignment(bottom: number, element: HTMLElement, container: HTMLElement) {
    const distance = container.offsetHeight - bottom;
    if (!this.props.nudgeAlignIntoViewport) return distance;
    const overflow = distance + element.offsetHeight - container.offsetHeight + 12;
    return overflow > 0 ? Math.max(12, distance - overflow) : distance;
  }

  getVerticalAlignmentStyle(
    rect: ReferenceRect,
    element: HTMLElement,
    container: HTMLElement,
    style: PositionStyle,
  ): { style: PositionStyle; nudge: number } {
    const { align, offset = 0 } = this.props;
    switch (align) {
      case 'top': {
        const top = this.formatDimension(this.nudgeTopAlignment(rect.top + offset, element, container));
        return { style: { ...style, top }, nudge: this.formatDimension(rect.top + offset) - top };
      }
      case 'bottom': {
        const bottom = this.formatDimension(this.nudgeBottomAlignment(rect.bottom + offset, element, container));
        return { style: { ...style, bottom }, nudge: this.formatDimension(rect.bottom + offset) - bottom };
      }
      case 'center': {
        const center = rect.top + (rect.height - element.offsetHeight) / 2 + offset;
        const top = this.formatDimension(this.nudgeTopAlignment(center, element, container));
        return { style: { ...style, top }, nudge: this.formatDimension(center) - top };
      }
      default:
        throw Error(`Unsupported align: ${align}`);
    }
  }

  calculatePositionStyle(
    position: InternalPosition,
    element: HTMLElement,
    container: HTMLElement,
    overlapSide?: ReferencePosition | null,
  ) {
    const { spacing = 0 } = this.props;
    const target = getTargetRect(this.props);
    const containerRect = container.getBoundingClientRect();
    const rect: ReferenceRect = {
      top: target.top - containerRect.top,
      left: target.left - containerRect.left,
      bottom: target.bottom - containerRect.top,
      right: target.right - containerRect.left,
      width: target.width,
      height: target.height,
    };
    switch (position) {
      case 'top':
        return this.getHorizontalAlignmentStyle(rect, element, container, {
          bottom: container.offsetHeight - rect.top + spacing,
        });
      case 'bottom':
        return this.getHorizontalAlignmentStyle(rect, element, container, { top: rect.bottom + spacing });
      case 'left':
        return this.getVerticalAlignmentStyle(rect, element, container, {
          right: container.offsetWidth - rect.left + spacing,
        });
      case 'right':
        return this.getVerticalAlignmentStyle(rect, element, container, { left: rect.right + spacing });
      case 'overlap_vertical':
        return this.getHorizontalAlignmentStyle(rect, element, container, { [overlapSide as string]: 0 });
      case 'overlap_horizontal':
        return this.getVerticalAlignmentStyle(rect, element, container, { [overlapSide as string]: 12 });
      case 'center':
        return this.getVerticalAlignmentStyle(rect, element, container, {
          left: rect.left + rect.width / 2 - element.offsetWidth / 2 + spacing,
        });
      case 'window_center':
        return this.getVerticalAlignmentStyle(rect, element, container, {
          left: Math.max((window.innerWidth - element.offsetWidth) / 2, 0),
        });
      default:
        throw Error(`Unexpected position: ${position}`);
    }
  }

  calculateState(): PositionState {
    const { position, autoInvert, avoidancePadding } = this.props;
    const element = this.elementRef.current;
    invariant(element != null, 'Unexpected null element');
    const container = getParentLayerContainer(element);
    const initial = this.calculatePositionStyle(position, element, container);
    let result: PositionState = { position, style: initial.style, nudge: initial.nudge };
    const space = getRemainingSpace(position, initial.style, element, container, avoidancePadding);
    let bestSpace = space;
    if (autoInvert && space < 0) {
      const inverted = getOppositePosition(position);
      const invertedStyle = this.calculatePositionStyle(inverted, element, container);
      const invertedSpace = getRemainingSpace(inverted, invertedStyle.style, element, container, avoidancePadding);
      if (invertedSpace > space) {
        result = { position: inverted, style: invertedStyle.style, nudge: invertedStyle.nudge };
        bestSpace = invertedSpace;
      }
      if (space < 0 && invertedSpace < 0) {
        const side = result.position as ReferencePosition;
        const overlap: InternalPosition =
          side === 'top' || side === 'bottom'
            ? 'overlap_vertical'
            : side === 'left' || side === 'right'
              ? 'overlap_horizontal'
              : side;
        if (overlap !== position && overlap !== inverted) {
          const overlapStyle = this.calculatePositionStyle(overlap, element, container, side);
          const overlapSpace = getRemainingSpace(
            getOppositePosition(side),
            overlapStyle.style,
            element,
            container,
            avoidancePadding,
          );
          if (overlapSpace > bestSpace) {
            result = { position: side, ...overlapStyle };
            bestSpace = overlapSpace;
          }
        }
      }
    }
    // Still overflowing vertically: slide it back in by the overflow (when it fits at all).
    if (
      bestSpace < 0 &&
      (result.position === 'top' || result.position === 'bottom') &&
      Math.abs(bestSpace) < element.offsetHeight &&
      result.style != null
    ) {
      const side = result.position === 'top' ? 'bottom' : 'top';
      const value = result.style[side];
      return { ...result, style: { ...result.style, [side]: (value == null ? 0 : value) + bestSpace } };
    }
    return result;
  }

  override componentDidMount() {
    const { targetRef, onMount } = this.props;
    this.setState({ isPositioned: true, ...this.calculateState() }, this.startTrackingTargetPosition);
    const element = this.elementRef.current;
    invariant(element != null, 'Missing elementRef');
    if (targetRef.current != null) layerTargets.set(element, targetRef.current);
    element.ownerDocument?.defaultView?.addEventListener('resize', this.updatePosition);
    const ResizeObserverImpl = element.ownerDocument?.defaultView?.ResizeObserver;
    if (ResizeObserverImpl != null) {
      this.resizeObserver = new ResizeObserverImpl(this.handleResize);
      this.resizeObserver.observe(element, { box: 'border-box' });
    }
    onMount?.();
  }

  startTrackingTargetPosition = () => {
    const { trackTargetPosition, overrideTargetRect, targetRef } = this.props;
    const element = this.elementRef.current;
    if (trackTargetPosition && overrideTargetRect == null && targetRef.current != null && element != null) {
      this.stopTrackingTargetPosition = autoUpdate(targetRef.current, element, this.handleResize, {
        ancestorScroll: false,
        ancestorResize: false,
        elementResize: false,
        layoutShift: true,
      });
    }
  };

  override componentDidUpdate(prevProps: ReferencePositionLayerProps, prevState: ReferencePositionLayerState) {
    const prevRect = getTargetRect(prevProps);
    const rect = getTargetRect(this.props);
    if (
      getPositionKey(prevProps) !== getPositionKey(this.props) ||
      prevRect.top !== rect.top ||
      prevRect.left !== rect.left
    ) {
      this.updatePosition();
    }
    if (prevState.position !== this.state.position) this.props.onPositionChange?.(this.state.position);
  }

  override componentWillUnmount() {
    const element = this.elementRef.current;
    invariant(element != null, 'Missing elementRef');
    layerTargets.delete(element);
    element.ownerDocument?.defaultView?.removeEventListener('resize', this.updatePosition);
    this.resizeObserver?.disconnect();
    this.stopTrackingTargetPosition?.();
    this.props.onUnmount?.();
  }

  updatePosition = () => {
    this.setState(this.calculateState());
  };

  handleResize = () => {
    const next = this.calculateState();
    const { state } = this;
    if (
      next.position !== state.position ||
      next.nudge !== state.nudge ||
      next.style.top !== state.style.top ||
      next.style.bottom !== state.style.bottom ||
      next.style.left !== state.style.left ||
      next.style.right !== state.style.right
    ) {
      flushSync(() => this.setState(next));
    }
  };

  calculateMaxHeight() {
    const element = this.elementRef.current;
    if (element == null) return undefined;
    const container = getParentLayerContainer(element);
    const { style } = this.state;
    if (style.top != null) return Math.max(0, container.offsetHeight - style.top - 12);
    if (style.bottom != null) return Math.max(0, container.offsetHeight - style.bottom - 12);
    return Math.max(0, container.offsetHeight - 24);
  }

  override render() {
    const { id, className, children, fixed, disablePointerEvents, clickTrap = false } = this.props;
    const { position, isPositioned, nudge } = this.state;
    const maxHeight = this.calculateMaxHeight();
    return (
      <div className={clsx({ [styles.clickTrapContainer]: true, [styles.trapClicks]: clickTrap })}>
        <ThemeContext.Consumer>
          {({ disableAdaptiveTheme }) => (
            <ThemeProvider disableAdaptiveTheme={disableAdaptiveTheme}>
              {(themeClassName) => (
                <div
                  id={id}
                  className={clsx(className, themeClassName, styles.layer, {
                    [styles.emptyError]: false,
                    [styles.disabledPointerEvents]: disablePointerEvents,
                  })}
                  style={
                    {
                      position: fixed ? 'fixed' : 'absolute',
                      ...this.state.style,
                      '--reference-position-layer-max-height': maxHeight != null ? `${maxHeight}px` : undefined,
                    } as CSSProperties
                  }
                  ref={this.elementRef}
                >
                  <FocusRingScope containerRef={this.elementRef}>
                    {children({ position, nudge, isPositioned }, this.updatePosition)}
                  </FocusRingScope>
                </div>
              )}
            </ThemeProvider>
          )}
        </ThemeContext.Consumer>
      </div>
    );
  }
}
