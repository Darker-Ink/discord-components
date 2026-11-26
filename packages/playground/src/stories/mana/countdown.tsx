import { useState, type ReactNode } from 'react';
import {
  Badge,
  Stack,
  Text,
  type CountdownAppearance,
  type CountdownSize,
  type CountdownVariant,
} from '@discord-mana/components';
import type { Controls, StoryGroup } from '../../types';
import { CountdownExample, useEndsAt } from './shared/countdownExamples';
import styles from './countdown.module.css';

const END_TIMES = [
  { label: '3 days', value: '3-days', ms: 2592e5 },
  { label: '1 day', value: '1-day', ms: 864e5 },
  { label: '5 hours', value: '5-hours', ms: 18e6 },
  { label: '10 minutes', value: '10-minutes', ms: 6e5 },
  { label: '10 seconds, to see onEnd', value: '10-seconds', ms: 1e4 },
];

const APPEARANCES: { label: string; value: CountdownAppearance }[] = [
  { label: 'Timer', value: 'timer' },
  { label: 'Days left', value: 'days-left' },
];

const SIZES: { label: string; value: CountdownSize }[] = [
  { label: 'md (large promotions)', value: 'md' },
  { label: 'sm (badge size)', value: 'sm' },
];

const VARIANTS: { label: string; value: CountdownVariant }[] = [
  { label: 'Overlay secondary', value: 'overlay-secondary' },
  { label: 'Overlay primary', value: 'overlay-primary' },
];

const Label = ({ children, onBackdrop = false }: { children: ReactNode; onBackdrop?: boolean }) => (
  <Text
    variant="body-xs/normal"
    color={onBackdrop ? 'none' : 'text-muted'}
    className={onBackdrop ? styles.label : undefined}
  >
    {children}
  </Text>
);

Label.displayName = 'Label';

interface CountdownStoryProps {
  appearance: CountdownAppearance;
  size: CountdownSize;
  variant: CountdownVariant;
  showDays: boolean;
  showSeconds: boolean;
  showIcon: boolean;
  endTime: string;
}

const LiveCountdown = ({ endTime, ...props }: CountdownStoryProps) => {
  const endsAt = useEndsAt(END_TIMES.find(({ value }) => value === endTime)?.ms ?? 864e5);
  const [endCalls, setEndCalls] = useState<string[]>([]);
  return (
    <Stack gap={8}>
      <Stack direction="horizontal" align="center">
        <CountdownExample
          endsAt={endsAt}
          onEnd={() => setEndCalls((calls) => [...calls, new Date().toLocaleTimeString()])}
          {...props}
        />
      </Stack>
      <Text variant="body-xs/normal" color="text-muted">
        {endCalls.length === 0 ? 'onEnd: not called yet' : `onEnd called at ${endCalls.join(', ')}`}
      </Text>
    </Stack>
  );
};

LiveCountdown.displayName = 'LiveCountdown';

const CountdownStory = (props: CountdownStoryProps) => (
  <Stack gap={16}>
    <LiveCountdown key={props.endTime} {...props} />
  </Stack>
);

CountdownStory.displayName = 'CountdownStory';

const CountdownVariantsStory = () => {
  const endsAt = useEndsAt(2763e5);
  return (
    <Stack gap={24}>
      <div className={styles.backdrop}>
        <Stack gap={16}>
          {APPEARANCES.flatMap((appearance) =>
            SIZES.map((size) => (
              <Stack key={`${appearance.value}-${size.value}`} gap={8}>
                <Label onBackdrop>{`${appearance.label}, ${size.label}`}</Label>
                <Stack direction="horizontal" gap={12} align="center">
                  {VARIANTS.map((variant) => (
                    <CountdownExample
                      key={variant.value}
                      endsAt={endsAt}
                      appearance={appearance.value}
                      size={size.value}
                      variant={variant.value}
                    />
                  ))}
                  {appearance.value === 'timer'
                    ? VARIANTS.map((variant) => (
                        <CountdownExample
                          key={`${variant.value}-full`}
                          endsAt={endsAt}
                          appearance="timer"
                          size={size.value}
                          variant={variant.value}
                          showDays
                          showSeconds
                        />
                      ))
                    : null}
                  {VARIANTS.map((variant) => (
                    <CountdownExample
                      key={`${variant.value}-no-icon`}
                      endsAt={endsAt}
                      appearance={appearance.value}
                      size={size.value}
                      variant={variant.value}
                      showIcon={false}
                    />
                  ))}
                </Stack>
              </Stack>
            )),
          )}
        </Stack>
      </div>
      <Stack gap={8}>
        <Label>sm next to a Badge, in a Shop listing</Label>
        {APPEARANCES.map((appearance) => (
          <Stack key={appearance.value} direction="horizontal" gap={8} align="center">
            <Text variant="body-md/semibold" color="text-strong">
              Winter Bundle
            </Text>
            <Badge type="new" variant="secondary" />
            <CountdownExample endsAt={endsAt} appearance={appearance.value} size="sm" variant="overlay-secondary" />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

CountdownVariantsStory.displayName = 'CountdownVariantsStory';

const isTimer = (props: Record<string, unknown>) => props.appearance === 'timer';

const controls: Controls = {
  appearance: { label: 'Appearance', type: 'select', defaultValue: 'timer', options: APPEARANCES },
  size: { label: 'Size', type: 'select', defaultValue: 'md', options: SIZES },
  variant: { label: 'Color', type: 'select', defaultValue: 'overlay-secondary', options: VARIANTS },
  showDays: {
    label: 'Show days',
    hint: 'Splits days out of the hours, for offers longer than a day.',
    type: 'boolean',
    defaultValue: false,
    isVisible: isTimer,
  },
  showSeconds: { label: 'Show seconds', type: 'boolean', defaultValue: false, isVisible: isTimer },
  showIcon: {
    label: 'Show icon',
    hint: 'Hide it when a clock or timer icon is already beside it.',
    type: 'boolean',
    defaultValue: true,
  },
  endTime: {
    label: 'Ends in',
    type: 'select',
    defaultValue: '3-days',
    options: END_TIMES.map(({ label, value }) => ({ label, value })),
  },
};

const countdown: StoryGroup = {
  title: 'Countdown',
  stories: [
    { name: 'Countdown', id: 'countdown', component: CountdownStory, controls },
    {
      name: 'Appearances, sizes, and colors',
      id: 'countdown-variants',
      component: CountdownVariantsStory,
      controls: {},
    },
  ],
};

export default countdown;
