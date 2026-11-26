import type { ReactNode } from 'react';
import { Toolbar as AriaToolbar } from 'react-aria-components';
import styles from './Toolbar.module.css';

interface ToolbarLabelProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export interface ToolbarProps extends ToolbarLabelProps {
  children?: ReactNode;
}

export interface ToolbarGroupProps extends ToolbarLabelProps {
  children?: ReactNode;
}

const ToolbarGroup = ({ children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }: ToolbarGroupProps) => (
  <div
    role="group"
    data-mana-component="toolbar-group"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    className={styles.group}
  >
    {children}
  </div>
);

ToolbarGroup.displayName = 'Toolbar.Group';

const ToolbarSeparator = () => (
  <div
    role="separator"
    aria-orientation="vertical"
    data-mana-component="toolbar-separator"
    className={styles.separator}
  />
);

ToolbarSeparator.displayName = 'Toolbar.Separator';

const ToolbarRoot = ({ children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }: ToolbarProps) => (
  <AriaToolbar
    data-mana-component="toolbar"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    className={styles.toolbar}
  >
    {children}
  </AriaToolbar>
);

ToolbarRoot.displayName = 'Toolbar';

export const Toolbar = Object.assign(ToolbarRoot, { Group: ToolbarGroup, Separator: ToolbarSeparator });
