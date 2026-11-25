import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { FocusRing, type FocusRingProps } from '../FocusRing';
import { Text, type TextVariant } from '../Text';
import styles from './TextButton.module.css';

export type TextButtonVariant = 'primary' | 'secondary' | 'always-white' | 'critical';

export interface TextButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  focusProps?: FocusRingProps;
  lineClamp?: number;
  text: ReactNode;
  textVariant?: TextVariant;
  type?: 'button' | 'submit' | 'reset';
  variant?: TextButtonVariant;
  buttonRef?: Ref<HTMLButtonElement>;
}

export const TextButton = ({
  focusProps,
  lineClamp = 1,
  role = 'button',
  text,
  textVariant = 'body-md/medium',
  type = 'button',
  variant = 'primary',
  buttonRef,
  // Like Button, text buttons can't be restyled from outside.
  className: _className,
  style: _style,
  ...props
}: TextButtonProps) => (
  <FocusRing {...focusProps}>
    <button
      className={clsx(styles.textButton, styles[variant])}
      data-mana-component="text-button"
      role={role}
      type={type}
      ref={buttonRef}
      {...props}
    >
      <Text tag="span" variant={textVariant} color="none" lineClamp={lineClamp} className={styles.text}>
        {text}
      </Text>
    </button>
  </FocusRing>
);

TextButton.displayName = 'TextButton';
