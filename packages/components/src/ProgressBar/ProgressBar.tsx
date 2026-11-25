import clsx from 'clsx';
import { ProgressBar as AriaProgressBar } from 'react-aria-components';
import styles from './ProgressBar.module.css';

export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  isIndeterminate?: boolean;
  valueLabel?: string;
  formatOptions?: Intl.NumberFormatOptions;
  size?: ProgressBarSize;
  animate?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const ProgressBar = ({
  value,
  minValue = 0,
  maxValue = 100,
  isIndeterminate,
  valueLabel,
  formatOptions,
  size = 'lg',
  animate = true,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: ProgressBarProps) => (
  <AriaProgressBar
    value={value}
    minValue={minValue}
    maxValue={maxValue}
    isIndeterminate={isIndeterminate}
    valueLabel={valueLabel}
    formatOptions={formatOptions}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    className={clsx(styles.track, styles[size], className)}
  >
    {({ percentage }) =>
      isIndeterminate ? (
        <>
          <div
            className={clsx(styles.indeterminateBar1, styles.indeterminate, styles[size], animate && styles.animating)}
          />
          <div
            className={clsx(styles.indeterminateBar2, styles.indeterminate, styles[size], animate && styles.animating)}
          />
        </>
      ) : (
        <div
          className={clsx(styles.fill, styles[size], animate && styles.animating)}
          style={{ transform: `translate3d(${(percentage ?? 0) - 100}%, 0, 0)` }}
        />
      )
    }
  </AriaProgressBar>
);

ProgressBar.displayName = 'ProgressBar';
