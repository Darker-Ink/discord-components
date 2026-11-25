import { useState } from 'react';
import { TextArea, type TextAreaProps } from '@discord-components/components';
import type { StoryGroup } from '../../types';

const TextAreaStory = (props: TextAreaProps) => {
  const [value, setValue] = useState('');
  return <TextArea {...props} value={value} onChange={setValue} />;
};

TextAreaStory.displayName = 'TextAreaStory';

const inputs: StoryGroup = {
  title: 'Input Components',
  stories: [
    {
      name: 'TextArea',
      id: 'text-area',
      component: TextAreaStory,
      controls: {
        label: { label: 'Label', type: 'text', defaultValue: 'Example Label' },
        hideLabel: { label: 'Hide Label', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        description: { label: 'Description', type: 'text', defaultValue: 'This is an example description' },
        helperText: { label: 'Helper Text', type: 'text', defaultValue: undefined },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Enter your message...' },
        error: { label: 'Error Message', type: 'text', defaultValue: undefined },
        rows: { label: 'Rows', type: 'number', defaultValue: 3 },
        autosize: { label: 'Autosize', type: 'boolean', defaultValue: false },
        maxLength: { label: 'Max Length', type: 'number', defaultValue: 1000 },
        showCharacterCount: { label: 'Show Character Count', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default inputs;
