import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './GifTag.module.css';

/** The "GIF" badge shown on animated images that aren't playing. */
export const GifTag = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx(styles.gifTag, className)} {...rest} />
);

GifTag.displayName = 'GifTag';
