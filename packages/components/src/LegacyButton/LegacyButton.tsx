import {
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { FocusRing, type FocusRingProps } from '../FocusRing';
import { Spinner, SpinnerTypes } from '../Spinner';
import underlineStyles from './LinkUnderline.module.css';
import styles from './LegacyButton.module.css';

// Discord's pre-Mana button. Looks, colors and sizes are class names that compose on the button.
export const ButtonLooks = {
  FILLED: styles.lookFilled,
  OUTLINED: styles.lookOutlined,
  LINK: clsx(styles.lookLink, underlineStyles.lowSaturationUnderline),
  BLANK: styles.lookBlank,
} as const;

export const ButtonColors = {
  BRAND: styles.colorBrand,
  BRAND_INVERTED: styles.colorBrandInverted,
  RED: styles.colorRed,
  GREEN: styles.colorGreen,
  PRIMARY: styles.colorPrimary,
  LINK: styles.colorLink,
  WHITE: styles.colorWhite,
  TRANSPARENT: styles.colorTransparent,
  CUSTOM: '',
} as const;

export const ButtonSizes = {
  NONE: '',
  TINY: styles.sizeTiny,
  SMALL: styles.sizeSmall,
  MEDIUM: styles.sizeMedium,
  LARGE: styles.sizeLarge,
  MIN: styles.sizeMin,
  MAX: styles.sizeMax,
  ICON: styles.sizeIcon,
} as const;

export type ButtonLook = (typeof ButtonLooks)[keyof typeof ButtonLooks];
export type ButtonColor = (typeof ButtonColors)[keyof typeof ButtonColors];
export type ButtonSizeClass = (typeof ButtonSizes)[keyof typeof ButtonSizes];

// The client's English strings for the submitting announcements.
const SUBMITTING_STARTED_LABEL = 'Loading';
const SUBMITTING_FINISHED_LABEL = 'Loading finished';

export interface LegacyButtonStyleOptions {
  look?: ButtonLook;
  color?: ButtonColor;
  size?: ButtonSizeClass;
  fullWidth?: boolean;
  grow?: boolean;
  submitting?: boolean;
  disabled?: boolean;
}

export const getButtonStyle = ({
  look = ButtonLooks.FILLED,
  color = ButtonColors.BRAND,
  size = ButtonSizes.MEDIUM,
  fullWidth = false,
  grow = true,
  submitting = false,
  disabled = false,
}: LegacyButtonStyleOptions = {}) =>
  clsx(styles.button, look, color, size, {
    [styles.fullWidth]: fullWidth,
    [styles.grow]: grow,
    [styles.submitting]: submitting && !disabled,
  });

export interface LegacyButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'type'> {
  look?: ButtonLook;
  color?: ButtonColor;
  size?: ButtonSizeClass;
  fullWidth?: boolean;
  grow?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  wrapperClassName?: string;
  className?: string;
  innerClassName?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onDoubleClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
  onMouseUp?: MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  children?: ReactNode;
  rel?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  focusProps?: FocusRingProps;
  'aria-label'?: string;
  submittingStartedLabel?: string;
  submittingFinishedLabel?: string;
}

type FocusRingOffset = FocusRingProps['offset'];

// Filled and outlined buttons draw their ring 2px outside the border.
const getRingOffset = (look: ButtonLook, offset: FocusRingOffset): FocusRingOffset => {
  if (look === ButtonLooks.LINK || look === ButtonLooks.BLANK) return offset;
  if (offset == null) return -2;
  if (typeof offset === 'number') return offset + 2;
  return {
    top: (offset.top ?? 0) - 2,
    right: (offset.right ?? 0) - 2,
    bottom: (offset.bottom ?? 0) - 2,
    left: (offset.left ?? 0) - 2,
  };
};

const preventDefault = (event: { preventDefault: () => void }) => event.preventDefault();

export const LegacyButton = ({
  look = ButtonLooks.FILLED,
  color = ButtonColors.BRAND,
  size = ButtonSizes.MEDIUM,
  fullWidth = false,
  grow = true,
  disabled = false,
  submitting = false,
  type = 'button',
  style,
  wrapperClassName,
  className,
  innerClassName,
  onClick,
  onDoubleClick,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onKeyDown,
  children,
  rel,
  buttonRef,
  focusProps,
  'aria-label': ariaLabel,
  submittingStartedLabel,
  submittingFinishedLabel,
  ...rest
}: LegacyButtonProps) => {
  const inactive = disabled || submitting;
  // A disabled button gets no mouse events, so hover handlers move to an overlay on a wrapper.
  const wrapped = inactive && (onMouseEnter != null || onMouseLeave != null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (submitting === true) {
      wasSubmitting.current = true;
      AccessibilityAnnouncer.announce(submittingStartedLabel ?? SUBMITTING_STARTED_LABEL);
    }
    if (submitting === false && wasSubmitting.current === true) {
      AccessibilityAnnouncer.announce(submittingFinishedLabel ?? SUBMITTING_FINISHED_LABEL);
    }
  }, [submitting, submittingStartedLabel, submittingFinishedLabel]);

  const button = (
    <FocusRing {...focusProps} offset={getRingOffset(look, focusProps?.offset)}>
      <button
        {...(inactive ? null : rest)}
        aria-label={ariaLabel}
        aria-busy={submitting ? true : undefined}
        ref={buttonRef}
        onClick={inactive ? preventDefault : onClick}
        onDoubleClick={inactive ? preventDefault : onDoubleClick}
        onMouseUp={disabled ? undefined : onMouseUp}
        onMouseDown={disabled ? undefined : onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onKeyDown={disabled ? undefined : onKeyDown}
        type={type}
        disabled={disabled}
        style={style}
        rel={rel}
        className={clsx(
          className,
          getButtonStyle({ look, color, size, fullWidth, grow, submitting, disabled }),
          wrapped ? null : wrapperClassName,
        )}
      >
        {submitting && !disabled ? (
          <Spinner type={SpinnerTypes.PULSING_ELLIPSIS} className={styles.spinner} itemClassName={styles.spinnerItem} />
        ) : null}
        <div className={clsx(styles.contents, innerClassName)}>{children}</div>
      </button>
    </FocusRing>
  );

  if (!wrapped) return button;
  return (
    <span
      className={clsx(styles.disabledButtonWrapper, wrapperClassName, size, {
        [styles.grow]: grow,
        [styles.fullWidth]: fullWidth,
      })}
    >
      {button}
      <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={styles.disabledButtonOverlay} />
    </span>
  );
};

LegacyButton.displayName = 'LegacyButton';

export interface LegacyButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'color'> {
  look?: ButtonLook;
  color?: ButtonColor;
  size?: ButtonSizeClass;
  fullWidth?: boolean;
  grow?: boolean;
  innerClassName?: string;
  // Discord routes this through its router's Link; here it becomes the anchor's href.
  to: string;
}

const LegacyButtonLink = ({
  look = ButtonLooks.FILLED,
  color = ButtonColors.BRAND,
  size = ButtonSizes.MEDIUM,
  fullWidth = false,
  grow = true,
  style,
  className,
  innerClassName,
  to,
  onClick,
  onMouseDown,
  onMouseUp,
  children,
  rel,
  ...rest
}: LegacyButtonLinkProps) => (
  <a
    {...rest}
    href={to}
    onClick={onClick}
    onMouseUp={onMouseUp}
    onMouseDown={onMouseDown}
    style={style}
    rel={rel}
    className={clsx(className, styles.button, look, color, size, {
      [styles.fullWidth]: fullWidth,
      [styles.grow]: grow,
    })}
  >
    <span className={clsx(styles.contents, innerClassName)}>{children}</span>
  </a>
);

LegacyButtonLink.displayName = 'LegacyButton.Link';

LegacyButton.Looks = ButtonLooks;
LegacyButton.Colors = ButtonColors;
LegacyButton.Sizes = ButtonSizes;
LegacyButton.Link = LegacyButtonLink;
