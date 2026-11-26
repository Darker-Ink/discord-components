import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { H } from '@discord-components/components';
import styles from './FormTitle.module.css';

export type FormTitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'label' | 'legend';

export interface FormTitleProps extends HTMLAttributes<HTMLElement> {
  tag?: FormTitleTag;
  disabled?: boolean;
  required?: boolean;
  error?: ReactNode;
  errorId?: string;
  'data-migration-pending'?: boolean;
}

// Every tag but legend renders the heading for the surrounding heading level; `tag` only picks the style.
export const FormTitle = ({
  tag = 'h5',
  children,
  className,
  disabled,
  required = false,
  error,
  errorId,
  ...props
}: FormTitleProps) => {
  const Tag = tag === 'legend' ? 'legend' : H;
  return (
    <Tag
      className={clsx(styles[tag], tag !== 'h5' ? styles.defaultColor : null, className, {
        [styles[`defaultMargin${tag}`]]: className == null,
        [styles.disabled]: disabled,
        [styles.error]: error != null,
      })}
      {...props}
    >
      {children}
      {required && error == null ? <span className={styles.required}>*</span> : null}
      {error != null ? (
        <span id={errorId} className={styles.errorMessage}>
          {children != null ? <span className={styles.errorSeparator}>-</span> : null}
          {error}
        </span>
      ) : null}
    </Tag>
  );
};

FormTitle.displayName = 'FormTitle';
