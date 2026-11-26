import { useState } from 'react';
import { Switch } from '@discord-mana/components';
import type { StoryGroup } from '../../types';

interface SwitchStoryProps {
  disabled: boolean;
  hasIcon: boolean;
  label: string;
  description: string;
  required: boolean;
  errorMessage: string;
}

const SwitchStory = ({ disabled, hasIcon, label, description, required, errorMessage }: SwitchStoryProps) => {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      label={label}
      description={description}
      required={required}
      errorMessage={errorMessage}
      hasIcon={hasIcon}
      onChange={setChecked}
      disabled={disabled}
      checked={checked}
    />
  );
};

SwitchStory.displayName = 'SwitchStory';

const switchGroup: StoryGroup = {
  title: 'Switch',
  stories: [
    {
      id: 'switch',
      name: 'Switch',
      component: SwitchStory,
      controls: {
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        label: { type: 'text', label: 'Label', defaultValue: 'Always underline links' },
        description: {
          type: 'text',
          label: 'Description',
          defaultValue: 'Make links to websites, help articles, and other pages stand out more by underlining them.',
        },
        required: { type: 'boolean', label: 'Required', defaultValue: false },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        hasIcon: { type: 'boolean', label: 'Has Icon', defaultValue: false },
      },
    },
  ],
};

export default switchGroup;
