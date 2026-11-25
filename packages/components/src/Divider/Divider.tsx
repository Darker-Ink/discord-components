import clsx from 'clsx';
import styles from './Divider.module.css';

export interface DividerProps {
  className?: string;
  /** Margin above and below, in pixels or any CSS length. */
  gap?: number | string;
}

export const Divider = ({ className, gap }: DividerProps) => (
  <div className={clsx(styles.divider, className)} style={{ marginTop: gap, marginBottom: gap }} />
);

Divider.displayName = 'Divider';
