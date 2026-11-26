import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Modal.module.css';

// Content between the body and the action bar (a modal's `preview`).
export const ModalFooter = ({ children }: { children?: ReactNode }) =>
  children == null ? null : <footer className={clsx(styles.footer, styles.section)}>{children}</footer>;

ModalFooter.displayName = 'ModalFooter';
