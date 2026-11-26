import {
  useContext,
  useEffect,
  useLayoutEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { animated, config as springConfig } from '@react-spring/web';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { FocusRing } from '../FocusRing';
import { useSpring } from '../hooks';
import { Tooltip } from '../Tooltip';
import styles from './VoidSlider.module.css';

const clamp = (value: number, lower: number, upper: number) => Math.min(Math.max(value, lower), upper);

// Index of the marker closest to `value` in sorted `markers` (ties go to the higher one).
const getClosestMarkerIndex = (value: number, markers: number[]) => {
  let previousDelta = 0;
  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    if (value === marker) return index;
    if (value < marker) {
      if (previousDelta === 0 || marker - value < previousDelta) return index;
      return index - 1;
    }
    previousDelta = value - marker;
  }
  return null;
};

export interface VoidSliderHandle {
  focus: () => void;
  blur: () => void;
}

export interface VoidSliderProps extends FieldOwnProps {
  initialValue?: number;
  value?: number;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  markers?: number[];
  equidistant?: boolean;
  stickToMarkers?: boolean;
  /** 0 renders the marker labels above the bar, 1 below. */
  markerPosition?: 0 | 1;
  keyboardStep?: number;
  keyboardPageStep?: number;
  handleSize?: number;
  tabIndex?: number;
  mini?: boolean;
  hideBubble?: boolean;
  orientation?: 'horizontal' | 'vertical';
  consumeAxisOnly?: boolean;
  className?: string;
  barClassName?: string;
  grabberClassName?: string;
  barStyles?: CSSProperties;
  fillStyles?: CSSProperties;
  grabberStyles?: CSSProperties;
  children?: ReactNode;
  onValueChange?: (value: number) => void;
  asValueChanges?: (value: number) => void;
  onValueRender?: (value: number) => ReactNode;
  onMarkerRender?: (marker: number) => ReactNode;
  renderMarker?: (marker: number) => ReactNode;
  getAriaValueText?: (value: number) => string | undefined;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  ref?: Ref<VoidSliderHandle>;
}

interface MarkerState {
  min: number;
  max: number;
  range: number;
  sortedMarkers: number[];
  markerPositions: number[];
  closestMarkerIndex?: number | null;
}

interface SliderState extends MarkerState {
  value: number;
  initialValueProp: number;
  newClosestIndex: number | null;
  active: boolean;
  focused: boolean;
  dragStartValue?: number;
  boundingRect?: DOMRect;
}

type ResolvedProps = VoidSliderProps & Required<Pick<VoidSliderProps, 'initialValue' | 'minValue' | 'maxValue'>>;

const getMarkerState = ({ markers, initialValue, minValue, maxValue, equidistant }: ResolvedProps): MarkerState => {
  if (markers == null) {
    return { min: minValue, max: maxValue, range: maxValue - minValue, sortedMarkers: [], markerPositions: [] };
  }
  // Sorts the caller's array in place, like Discord's.
  const sortedMarkers = markers.sort((a, b) => a - b);
  const closestMarkerIndex = getClosestMarkerIndex(initialValue, sortedMarkers);
  const min = sortedMarkers[0];
  const max = sortedMarkers[sortedMarkers.length - 1];
  const range = max - min;
  const step = 100 / (sortedMarkers.length - 1);
  const markerPositions = equidistant
    ? sortedMarkers.map((_, index) => index * step)
    : sortedMarkers.map((marker) => (100 * (marker - min)) / range);
  return { min, max, range, sortedMarkers, markerPositions, closestMarkerIndex };
};

const getValueState = (props: ResolvedProps, value: number | undefined) => ({
  value: value ?? clamp(props.initialValue, props.minValue, props.maxValue),
  initialValueProp: props.initialValue,
  newClosestIndex: null,
  ...getMarkerState(props),
});

// Grows the grabber and bar while hovered, dragged or focused from the keyboard.
const useSliderStyles = (active: boolean, keyboardFocused: boolean) => {
  const [hovered, setHovered] = useState(false);
  const expanded = keyboardFocused || active || hovered;
  const sliderStyles = useSpring({
    '--grabber-size': expanded ? '20px' : '16px',
    '--bar-size': expanded ? '6px' : '4px',
    config: { ...springConfig.stiff, duration: 100 },
  });
  return { sliderStyles, setHovered };
};

interface Instance {
  props: ResolvedProps;
  state: SliderState;
}

