import clsx from 'clsx';
import { useHeadingLevel } from '../HeadingLevel';
import { Text, type TextProps } from '../Text';
import styles from './Heading.module.css';

export type HeadingProps = Omit<TextProps, 'tag'>;

// Text rendered as the heading element (h1–h6) for the current HeadingLevel.
export const Heading = ({ variant, className, ref, ...props }: HeadingProps) => {
  const level = useHeadingLevel();
  return (
    <Text
      ref={ref}
      variant={variant}
      tag={`h${Math.min(level, 6)}` as 'h1'}
      className={clsx(styles.defaultColor, className)}
      {...(level > 6 ? { 'data-excessive-heading-level': level } : {})}
      {...props}
    />
  );
};

Heading.displayName = 'Heading';
