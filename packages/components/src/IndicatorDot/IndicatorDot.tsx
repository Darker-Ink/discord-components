import type { Ref } from 'react';
import clsx from 'clsx';
import styles from './IndicatorDot.module.css';

export const IndicatorDotVariants = ['primary', 'notification', 'neutral', 'active'] as const;
export type IndicatorDotVariant = (typeof IndicatorDotVariants)[number];

export const IndicatorDotSizes = ['xs', 'sm', 'md', 'lg'] as const;
export type IndicatorDotSize = (typeof IndicatorDotSizes)[number];

export type IndicatorDotCutout = 'base-lower';

export interface IndicatorDotProps {
  variant?: IndicatorDotVariant;
  size?: IndicatorDotSize;
  /** Rings the dot in the given background color, to separate it from what it overlaps. */
  cutout?: IndicatorDotCutout;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
  /** Makes the dot an image with this label; without it the dot is hidden from assistive technology. */
  'aria-label'?: string;
}

export const IndicatorDot = ({
  variant = 'primary',
  size = 'md',
  cutout,
  className,
  ref,
  'aria-label': ariaLabel,
}: IndicatorDotProps) => {
  const labelled = ariaLabel != null;
  return (
    <span
      ref={ref}
      className={clsx(
        className,
        styles.indicatorDot,
        styles[variant],
        styles[size],
        cutout != null && styles[`cutout-${cutout}`],
      )}
      role={labelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={!labelled || undefined}
    />
  );
};

IndicatorDot.displayName = 'IndicatorDot';