// The slider's interaction logic, kept as stable functions so document listeners can be removed again.
const createHandlers = (
  instance: RefObject<Instance>,
  setStoredState: Dispatch<SetStateAction<SliderState>>,
  containerRef: RefObject<HTMLDivElement | null>,
) => {
  const handlers = {
    setState: (partial: Partial<SliderState>) => setStoredState((current) => ({ ...current, ...partial })),
    unscaleValue: (percent: number) => {
      const { range, min } = instance.current.state;
      return (percent * range) / 100 + min;
    },
    reset: () => {
      containerRef.current?.ownerDocument?.removeEventListener('mousemove', handlers.handleMouseMove, true);
      containerRef.current?.ownerDocument?.removeEventListener('mouseup', handlers.handleMouseUp, true);
    },
    commitValue: (value: number, closestIndex?: number) => {
      const { asValueChanges, onValueChange } = instance.current.props;
      const partial: Partial<SliderState> = { value };
      if (closestIndex != null) {
        partial.closestMarkerIndex = closestIndex;
        partial.newClosestIndex = closestIndex;
      }
      handlers.setState(partial);
      if (value !== instance.current.state.value) {
        asValueChanges?.(value);
        onValueChange?.(value);
      }
    },
    moveGrabber: (delta: number) => {
      const { sortedMarkers, value, min, max, closestMarkerIndex } = instance.current.state;
      if (instance.current.props.stickToMarkers) {
        const index = closestMarkerIndex ?? sortedMarkers.indexOf(value);
        if (index < 0) return;
        const nextIndex = clamp(index + delta, 0, sortedMarkers.length - 1);
        const marker = sortedMarkers[nextIndex];
        if (marker == null) return;
        handlers.commitValue(marker, nextIndex);
      } else {
        handlers.commitValue(clamp(value + delta, min, max));
      }
    },
    moveGrabberToEdge: (edge: 'min' | 'max') => {
      const { sortedMarkers, min, max } = instance.current.state;
      if (instance.current.props.stickToMarkers) {
        if (sortedMarkers.length === 0) return;
        const index = edge === 'min' ? 0 : sortedMarkers.length - 1;
        const marker = sortedMarkers[index];
        if (marker == null) return;
        handlers.commitValue(marker, index);
      } else {
        handlers.commitValue(edge === 'min' ? min : max);
      }
    },
    getKeyboardPageStep: () => {
      const { keyboardPageStep, stickToMarkers, keyboardStep = 1 } = instance.current.props;
      if (stickToMarkers)
        return keyboardPageStep ?? Math.max(1, Math.round(instance.current.state.sortedMarkers.length / 10));
      const { min, max } = instance.current.state;
      return keyboardPageStep ?? Math.max(keyboardStep, (max - min) / 10);
    },
    handlePointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (!instance.current.props.disabled) event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    handleContainerMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => {
      const { disabled, maxValue, minValue, asValueChanges, onValueChange, stickToMarkers } = instance.current.props;
      const { sortedMarkers, markerPositions } = instance.current.state;
      if (disabled) return;
      const { clientX, currentTarget } = event;
      if (!(currentTarget instanceof Element)) return;
      const { left, width } = currentTarget.getBoundingClientRect();
      const fraction = (clientX - left) / width;
      let value: number;
      if (stickToMarkers) {
        const { nextClosestMarkerIndex } = markerPositions.reduce(
          (closest, position, index) => {
            const delta = Math.abs(position / 100 - fraction);
            return delta <= closest.smallestDelta ? { smallestDelta: delta, nextClosestMarkerIndex: index } : closest;
          },
          { smallestDelta: 1, nextClosestMarkerIndex: -1 },
        );
        if (nextClosestMarkerIndex === -1) return;
        value = sortedMarkers[nextClosestMarkerIndex];
        handlers.handleMouseDown(event);
        handlers.setState({
          closestMarkerIndex: nextClosestMarkerIndex,
          value,
          newClosestIndex: nextClosestMarkerIndex,
        });
      } else {
        value = minValue + (maxValue - minValue) * fraction;
        handlers.setState({ value, dragStartValue: value });
        handlers.handleMouseDown(event);
      }
      onValueChange?.(value);
      asValueChanges?.(value);
    },
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const { disabled, orientation, consumeAxisOnly, keyboardStep = 1 } = instance.current.props;
      if (disabled) return;
      const { key } = event;
      let increase: string[];
      let decrease: string[];
      if (orientation === 'vertical') {
        increase = consumeAxisOnly ? ['ArrowUp'] : ['ArrowUp', 'ArrowRight'];
        decrease = consumeAxisOnly ? ['ArrowDown'] : ['ArrowDown', 'ArrowLeft'];
      } else {
        increase = consumeAxisOnly ? ['ArrowRight'] : ['ArrowRight', 'ArrowUp'];
        decrease = consumeAxisOnly ? ['ArrowLeft'] : ['ArrowLeft', 'ArrowDown'];
      }
      let action: (() => void) | undefined;
      if (decrease.includes(key)) action = () => handlers.moveGrabber(-keyboardStep);
      else if (increase.includes(key)) action = () => handlers.moveGrabber(keyboardStep);
      else if (key === 'Home') action = () => handlers.moveGrabberToEdge('min');
      else if (key === 'End') action = () => handlers.moveGrabberToEdge('max');
      else if (key === 'PageUp') action = () => handlers.moveGrabber(handlers.getKeyboardPageStep());
      else if (key === 'PageDown') action = () => handlers.moveGrabber(-handlers.getKeyboardPageStep());
      if (action == null) return;
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    handleMouseDown: (event: ReactMouseEvent) => {
      if (instance.current.props.disabled) return;
      event.stopPropagation();
      const container = containerRef.current;
      container?.ownerDocument?.addEventListener('mousemove', handlers.handleMouseMove, true);
      container?.ownerDocument?.addEventListener('mouseup', handlers.handleMouseUp, true);
      if (!(container instanceof Element)) {
        throw Error('[UIKit]Slider.handleMouseDown(): assert failed: domNode nodeType !== Element');
      }
      handlers.setState({
        active: true,
        boundingRect: container.getBoundingClientRect(),
        newClosestIndex: instance.current.state.closestMarkerIndex,
      });
    },
    handleMouseUp: (event: MouseEvent) => {
      event.stopPropagation();
      handlers.reset();
      const { onValueChange, stickToMarkers } = instance.current.props;
      const { newClosestIndex } = instance.current.state;
      if (stickToMarkers && newClosestIndex != null) {
        const marker = instance.current.state.sortedMarkers[newClosestIndex];
        onValueChange?.(marker);
        handlers.setState({ newClosestIndex: null, closestMarkerIndex: newClosestIndex, value: marker });
      } else if (
        instance.current.state.dragStartValue == null ||
        instance.current.state.value !== instance.current.state.dragStartValue
      ) {
        onValueChange?.(instance.current.state.value);
      }
      handlers.setState({ active: false, dragStartValue: undefined });
    },
    handleMouseMove: (event: MouseEvent) => {
      event.preventDefault();
      if (instance.current.props.stickToMarkers) handlers.moveStaggered(event);
      else handlers.moveSmoothly(event);
    },
    moveStaggered: (event: MouseEvent) => {
      const { boundingRect, markerPositions, sortedMarkers } = instance.current.state;
      if (boundingRect == null) return;
      const { left, right } = boundingRect;
      const width = right - left;
      if (width <= 0) return;
      const percent = 100 * Math.min(Math.max((event.clientX - left) / width, 0), 1);
      const index = instance.current.props.equidistant
        ? getClosestMarkerIndex(percent, markerPositions)
        : getClosestMarkerIndex(handlers.unscaleValue(percent), sortedMarkers);
      if (index != null) instance.current.props.asValueChanges?.(sortedMarkers[index]);
      handlers.setState({ newClosestIndex: index });
    },
    moveSmoothly: (event: MouseEvent) => {
      const { minValue, maxValue, asValueChanges } = instance.current.props;
      const { boundingRect } = instance.current.state;
      if (boundingRect == null) return;
      const { left, right } = boundingRect;
      const range = maxValue - minValue;
      const value = Math.min(
        Math.max(minValue + ((event.clientX - left) / (right - left)) * range, minValue),
        maxValue,
      );
      asValueChanges?.(value);
      handlers.setState({ value });
    },
  };
  return handlers;
};

