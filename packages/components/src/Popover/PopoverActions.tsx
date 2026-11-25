import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import styles from './Popover.module.css';

export const PopoverActions = ({ actions, className }: { actions: ButtonProps[]; className?: string }) => (
  <div className={clsx(styles.actionBar, className)}>
    <ButtonGroup size="sm" fullWidth direction="vertical">
      {actions.map((action, index) => (
        // Actions are positional.
        <Button key={index} {...action} />
      ))}
    </ButtonGroup>
  </div>
);

PopoverActions.displayName = 'PopoverActions';
