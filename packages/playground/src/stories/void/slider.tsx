import { VoidSlider } from '@discord-components/components';
import type { StoryGroup } from '../../types';

interface SliderStoryProps {
  minValue: number;
  maxValue: number;
  initialValue: number;
  markerCount: number;
  stickToMarkers: boolean;
  disabled: boolean;
  equidistant: boolean;
  label: string;
  description: string;
}

const SliderStory = ({
  minValue,
  maxValue,
  initialValue,
  markerCount,
  stickToMarkers,
  disabled,
  equidistant,
  label,
  description,
}: SliderStoryProps) => {
  const markers =
    markerCount > 0
      ? Array.from({ length: markerCount }, (_, index) =>
          Math.floor(minValue + (index / (markerCount - 1)) * (maxValue - minValue)),
        )
      : undefined;
  return (
    <VoidSlider
      key={markerCount}
      label={label}
      description={description}
      layout="horizontal-responsive"
      minValue={minValue}
      maxValue={maxValue}
      initialValue={initialValue}
      markers={markers}
      stickToMarkers={stickToMarkers}
      disabled={disabled}
      equidistant={equidistant}
    />
  );
};

SliderStory.displayName = 'SliderStory';

const slider: StoryGroup = {
  title: 'Slider',
  stories: [
    {
      id: 'slider',
      name: 'Slider',
      component: SliderStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'This is a slider' },
        description: { type: 'text', label: 'Description', defaultValue: 'This is a description of the slider' },
        minValue: { type: 'number', label: 'Min Value', defaultValue: 0 },
        maxValue: { type: 'number', label: 'Max Value', defaultValue: 100 },
        initialValue: { type: 'number', label: 'Initial Value', defaultValue: 50 },
        markerCount: { type: 'number', label: 'Marker Count', minValue: 3, defaultValue: 3 },
        stickToMarkers: { type: 'boolean', label: 'Stick to Markers', defaultValue: false },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        equidistant: { type: 'boolean', label: 'Equidistant', defaultValue: false },
      },
    },
  ],
};

export default slider;
