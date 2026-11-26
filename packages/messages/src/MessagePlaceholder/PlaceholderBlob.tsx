import { useState } from 'react';
import clsx from 'clsx';
import styles from './MessagePlaceholder.module.css';

const toRem = (px: number) => `${px / 16}rem`;

export interface PlaceholderBlobProps {
  width: number;
  height?: number;
  /** Random between 0.02 and 0.08 when left out, like the client's loading placeholders. */
  opacity?: number;
  className?: string;
}

/** A grey rounded bar standing in for text while content loads (or stays hidden). */
export const PlaceholderBlob = ({ width, height, opacity, className }: PlaceholderBlobProps) => {
  const [randomOpacity] = useState(() => 0.02 + Math.random() * 0.06);
  return (
    <div
      className={clsx(className, { [styles.blob]: true })}
      style={{
        width: toRem(width),
        opacity: opacity ?? randomOpacity,
        ...(height != null ? { height: toRem(height) } : {}),
      }}
    />
  );
};

PlaceholderBlob.displayName = 'PlaceholderBlob';
