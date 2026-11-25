import { PauseIcon, PlayIcon } from '@discord-components/icons';
import { Button, type ButtonProps } from '../Button';
import { useManaContext } from '../ManaContext';

export interface PlayPauseButtonProps extends Omit<ButtonProps, 'icon' | 'variant' | 'fullWidth' | 'rounded'> {
  playing: boolean;
}

// A round overlay button that toggles between play and pause.
export const PlayPauseButton = ({ 'aria-label': ariaLabel, playing, ...props }: PlayPauseButtonProps) => {
  const { i18n } = useManaContext();
  return (
    <Button
      {...props}
      aria-label={ariaLabel ?? (playing ? i18n.PAUSE_BUTTON_LABEL : i18n.PLAY_BUTTON_LABEL)}
      icon={playing ? PauseIcon : PlayIcon}
      variant="overlay-secondary"
      fullWidth={false}
      rounded
    />
  );
};

PlayPauseButton.displayName = 'PlayPauseButton';