export const VoidSlider = (inputProps: VoidSliderProps) => {
  const props: ResolvedProps = {
    initialValue: 10,
    minValue: 0,
    maxValue: 100,
    keyboardStep: 1,
    handleSize: 10,
    tabIndex: 0,
    disabled: false,
    stickToMarkers: false,
    fillStyles: {},
    ...Object.fromEntries(Object.entries(inputProps).filter(([, value]) => value !== undefined)),
  } as ResolvedProps;
  const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<HTMLDivElement>(null);

  const [storedState, setStoredState] = useState<SliderState>(() => ({
    active: false,
    focused: false,
    dragStartValue: undefined,
    ...getValueState(props, props.initialValue),
  }));
  // getDerivedStateFromProps: a controlled value or a new initial value resets the derived state.
  let state = storedState;
  if (props.value != null && props.value !== state.value) {
    const next: SliderState = { ...state, ...getValueState(props, props.value), active: state.active };
    if (props.stickToMarkers && next.sortedMarkers.length > 0) {
      const index = getClosestMarkerIndex(props.value, next.sortedMarkers);
      if (index != null) next.closestMarkerIndex = index;
    }
    state = next;
  } else if (props.initialValue !== state.initialValueProp) {
    state = { ...state, ...getValueState(props, state.value), active: state.active };
  }
  if (state !== storedState) setStoredState(state);

  // Event handlers read the props and state of the last render, like a class component's `this`.
  const self = useRef<Instance>({ props, state });
  useLayoutEffect(() => {
    self.current.props = props;
    self.current.state = state;
  });
  // The handlers only read the refs when events fire, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [h] = useState(() => createHandlers(self, setStoredState, containerRef));
  const { setState } = h;

  useEffect(() => () => h.reset(), [h]);

  useImperativeHandle(inputProps.ref, () => ({
    focus: () => containerRef.current?.focus(),
    blur: () => containerRef.current?.blur(),
  }));

  const { sliderStyles, setHovered } = useSliderStyles(state.active, state.focused && keyboardModeEnabled);

  const { value, active, focused, sortedMarkers, markerPositions, closestMarkerIndex, newClosestIndex, min, max } =
    state;
  const {
    disabled,
    stickToMarkers,
    className,
    children,
    barStyles,
    fillStyles,
    mini,
    hideBubble,
    defaultValue,
    orientation,
    onValueRender,
    renderMarker,
    onMarkerRender,
    getAriaValueText,
    barClassName,
    grabberClassName,
    grabberStyles = {},
    markerPosition = 0,
    tabIndex,
    'aria-hidden': ariaHidden,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
  } = props;
  const { fieldProps } = splitFieldProps(props);

  let fillPercent = 0;
  if (stickToMarkers) {
    if (markerPositions != null) {
      if (newClosestIndex != null) fillPercent = markerPositions[newClosestIndex];
      else if (closestMarkerIndex != null) fillPercent = markerPositions[closestMarkerIndex];
    }
  } else {
    fillPercent = (100 * (value - min)) / state.range;
  }
  fillPercent = Math.min(Math.max(fillPercent, 0), 100);
  const fillWidth = `${fillPercent}%`;

  const marks =
    markerPositions != null && sortedMarkers != null
      ? markerPositions.map((position, index) => {
          const marker = sortedMarkers[index];
          const isDefault = defaultValue != null && defaultValue === marker;
          const label = onMarkerRender != null ? onMarkerRender(marker) : marker;
          return (
            <div
              key={index}
              className={clsx(styles.mark, {
                [styles.defaultValue]: isDefault,
                [styles.markAbove]: markerPosition === 0,
                [styles.markBelow]: markerPosition === 1,
              })}
              style={{ left: `${position}%` }}
            >
              {renderMarker != null ? (
                renderMarker(marker)
              ) : (
                <>
                  <div className={styles.markValue}>{label}</div>
                  <div className={styles[`markDash${label == null ? 'simple' : ''}`]} />
                </>
              )}
            </div>
          );
        })
      : null;
  const bubbleText = onValueRender != null ? onValueRender(value) : `${fillPercent.toFixed(0)}%`;
  const ariaValueText = getAriaValueText?.(value) ?? undefined;

  return (
    <Field {...fieldProps}>
      {(field) => (
        <FocusRing focusTarget={containerRef} ringTarget={grabberRef}>
          <animated.div
            className={clsx(styles.slider, className, {
              [styles.hasMarks]: (marks?.length ?? 0) > 0,
              [styles.disabled]: disabled,
              [styles.mini]: mini,
            })}
            style={sliderStyles as CSSProperties}
            id={field.controlId}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-disabled={disabled}
            aria-orientation={orientation}
            aria-hidden={ariaHidden}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy ?? field.labelId}
            aria-describedby={ariaDescribedBy ?? field.describedById}
            aria-errormessage={field.errorMessageId}
            aria-invalid={field.errorMessageId != null}
            aria-valuetext={ariaValueText}
            role="slider"
            tabIndex={tabIndex}
            onKeyDown={h.handleKeyDown}
            onPointerDown={h.handlePointerDown}
            onMouseDown={h.handleContainerMouseDown}
            onFocus={() => setState({ focused: true })}
            onBlur={() => setState({ focused: false })}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            ref={containerRef}
          >
            <div className={styles.track}>{marks}</div>
            <div className={clsx(styles.bar, barClassName)} style={barStyles}>
              <div className={styles.barFill} style={{ ...fillStyles, width: fillWidth }} />
            </div>
            {children}
            <div className={styles.track}>
              <Tooltip
                __unsupportedReactNodeAsText={hideBubble || stickToMarkers ? null : bubbleText}
                forceOpen={active || (focused && keyboardModeEnabled)}
                positionKey={fillWidth}
                spacing={10}
              >
                <div
                  className={clsx(styles.grabber, grabberClassName)}
                  style={{ ...grabberStyles, left: fillWidth }}
                  onMouseDown={h.handleMouseDown}
                  ref={grabberRef}
                />
              </Tooltip>
            </div>
          </animated.div>
        </FocusRing>
      )}
    </Field>
  );
};

VoidSlider.displayName = 'VoidSlider';
