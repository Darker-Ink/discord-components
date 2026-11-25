import type { ElementType, HTMLAttributes, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import styles from './InputField.module.css';

export interface InputFieldValidation {
  hasError?: boolean;
}

export interface InputFieldProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: ElementType;
  readOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
  validation?: InputFieldValidation;
  /** Class of the inner box that draws the border. */
  className?: string;
  /** Class of the outer element. */
  containerClassName?: string;
  ref?: Ref<HTMLElement>;
}

/** The bordered box of a text-like input, with its hover, focus, error, read-only and disabled states. */
export const InputField = ({
  as: Tag = 'div',
  readOnly,
  disabled,
  fullWidth = false,
  children,
  validation,
  className,
  ref,
  containerClassName,
  ...props
}: InputFieldProps) => (
  <Tag ref={ref} className={clsx(styles.container, containerClassName)} data-full-width={fullWidth} {...props}>
    <div
      className={clsx(styles.wrapper, className)}
      data-error={validation?.hasError}
      data-read-only={readOnly}
      data-disabled={disabled}
    >
      {children}
    </div>
  </Tag>
);

InputField.displayName = 'InputField';
