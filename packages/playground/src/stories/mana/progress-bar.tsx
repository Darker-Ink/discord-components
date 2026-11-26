import { ProgressBar, type ProgressBarSize } from '@discord-mana/components';
import type { StoryGroup } from '../../types';

interface ProgressBarStoryProps {
  value: number;
  isIndeterminate: boolean;
  size: ProgressBarSize;
  animate: boolean;
  valueLabel: string;
  ariaLabel: string;
}

const ProgressBarStory = ({ value, isIndeterminate, size, animate, valueLabel, ariaLabel }: ProgressBarStoryProps) => {
  const label = valueLabel !== '' ? valueLabel : undefined;
  const name = ariaLabel !== '' ? ariaLabel : 'Progress';
  return isIndeterminate ? (
    <ProgressBar isIndeterminate size={size} animate={animate} valueLabel={label} aria-label={name} />
  ) : (
    <ProgressBar value={value} size={size} animate={animate} valueLabel={label} aria-label={name} />
  );
};

ProgressBarStory.displayName = 'ProgressBarStory';

const progressBar: StoryGroup = {
  title: 'ProgressBar',
  stories: [
    {
      name: 'ProgressBar',
      id: 'progress-bar',
      component: ProgressBarStory,
      controls: {
        value: { label: 'Value', type: 'slider', defaultValue: 50, minValue: 0, maxValue: 100 },
        isIndeterminate: { label: 'Indeterminate', type: 'boolean', defaultValue: false },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'lg',
          options: [
            { label: 'xs (2px)', value: 'xs' },
            { label: 'sm (4px)', value: 'sm' },
            { label: 'md (6px)', value: 'md' },
            { label: 'lg (8px)', value: 'lg' },
          ],
        },
        animate: { label: 'Animate', type: 'boolean', defaultValue: true },
        valueLabel: { label: 'Value label (overrides aria-valuetext)', type: 'text', defaultValue: '' },
        ariaLabel: { label: 'Accessible name (aria-label)', type: 'text', defaultValue: 'Progress' },
      },
    },
  ],
};

export default progressBar;
