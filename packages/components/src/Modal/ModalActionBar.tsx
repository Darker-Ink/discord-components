import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { Checkbox, type CheckboxProps } from '../Checkbox';
import { useManaContext } from '../ManaContext';
import styles from './Modal.module.css';

export type ModalAction = ButtonProps;

export type ModalActionBarLayout = 'default' | 'chat-input';

export interface ModalActionBarProps {
  // Shown before the actions (e.g. a "don't show again" checkbox).
  leading?: ReactNode;
  actions?: ModalAction[];
  actionsFullWidth?: boolean;
  leadingLayout?: ModalActionBarLayout;
}

const PRIMARY_VARIANTS: readonly string[] = ['primary', 'critical-primary', 'expressive'];

// The modal's buttons. The last primary-looking action gets focus when the modal opens.
export const ModalActionBar = ({
  leading,
  actions = [],
  actionsFullWidth = false,
  leadingLayout = 'default',
}: ModalActionBarProps) => {
  if (leading == null && actions.length < 1) return null;
  const autoFocusIndex = actions.findLastIndex(
    (action) => action.variant != null && PRIMARY_VARIANTS.includes(action.variant),
  );
  return (
    <footer
      className={clsx(styles.actionBar, styles.section, {
        [styles.actionBarLayoutChatInput]: leadingLayout === 'chat-input',
      })}
    >
      {leading != null && <div className={styles.actionBarLeading}>{leading}</div>}
      <div className={clsx(styles.actionBarTrailing, { [styles.actionBarTrailingFullWidth]: actionsFullWidth })}>
        <ButtonGroup fullWidth={actionsFullWidth}>
          {actions?.map((action, index) => (
            <Button key={index} autoFocus={action.autoFocus ?? autoFocusIndex === index} {...action} />
          ))}
        </ButtonGroup>
      </div>
    </footer>
  );
};

ModalActionBar.displayName = 'ModalActionBar';

export type ModalActionBarCheckboxProps = CheckboxProps;

// A checkbox for the action bar's leading slot, labeled "Don't show again" by default.
export const ModalActionBarCheckbox = ({ label, ...props }: ModalActionBarCheckboxProps) => {
  const { i18n } = useManaContext();
  return (
    <div className={styles.actionBarCheckbox}>
      <Checkbox {...props} label={label ?? i18n.MODAL_DONT_SHOW_AGAIN} labelType="secondary" />
    </div>
  );
};

ModalActionBarCheckbox.displayName = 'ModalActionBarCheckbox';
