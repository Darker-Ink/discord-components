import {
  useContext,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { animated, config as springConfig } from '@react-spring/web';
import { mergeProps, useLocale, useNumberFormatter, useSlider, useSliderThumb, VisuallyHidden } from 'react-aria';
import { useSliderState, type SliderState } from 'react-stately';
import { FocusRing } from 'react-focus-rings';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { useSpring } from '../hooks';
import { Tooltip } from '../Tooltip';
import styles from './Slider.module.css';

const VERTICAL_ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown']);

export type SliderMark = number | { value: number; label?: ReactNode };

interface NormalizedMark {
  value: number;
  label: ReactNode;
  usesFormatValue: boolean;
}

const closestIndex = (values: number[], target: number) => {
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - target) < Math.abs(values[index] - target)) index = i;
  }
  return index;
};

interface SnapPointerOptions {
  state: SliderState;
  trackRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  sortedMarks: number[];
  minValue: number;
  maxValue: number;
  disabled: boolean | undefined;
}

// With snapToMarks the state works on mark indexes, so pointer positions are mapped to the nearest
// mark by hand instead of through react-aria's track handlers.
const useSnapPointerHandlers = ({
  state,
  trackRef,
  inputRef,
  sortedMarks,
  minValue,
  maxValue,
  disabled,
}: SnapPointerOptions) => {
  const { direction } = useLocale();
  const updateFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (track == null) return;
    const { left, width } = track.getBoundingClientRect();
    if (width <= 0) return;
    let fraction = Math.min(Math.max((clientX - left) / width, 0), 1);
    if (direction === 'rtl') fraction = 1 - fraction;
    state.setThumbValue(0, closestIndex(sortedMarks, minValue + fraction * (maxValue - minValue)));
  };
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (disabled || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      inputRef.current?.focus({ preventScroll: true });
      state.setThumbDragging(0, true);
      updateFromPointer(event.clientX);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (state.isThumbDragging(0)) updateFromPointer(event.clientX);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      if (!state.isThumbDragging(0)) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      state.setThumbDragging(0, false);
    },
    onPointerCancel() {
      if (state.isThumbDragging(0)) state.setThumbDragging(0, false);
    },
  };
};

export interface SliderControlProps {
  id?: string;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
  errorMessageId?: string;
  value?: number;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  formatValue?: (value: number) => string;
  marks?: SliderMark[];
  snapToMarks?: boolean;
  defaultMark?: number;
  hideTooltip?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  // Lets ArrowUp/ArrowDown reach ancestors (e.g. a list navigator) instead of changing the value.
  passThroughVerticalArrowKeys?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  tabIndex?: number;
}

