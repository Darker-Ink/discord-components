import { useContext } from 'react';
import { CloseButton } from '../CloseButton';
import { DialogContext } from '../Dialog';
import { useManaContext } from '../ManaContext';
import type { ButtonVariant } from '../Button';
import styles from './Popover.module.css';

export interface PopoverCloseButtonProps {
  onClick?: () => void;
  'aria-label'?: string;
  variant?: ButtonVariant;
}

export const PopoverCloseButton = ({ onClick, 'aria-label': ariaLabel, variant }: PopoverCloseButtonProps) => {
  const { i18n } = useManaContext();
  const { firstFocusableItemProps } = useContext(DialogContext);
  return (
    <div className={styles.closeButton}>
      <CloseButton
        size="sm"
        aria-label={ariaLabel ?? i18n.CLOSE_BUTTON_LABEL}
        onClick={onClick}
        variant={variant}
        {...firstFocusableItemProps}
      />
    </div>
  );
};

PopoverCloseButton.displayName = 'PopoverCloseButton';
