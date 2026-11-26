import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Text } from '@discord-mana/components';
import styles from './FormText.module.css';

export const FormTextTypes = {
  DEFAULT: 'default',
  DESCRIPTION: 'description',
} as const;

export type FormTextType = (typeof FormTextTypes)[keyof typeof FormTextTypes];

export interface FormTextProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  type?: FormTextType;
  disabled?: boolean;
  'data-migration-pending'?: boolean;
}

export const FormText = ({
  type = FormTextTypes.DEFAULT,
  className,
  disabled,
  children,
  style,
  ...props
}: FormTextProps) => (
  <Text
    variant="body-sm/normal"
    className={clsx(styles[type], className, disabled ? styles.modeDisabled : styles.modeDefault)}
    style={style}
    {...props}
  >
    {children}
  </Text>
);

FormText.displayName = 'FormText';
FormText.Types = FormTextTypes;
