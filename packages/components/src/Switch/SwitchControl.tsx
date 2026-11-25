import { useContext, useRef, type RefObject } from 'react';
import { animated } from '@react-spring/web';
import { useHover, useSwitch } from 'react-aria';
import { useToggleState } from 'react-stately';
import type { FocusRingProps } from 'react-focus-rings';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { FocusRing } from '../FocusRing';
import { HiddenVisually } from '../HiddenVisually';
import { useSpring } from '../hooks';
import { tokens, useToken } from '../tokens';
import styles from './Switch.module.css';

// Thumb icon paths: the "x" (two strokes), the pressed "-" (two halves) and the checkmark.
const X_STROKE_1 = 'M4.10585 5.3837L5.37864 4.11091L11.884 10.61632L10.6112 11.88912L4.10585 5.3837Z';
const X_STROKE_2 = 'M10.61632 4.11091L11.88912 5.3837L5.3837 11.88912L4.11091 10.61632L10.61632 4.11091Z';
const DASH_1 = 'M5.25333 8.80104L5.25333 7.17346L10.85336 7.17346L10.85336 8.80104L5.25333 8.80104Z';
const DASH_2 = 'M10.84656 7.17346L10.84656 8.80104L5.24954 8.80104L5.24954 7.17346L10.84656 7.17346Z';
const CHECK_LONG = 'M6.31649 11.88304L5.0437 10.61032L11.44792 4.20604L12.72072 5.47883L6.31649 11.88304Z';
const CHECK_SHORT = 'M3.26914 8.87224L4.54194 7.59943L7.5588 10.61632L6.28601 11.88912L3.26914 8.87224Z';

// Keyframes of the spring's `state` (0 = off, 1 = on) the thumb and colors are interpolated over.
const THUMB_POSITION_RANGE = [0, 0.1, 0.4, 0.6, 0.9, 1];
const COLOR_RANGE = [0, 0.1, 0.9, 1];
const TURN_ON_RANGE = [0, 0.1, 0.2, 0.5, 0.7, 1];
const TURN_OFF_RANGE = [0, 0.3, 0.5, 0.8, 0.9, 1];

const noop = () => {};

export interface SwitchControlProps {
  checked: boolean;
  disabled?: boolean;
  // Renders only the indicator, without an input, hover handling or focus ring.
  displayOnly?: boolean;
  id?: string;
  onChange?: (checked: boolean) => void;
  focusProps?: Partial<FocusRingProps>;
  hasIcon?: boolean;
  describedBy?: string;
  labelledBy?: string;
  innerRef?: RefObject<HTMLInputElement | null>;
}

