import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Hamburger.module.css';

export interface HamburgerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  open?: boolean;
}

// The animated three-line menu button mobile web shows to open the sidebar.
export const Hamburger = ({ open = false, className, ...props }: HamburgerProps) => (
  <button
    type="button"
    className={clsx(styles.btnHamburger, { [styles.btnHamburgerOpen]: open }, className)}
    {...props}
  >
    <span />
    <span />
    <span />
    <span />
    <span />
    <span />
  </button>
);

Hamburger.displayName = 'Hamburger';
