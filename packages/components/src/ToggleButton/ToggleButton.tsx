import { Button, type ButtonProps } from '../Button';

export interface ToggleButtonProps extends Omit<ButtonProps, 'variant'> {
  pressed?: boolean;
}

export const ToggleButton = ({ pressed, ...props }: ToggleButtonProps) => (
  <Button {...props} data-mana-component="toggle-button" role="button" aria-pressed={pressed} variant="togglebutton" />
);

ToggleButton.displayName = 'ToggleButton';