const SliderControl = ({
  id,
  disabled,
  labelledBy,
  describedBy,
  errorMessageId,
  value,
  defaultValue,
  minValue = 0,
  maxValue = 100,
  step = 1,
  onChange,
  onChangeEnd,
  formatValue,
  marks,
  snapToMarks = false,
  defaultMark,
  hideTooltip = false,
  'aria-label': ariaLabel,
  passThroughVerticalArrowKeys = false,
  inputRef: inputRefProp,
  tabIndex,
}: SliderControlProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const inputRef = (inputRefProp ?? ownInputRef) as RefObject<HTMLInputElement | null>;
  const [isHovered, setIsHovered] = useState(false);
  const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);

  const sortedMarks = useMemo<NormalizedMark[]>(
    () =>
      (marks ?? [])
        .map((mark) =>
          typeof mark === 'number'
            ? { value: mark, label: undefined, usesFormatValue: true }
            : { value: mark.value, label: mark.label, usesFormatValue: false },
        )
        .sort((a, b) => a.value - b.value),
    [marks],
  );
  const markValues = useMemo(() => sortedMarks.map((mark) => mark.value), [sortedMarks]);
  const snaps = snapToMarks && markValues.length > 1;

  const toStateValue = (input: number | undefined) =>
    input != null && snaps ? closestIndex(markValues, input) : input;
  const toPercent = (input: number) => Math.min(Math.max(((input - minValue) / (maxValue - minValue)) * 100, 0), 100);

  const numberFormatter = useNumberFormatter();
  const format = (input: number) => (formatValue != null ? formatValue(input) : numberFormatter.format(input));

  const state = useSliderState({
    value: toStateValue(value),
    defaultValue: toStateValue(defaultValue),
    minValue: snaps ? 0 : minValue,
    maxValue: snaps ? markValues.length - 1 : maxValue,
    step: snaps ? 1 : step,
    isDisabled: disabled,
    numberFormatter,
    onChange: (next: number | number[]) => onChange?.(snaps ? markValues[next as number] : (next as number)),
    onChangeEnd: (next: number | number[]) => onChangeEnd?.(snaps ? markValues[next as number] : (next as number)),
  });
  const { groupProps, trackProps } = useSlider(
    { 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, isDisabled: disabled },
    state,
    trackRef,
  );
  const { thumbProps, inputProps, isDragging, isFocused } = useSliderThumb(
    { index: 0, trackRef, inputRef, isDisabled: disabled, 'aria-label': ariaLabel },
    state,
  );
  const snapHandlers = useSnapPointerHandlers({
    state,
    trackRef,
    inputRef,
    sortedMarks: markValues,
    minValue,
    maxValue,
    disabled,
  });

  const thumbValue = state.getThumbValue(0);
  const currentValue = snaps ? markValues[thumbValue] : thumbValue;
  const valueText = format(currentValue);
  const position = `${toPercent(currentValue)}%`;
  const showsKeyboardFocus = isFocused && keyboardModeEnabled;
  const isActive = !disabled && (showsKeyboardFocus || isDragging || isHovered);

  const passThrough =
    (handler: KeyboardEventHandler<HTMLElement> | undefined) => (event: KeyboardEvent<HTMLElement>) => {
      if (passThroughVerticalArrowKeys && VERTICAL_ARROW_KEYS.has(event.key)) event.preventDefault();
      else handler?.(event);
    };

  const sliderProps = mergeProps(groupProps, snaps ? snapHandlers : trackProps);
  const spring = useSpring({
    '--grabber-size': isActive ? '20px' : '16px',
    '--bar-size': isActive ? '6px' : '4px',
    config: { ...springConfig.stiff, duration: 100 },
  });

  return (
    <FocusRing focusTarget={inputRef} ringTarget={grabberRef}>
      <animated.div
        {...sliderProps}
        onKeyDown={passThrough(sliderProps.onKeyDown)}
        className={clsx(styles.slider, { [styles.hasMarks]: markValues.length > 0, [styles.disabled]: disabled })}
        style={{ ...spring, touchAction: 'none' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={styles.track}>
          {sortedMarks.map((mark) => {
            const label = mark.usesFormatValue ? format(mark.value) : mark.label;
            return (
              <div
                key={mark.value}
                aria-hidden
                className={clsx(styles.mark, styles.markAbove, { [styles.defaultValue]: mark.value === defaultMark })}
                style={{ insetInlineStart: `${toPercent(mark.value)}%` }}
              >
                <div className={styles.markValue}>{label}</div>
                {label != null ? <div className={styles.markDash} /> : null}
              </div>
            );
          })}
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: position }} />
        </div>
        <div className={styles.track} ref={trackRef}>
          <Tooltip
            text={snaps || hideTooltip ? null : valueText}
            forceOpen={isDragging || showsKeyboardFocus}
            positionKey={position}
            spacing={10}
            ariaHidden
          >
            <div
              {...thumbProps}
              {...(snaps ? { onPointerDown: undefined, onMouseDown: undefined, onTouchStart: undefined } : null)}
              onKeyDown={passThrough(thumbProps.onKeyDown)}
              ref={grabberRef}
              className={styles.grabber}
              style={{ insetInlineStart: position, touchAction: 'none' }}
            >
              <VisuallyHidden>
                <input
                  ref={inputRef}
                  {...inputProps}
                  tabIndex={tabIndex ?? inputProps.tabIndex}
                  id={id}
                  aria-labelledby={labelledBy}
                  aria-describedby={describedBy}
                  aria-errormessage={errorMessageId}
                  aria-invalid={errorMessageId != null}
                  aria-valuetext={valueText}
                  aria-valuemin={snaps ? markValues[0] : minValue}
                  aria-valuemax={snaps ? markValues[markValues.length - 1] : maxValue}
                  aria-valuenow={currentValue}
                />
              </VisuallyHidden>
            </div>
          </Tooltip>
        </div>
      </animated.div>
    </FocusRing>
  );
};

SliderControl.displayName = 'SliderControl';

export interface SliderProps
  extends
    FieldOwnProps,
    Omit<SliderControlProps, 'id' | 'disabled' | 'labelledBy' | 'describedBy' | 'errorMessageId'> {}

export const Slider = (props: SliderProps) => {
  const { fieldProps, props: controlProps } = splitFieldProps(props);
  return (
    <Field {...fieldProps}>
      {(field) => (
        <SliderControl
          {...controlProps}
          id={field.controlId}
          disabled={fieldProps.disabled ?? false}
          labelledBy={controlProps['aria-labelledby'] ?? field.labelId}
          describedBy={field.describedById}
          errorMessageId={field.errorMessageId}
        />
      )}
    </Field>
  );
};

Slider.displayName = 'Slider';
