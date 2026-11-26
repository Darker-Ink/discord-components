import { useState } from 'react';
import {
  Countdown,
  type CountdownAppearance,
  type CountdownSize,
  type CountdownVariant,
} from '@discord-mana/components';

// About two days and four hours, the default end time of the countdown stories.
export const useEndsAt = (msFromNow = 189958e3) => {
  const [endsAt] = useState(() => new Date(Date.now() + msFromNow));
  return endsAt;
};

export interface CountdownExampleProps {
  endsAt: Date;
  appearance: CountdownAppearance;
  size?: CountdownSize;
  variant: CountdownVariant;
  showDays?: boolean;
  showSeconds?: boolean;
  showIcon?: boolean;
  onEnd?: () => void;
}

export const CountdownExample = ({
  endsAt,
  appearance,
  size,
  variant,
  showDays = false,
  showSeconds = false,
  showIcon = true,
  onEnd,
}: CountdownExampleProps) =>
  appearance === 'days-left' ? (
    <Countdown endsAt={endsAt} appearance="days-left" size={size} variant={variant} showIcon={showIcon} onEnd={onEnd} />
  ) : (
    <Countdown
      endsAt={endsAt}
      appearance="timer"
      size={size}
      variant={variant}
      showDays={showDays}
      showSeconds={showSeconds}
      showIcon={showIcon}
      onEnd={onEnd}
    />
  );

CountdownExample.displayName = 'CountdownExample';
