import type { ElementType, HTMLAttributes, Ref } from 'react';
import clsx from 'clsx';
import styles from './HiddenVisually.module.css';

export interface HiddenVisuallyProps extends HTMLAttributes<HTMLElement> {
  tag?: ElementType;
  // Become visible while the element or something inside it has focus (skip links).
  showOnFocus?: boolean;
  ref?: Ref<HTMLElement>;
}

export const HiddenVisually = ({ tag: Tag = 'span', showOnFocus, className, ...props }: HiddenVisuallyProps) => (
  <Tag
    {...props}
    className={clsx({ [styles.hiddenVisually]: !showOnFocus, [styles.showOnFocus]: showOnFocus }, className)}
  />
);

HiddenVisually.displayName = 'HiddenVisually';
