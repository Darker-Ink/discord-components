import { useCallback, useState } from 'react';
import { Button, Checkbox, Stack, Text, type CheckboxLabelType } from '@discord-mana/components';
import { CircleInformationIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

interface CheckboxStoryProps {
  label: string;
  description: string;
  disabled: boolean;
  labelType: CheckboxLabelType;
  showIcons: boolean;
}

const CheckboxStory = ({ label, description, disabled, labelType, showIcons }: CheckboxStoryProps) => {
  const [checked, setChecked] = useState(false);
  const check = useCallback(() => setChecked(true), []);
  const uncheck = useCallback(() => setChecked(false), []);
  const toggle = useCallback(() => setChecked((value) => !value), []);
  return (
    <Stack direction="vertical" gap="md">
      <Checkbox
        checked={checked}
        onChange={(value) => setChecked(value)}
        disabled={disabled}
        label={label}
        description={description != null || description === '' ? description : undefined}
        value="checkbox-value"
        labelType={labelType}
        leadingIcon={showIcons ? CircleInformationIcon : undefined}
      />
      <Text variant="body-sm/normal">Current state: {checked ? 'Checked' : 'Unchecked'}</Text>
      <Stack direction="horizontal" gap="sm">
        <Button variant="secondary" size="sm" text="Check" onClick={check} disabled={disabled} />
        <Button variant="secondary" size="sm" text="Uncheck" onClick={uncheck} disabled={disabled} />
        <Button variant="primary" size="sm" text="Toggle" onClick={toggle} disabled={disabled} />
      </Stack>
    </Stack>
  );
};

CheckboxStory.displayName = 'CheckboxStory';

const checkbox: StoryGroup = {
  title: 'Checkbox',
  stories: [
    {
      id: 'checkbox',
      name: 'Checkbox',
      component: CheckboxStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Accept terms and conditions' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        labelType: {
          type: 'select',
          label: 'Label Type',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
          ],
          defaultValue: 'primary',
        },
        description: { type: 'text', label: 'Description', defaultValue: '' },
        showIcons: { type: 'boolean', label: 'Show Icons', defaultValue: false },
      },
    },
  ],
};

export default checkbox;
