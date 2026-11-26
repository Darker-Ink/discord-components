import {
  Button,
  LoadingDots,
  popToast,
  showToast,
  Spinner,
  SpinnerTypes,
  Stack,
  Text,
  tokens,
  type ToastPosition,
  type ToastVariant,
} from '@discord-mana/components';
import { CircleInformationIcon, CopyIcon, StarIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';
import { keyOptions, valueOptions } from './shared';

interface SpinnerStoryProps {
  type: keyof typeof SpinnerTypes;
  animated: boolean;
}

const SpinnerStory = ({ type, animated }: SpinnerStoryProps) => (
  <Spinner type={SpinnerTypes[type]} animated={animated} />
);

SpinnerStory.displayName = 'SpinnerStory';

const AllSpinnersStory = ({ animated }: { animated: boolean }) => (
  <Stack gap={24}>
    {Object.entries(SpinnerTypes).map(([name, type]) => (
      <Stack key={type} direction="horizontal" gap={16} align="center">
        <Text variant="body-sm/medium" color="text-subtle" style={{ width: 200 }}>
          {name}
        </Text>
        <Spinner type={type} animated={animated} />
      </Stack>
    ))}
  </Stack>
);

AllSpinnersStory.displayName = 'AllSpinnersStory';

interface LoadingDotsStoryProps {
  dotRadius: number;
  hide: boolean;
  themed: boolean;
}

const LoadingDotsStory = (props: LoadingDotsStoryProps) => (
  <div style={{ padding: 16, background: props.themed ? undefined : 'var(--background-brand)', borderRadius: 8 }}>
    <LoadingDots {...props} />
  </div>
);

LoadingDotsStory.displayName = 'LoadingDotsStory';

const TOAST_ICONS = { none: undefined, information: CircleInformationIcon, star: StarIcon, copy: CopyIcon };

interface ShowToastStoryProps {
  text: string;
  variant: ToastVariant;
  icon: keyof typeof TOAST_ICONS;
  brandIcon: boolean;
  position: ToastPosition;
  duration: number;
}

// Toasts show in the app's toast container (top of the window by default), one at a time per surface.
const ShowToastStory = ({ text, variant, icon, brandIcon, position, duration }: ShowToastStoryProps) => {
  const show = () =>
    showToast({
      text,
      variant,
      icon: TOAST_ICONS[icon],
      iconColor: brandIcon ? tokens.colors.ICON_BRAND : undefined,
      position,
      duration,
    });
  return (
    <Stack gap={16} align="start">
      <Stack direction="horizontal" gap={8} fullWidth={false} wrap>
        <Button text="Show toast" onClick={show} />
        <Button
          variant="secondary"
          text="Queue three toasts"
          onClick={() => {
            for (const index of [1, 2, 3]) showToast({ text: `${text} (${index})`, variant, position, duration });
          }}
        />
        <Button variant="secondary" text="Pop toast" onClick={() => popToast()} />
      </Stack>
      <Stack direction="horizontal" gap={8} fullWidth={false} wrap>
        <Button
          variant="secondary"
          text="Copied playground link"
          onClick={() => showToast({ text: 'Copied playground link', variant: 'success', position, duration })}
        />
        <Button
          variant="secondary"
          text="Something went wrong"
          onClick={() =>
            showToast({ text: 'Something went wrong. Try again.', variant: 'critical', position, duration })
          }
        />
      </Stack>
    </Stack>
  );
};

ShowToastStory.displayName = 'ShowToastStory';

const feedback: StoryGroup = {
  title: 'Feedback',
  stories: [
    {
      name: 'Spinner',
      id: 'spinner',
      component: SpinnerStory,
      controls: {
        type: { label: 'Type', type: 'select', defaultValue: 'WANDERING_CUBES', options: keyOptions(SpinnerTypes) },
        animated: { label: 'Animated', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'All Spinners',
      id: 'spinner-all',
      component: AllSpinnersStory,
      controls: { animated: { label: 'Animated', type: 'boolean', defaultValue: true } },
    },
    {
      name: 'LoadingDots',
      id: 'loading-dots',
      component: LoadingDotsStory,
      controls: {
        dotRadius: { label: 'Dot Radius', type: 'slider', defaultValue: 3.5, minValue: 1, maxValue: 10 },
        hide: { label: 'Hide', type: 'boolean', defaultValue: false },
        themed: { label: 'Themed', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'showToast',
      id: 'show-toast',
      component: ShowToastStory,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'This is a toast message' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'default',
          options: valueOptions(['default', 'success', 'critical']),
        },
        icon: { label: 'Icon', type: 'select', defaultValue: 'none', options: keyOptions(TOAST_ICONS) },
        brandIcon: { label: 'Brand Icon Color', type: 'boolean', defaultValue: false },
        position: { label: 'Position', type: 'select', defaultValue: 'top', options: valueOptions(['top', 'bottom']) },
        duration: { label: 'Duration (ms)', type: 'number', defaultValue: 3000 },
      },
    },
  ],
};

export default feedback;
