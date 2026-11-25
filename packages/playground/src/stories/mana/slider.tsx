import { useState } from 'react';
import { Slider, Stack, Text } from '@discord-components/components';
import type { StoryGroup } from '../../types';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface SliderStoryProps {
  label: string;
  description: string;
  disabled: boolean;
  step: number;
  hideTooltip: boolean;
}

const SliderStory = ({ label, description, disabled, step, hideTooltip }: SliderStoryProps) => {
  const [value, setValue] = useState(50);
  const [savedValue, setSavedValue] = useState(50);
  return (
    <Stack gap={8}>
      <Slider
        label={label}
        description={description}
        disabled={disabled}
        step={step}
        hideTooltip={hideTooltip}
        value={value}
        onChange={setValue}
        onChangeEnd={setSavedValue}
        formatValue={(next) => `${next}%`}
      />
      <Text variant="body-sm/normal" color="text-muted">
        Saved on release: {savedValue}%
      </Text>
    </Stack>
  );
};

SliderStory.displayName = 'SliderStory';

interface SliderMarksStoryProps {
  label: string;
  disabled: boolean;
  snapToMarks: boolean;
}

const SliderMarksStory = ({ label, disabled, snapToMarks }: SliderMarksStoryProps) => {
  const [value, setValue] = useState(1);
  return (
    <Slider
      label={label}
      disabled={disabled}
      marks={PLAYBACK_SPEEDS}
      snapToMarks={snapToMarks}
      defaultMark={1}
      minValue={0.5}
      maxValue={2}
      step={0.05}
      value={value}
      onChange={setValue}
      formatValue={(next) => `${next}x`}
    />
  );
};

SliderMarksStory.displayName = 'SliderMarksStory';

const slider: StoryGroup = {
  title: 'Slider',
  stories: [
    {
      id: 'slider',
      name: 'Slider',
      component: SliderStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Overlay opacity' },
        description: { type: 'text', label: 'Description', defaultValue: '' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        step: { type: 'number', label: 'Step', defaultValue: 1, minValue: 1 },
        hideTooltip: { type: 'boolean', label: 'Hide tooltip', defaultValue: false },
      },
    },
    {
      id: 'slider-marks',
      name: 'With marks',
      component: SliderMarksStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Playback speed' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        snapToMarks: { type: 'boolean', label: 'Snap to marks', defaultValue: true },
      },
    },
  ],
};

export default slider;
