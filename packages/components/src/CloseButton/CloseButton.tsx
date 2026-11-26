import { XLargeIcon } from '@discord-mana/icons';
import { Button, type ButtonProps } from '../Button';
import { useManaContext } from '../ManaContext';

export type CloseButtonProps = Omit<ButtonProps, 'icon' | 'text' | 'fullWidth'>;

// An icon-only button with an X, labelled "Close" unless given another label.
export const CloseButton = ({ variant = 'icon-only', 'aria-label': ariaLabel, ...props }: CloseButtonProps) => {
  const { i18n } = useManaContext();
  return (
    <Button
      {...props}
      aria-label={ariaLabel ?? i18n.CLOSE_BUTTON_LABEL}
      icon={XLargeIcon}
      variant={variant}
      text={undefined}
      fullWidth={false}
    />
  );
};

CloseButton.displayName = 'CloseButton';