export const SwitchControl = ({
  checked,
  disabled,
  displayOnly,
  id,
  onChange,
  focusProps,
  hasIcon = false,
  describedBy,
  labelledBy,
  innerRef,
}: SwitchControlProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const inputRef = innerRef ?? ownInputRef;
  const toggleState = useToggleState({ isSelected: checked, onChange: onChange ?? noop, isDisabled: disabled });
  const { inputProps, labelProps, isPressed } = useSwitch(
    { id, isDisabled: disabled, 'aria-describedby': describedBy, 'aria-labelledby': labelledBy ?? '' },
    toggleState,
    inputRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });

  const backgroundDefault = useToken(tokens.colors.SWITCH_BACKGROUND_DEFAULT).spring();
  const backgroundPressedOff = useToken(tokens.colors.SWITCH_BACKGROUND_DEFAULT).spring();
  const backgroundSelected = useToken(tokens.colors.SWITCH_BACKGROUND_SELECTED_DEFAULT).spring();
  const backgroundActive = useToken(tokens.colors.SWITCH_BACKGROUND_ACTIVE).spring();
  const borderDefault = useToken(tokens.colors.SWITCH_BORDER_DEFAULT).spring();
  const borderSelected = useToken(tokens.colors.SWITCH_BORDER_SELECTED_DEFAULT).spring();
  const backgroundHover = useToken(tokens.colors.SWITCH_BACKGROUND_HOVER).spring();
  const backgroundSelectedHover = useToken(tokens.colors.SWITCH_BACKGROUND_SELECTED_HOVER).spring();
  const borderHover = useToken(tokens.colors.SWITCH_BORDER_HOVER).spring();
  const borderSelectedHover = useToken(tokens.colors.SWITCH_BORDER_SELECTED_HOVER).spring();
  const iconDefault = useToken(tokens.colors.SWITCH_THUMB_ICON_DEFAULT).spring();
  const iconActive = useToken(tokens.colors.SWITCH_THUMB_ICON_ACTIVE).spring();
  const thumbDefault = useToken(tokens.colors.SWITCH_THUMB_BACKGROUND_DEFAULT).spring();
  const thumbSelected = useToken(tokens.colors.SWITCH_THUMB_BACKGROUND_SELECTED_DEFAULT).spring();

  // While pressed the thumb stretches part of the way towards the other side.
  const pressedState = checked ? TURN_OFF_RANGE[TURN_OFF_RANGE.length - 2] : TURN_ON_RANGE[1];
  const { state, opacity } = useSpring(
    {
      config: { duration: reducedMotion.enabled ? 200 : 300 },
      opacity: disabled ? 0.5 : 1,
      state: isPressed ? pressedState : Number(!!checked),
    },
    'animate-always',
  );

  const thumbShape = (output: number[], reversed = [...output].reverse()) =>
    checked ? state.to({ range: TURN_OFF_RANGE, output: reversed }) : state.to({ range: TURN_ON_RANGE, output });

  let icon = null;
  if (hasIcon) {
    const iconFill = state.to({
      range: COLOR_RANGE,
      output: [iconDefault, iconDefault, iconActive, iconActive],
      extrapolate: 'clamp',
    });
    icon = (
      <svg viewBox="0 0 24 24" fill="none">
        <g transform="translate(4 4)">
          <animated.path
            fill={iconFill}
            d={state.to({ range: COLOR_RANGE, output: [X_STROKE_1, DASH_1, DASH_1, CHECK_LONG], extrapolate: 'clamp' })}
          />
          <animated.path
            fill={iconFill}
            d={state.to({
              range: COLOR_RANGE,
              output: [X_STROKE_2, DASH_2, DASH_2, CHECK_SHORT],
              extrapolate: 'clamp',
            })}
          />
        </g>
      </svg>
    );
  }

  const indicator = (
    <animated.div
      {...(displayOnly ? {} : hoverProps)}
      ref={indicatorRef}
      className={styles.switchIndicator}
      data-size="md"
      data-mana-component="switch"
      style={{
        opacity,
        backgroundColor: state.to({
          range: COLOR_RANGE,
          output: [
            isHovered ? backgroundHover : backgroundDefault,
            backgroundPressedOff,
            backgroundActive,
            isHovered ? backgroundSelectedHover : backgroundSelected,
          ],
          extrapolate: 'clamp',
        }),
        border: '1px solid',
        borderColor: state.to({
          range: COLOR_RANGE,
          output: [
            isHovered ? borderHover : borderDefault,
            isHovered ? borderHover : borderDefault,
            isHovered ? borderSelectedHover : borderSelected,
            isHovered ? borderSelectedHover : borderSelected,
          ],
          extrapolate: 'clamp',
        }),
      }}
    >
      <animated.svg
        className={styles.thumb}
        viewBox="0 0 24 24"
        preserveAspectRatio="xMidYMin meet"
        style={{
          left: state.to(
            reducedMotion.enabled
              ? { range: COLOR_RANGE, output: [1, 1, 24, 24] }
              : { range: THUMB_POSITION_RANGE, output: [1, 1, 1, 24, 24, 24] },
          ),
        }}
        aria-hidden
      >
        <animated.rect
          fill={state.to({ range: COLOR_RANGE, output: [thumbDefault, thumbDefault, thumbSelected, thumbSelected] })}
          x={reducedMotion.enabled ? 4 : thumbShape([4, 4, 2.5, 1, 2.5, 4])}
          y={reducedMotion.enabled ? 4 : thumbShape([4, 7, 2.5, 7, 2.5, 4])}
          width={reducedMotion.enabled ? 16 : thumbShape([16, 16, 19, 22, 19, 16])}
          height={reducedMotion.enabled ? 16 : thumbShape([16, 10, 19, 10, 19, 16])}
          rx={reducedMotion.enabled ? 8 : thumbShape([8, 5, 9.5, 5, 9.5, 8])}
        />
        {icon}
      </animated.svg>
    </animated.div>
  );

  if (displayOnly) {
    return (
      <div className={styles.container} data-disabled={disabled || undefined}>
        {indicator}
      </div>
    );
  }

  return (
    <FocusRing {...focusProps} ringTarget={indicatorRef} focusTarget={inputRef} within offset={-2}>
      <label {...labelProps} className={styles.container} data-disabled={disabled || undefined}>
        {indicator}
        <HiddenVisually>
          <input {...inputProps} ref={inputRef} />
        </HiddenVisually>
      </label>
    </FocusRing>
  );
};

SwitchControl.displayName = 'SwitchControl';
