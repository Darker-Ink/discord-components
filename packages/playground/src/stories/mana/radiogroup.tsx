import { useCallback, useMemo, useState } from 'react';
import { Button, RadioGroup, Stack, Text, type RadioGroupOption } from '@discord-mana/components';
import { CircleInformationIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

interface RadioGroupStoryProps {
  disabled: boolean;
  optionCount: number;
  label: string;
  optionLabel: string;
  description: string;
  showIcons: boolean;
  withMixedDisabledOptions: boolean;
}

const RadioGroupStory = ({
  disabled,
  optionCount,
  label,
  optionLabel,
  description,
  showIcons,
  withMixedDisabledOptions,
}: RadioGroupStoryProps) => {
  const [value, setValue] = useState<string | undefined>('option1');
  const options = useMemo(
    (): RadioGroupOption[] =>
      [1, 2, 3, 4, 5]
        .map((n) => ({
          name: optionLabel != null ? `${optionLabel} ${n}` : `Option ${n}`,
          value: `option${n}`,
          desc: description == null || description === '' ? undefined : description,
          leadingIcon: showIcons ? CircleInformationIcon : undefined,
          // Every other option is disabled when mixing.
          disabled: n % 2 === 0 ? !!withMixedDisabledOptions || undefined : !withMixedDisabledOptions && undefined,
        }))
        .slice(0, Math.max(1, Math.min(5, optionCount))),
    [optionCount, optionLabel, description, showIcons, withMixedDisabledOptions],
  );
  const handleChange = useCallback((selected: string) => setValue(selected), []);
  const selectFirst = useCallback(() => {
    if (options.length > 0) setValue(options[0].value);
  }, [options]);
  const selectLast = useCallback(() => {
    if (options.length > 0) setValue(options[options.length - 1].value);
  }, [options]);
  const clear = useCallback(() => setValue(undefined), []);
  return (
    <Stack direction="vertical" gap="md">
      <RadioGroup value={value} label={label} onChange={handleChange} options={options} disabled={disabled} />
      <Text variant="body-sm/normal">
        Current selection: {typeof value === 'string' && value !== '' ? value : 'None'}
      </Text>
      <Stack direction="horizontal" gap="sm">
        <Button
          variant="secondary"
          size="sm"
          text="Select First"
          onClick={selectFirst}
          disabled={disabled || options.length === 0}
        />
        <Button
          variant="secondary"
          size="sm"
          text="Select Last"
          onClick={selectLast}
          disabled={disabled || options.length === 0}
        />
        <Button variant="primary" size="sm" text="Clear" onClick={clear} disabled={disabled} />
      </Stack>
    </Stack>
  );
};

RadioGroupStory.displayName = 'RadioGroupStory';

const radioGroup: StoryGroup = {
  title: 'RadioGroup',
  stories: [
    {
      id: 'radiogroup',
      name: 'RadioGroup',
      component: RadioGroupStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Mana Radio Group' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        optionCount: {
          type: 'select',
          label: 'Number of Options',
          options: [
            { label: '1', value: 1 },
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 },
            { label: '5', value: 5 },
          ],
          defaultValue: 3,
        },
        optionLabel: { type: 'text', label: 'Option Label', defaultValue: 'Option' },
        description: { type: 'text', label: 'Description', defaultValue: '' },
        showIcons: { type: 'boolean', label: 'Show Icons', defaultValue: false },
        withMixedDisabledOptions: { type: 'boolean', label: 'Mixed Disabled Options', defaultValue: false },
      },
    },
  ],
};

export default radioGroup;
