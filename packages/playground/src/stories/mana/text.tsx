import { Text, TextVariants } from '@discord-components/components';
import type { StoryGroup } from '../../types';

const text: StoryGroup = {
  title: 'Text',
  stories: [
    {
      name: 'Text',
      id: 'text',
      component: Text,
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'body-sm/normal',
          options: TextVariants.map((variant) => ({ label: variant, value: variant })),
        },
        color: {
          label: 'Color',
          type: 'select',
          defaultValue: 'text-strong',
          options: [
            { label: 'Text Primary', value: 'text-strong' },
            { label: 'Text Secondary', value: 'text-subtle' },
            { label: 'Text Tertiary', value: 'text-muted' },
            { label: 'Text Muted', value: 'text-muted' },
            { label: 'Header Primary', value: 'text-strong' },
            { label: 'Header Secondary', value: 'text-default' },
            { label: 'Header Muted', value: 'text-muted' },
            { label: 'Feedback Positive', value: 'text-feedback-positive' },
            { label: 'Feedback Critical', value: 'text-feedback-critical' },
            { label: 'Feedback Warning', value: 'text-feedback-warning' },
            { label: 'Feedback Info', value: 'text-feedback-info' },
          ],
        },
        children: { label: 'Text', type: 'text', defaultValue: 'Hello, world!' },
      },
    },
  ],
};

export default text;
