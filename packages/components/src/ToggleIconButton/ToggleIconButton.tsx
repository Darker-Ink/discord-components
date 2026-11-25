import { useRef, type ButtonHTMLAttributes, type RefObject } from 'react';
import clsx from 'clsx';
import { ButtonIcon, type ButtonIconSource, type ButtonSize } from '../Button';
import buttonStyles from '../Button/Button.module.css';
import toggleStyles from '../Button/ToggleButton.module.css';
import { FocusRing, type FocusRingProps } from '../FocusRing';
import styles from './ToggleIconButton.module.css';

export type ToggleIconButtonVariant = 'default' | 'critical' | 'icon-only';

const VARIANT_CLASS_NAMES: Record<ToggleIconButtonVariant, string> = {
  default: clsx(toggleStyles.standard, toggleStyles.toggleButton),
  critical: clsx(toggleStyles.critical, toggleStyles.toggleButton),
  'icon-only': clsx(toggleStyles.iconOnly, toggleStyles.toggleButton),
};

export interface ToggleIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  type?: 'button' | 'submit' | 'reset';
  size?: ButtonSize;
  variant?: ToggleIconButtonVariant;
  icon: ButtonIconSource;
  /** Shown instead of `icon` while pressed. */
  selectedIcon?: ButtonIconSource;
  iconOpticalOffsetMargin?: number;
  focusProps?: FocusRingProps;
  pressed?: boolean;
  'aria-label': string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}

export const ToggleIconButton = ({
  type = 'button',
  size = 'md',
  variant = 'default',
  icon,
  selectedIcon,
  iconOpticalOffsetMargin = 0,
  focusProps,
  pressed = false,
  'aria-label': ariaLabel,
  buttonRef,
  disabled,
  // Like Button, the toggle can't be restyled from outside.
  className: _className,
  style: _style,
  ...props
}: ToggleIconButtonProps) => {
  const ownRef = useRef<HTMLButtonElement>(null);
  const ref = buttonRef ?? ownRef;
  return (
    <FocusRing {...focusProps}>
      <button
        data-mana-component="toggle-icon-button"
        type={type}
        aria-pressed={pressed}
        className={clsx(buttonStyles.button, styles.button, VARIANT_CLASS_NAMES[variant], buttonStyles[size])}
        aria-label={ariaLabel}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        <div className={buttonStyles.buttonChildrenWrapper}>
          <ButtonIcon
            icon={pressed && selectedIcon != null ? selectedIcon : icon}
            iconOpticalOffsetMargin={iconOpticalOffsetMargin}
            iconPosition="start"
            size={size}
            ref={ref}
            disabled={disabled}
          />
        </div>
      </button>
    </FocusRing>
  );
};

ToggleIconButton.displayName = 'ToggleIconButton';
