import { Button, type ButtonProps } from '../Button';

export type IconButtonProps = Omit<ButtonProps, 'text' | 'fullWidth'>;

export const IconButton = (props: IconButtonProps) => <Button {...props} text={undefined} fullWidth={false} />;

IconButton.displayName = 'IconButton';
