import { useCallback, useMemo, useState } from 'react';
import { Button, CheckboxGroup, Stack, Text, type CheckboxGroupOption } from '@discord-mana/components';
import { CircleInformationIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

interface CheckboxGroupStoryProps {
  disabled: boolean;
  optionCount: number;
  label: string;
  optionLabel: string;
  description: string;
  showIcons: boolean;
  withMixedDisabledOptions: boolean;
}

const CheckboxGroupStory = ({
  disabled,
  optionCount,
  label,
  optionLabel,
  description,
  showIcons,
  withMixedDisabledOptions,
}: CheckboxGroupStoryProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(['option1']);
  const options = useMemo(
    (): CheckboxGroupOption[] =>
      [1, 2, 3, 4, 5]
        .map((n) => ({
          label: optionLabel != null ? `${optionLabel} ${n}` : `Option ${n}`,
          value: `option${n}`,
          description: description == null || description === '' ? undefined : description,
          leadingIcon: showIcons ? CircleInformationIcon : undefined,
          // With mixed options, every even option is disabled.
          disabled: n % 2 === 0 ? !!withMixedDisabledOptions || undefined : !withMixedDisabledOptions && undefined,
        }))
        .slice(0, Math.max(1, Math.min(5, optionCount))),
    [optionCount, optionLabel, description, showIcons, withMixedDisabledOptions],
  );
  const handleChange = useCallback((values: string[]) => setSelectedValues(values), []);
  const selectAll = useCallback(() => setSelectedValues(options.map((option) => option.value)), [options]);
  const clearAll = useCallback(() => setSelectedValues([]), []);
  const selectFirst = useCallback(() => {
    if (options.length > 0) setSelectedValues([options[0].value]);
  }, [options]);
  return (
    <Stack direction="vertical" gap="md">
      <CheckboxGroup
        selectedValues={selectedValues}
        label={label}
        onChange={handleChange}
        options={options}
        disabled={disabled}
      />
      <Text variant="body-sm/normal">
        Current selection: {selectedValues.length > 0 ? selectedValues.join(', ') : 'None'}
      </Text>
      <Stack direction="horizontal" gap="sm">
        <Button
          variant="secondary"
          size="sm"
          text="Select All"
          onClick={selectAll}
          disabled={disabled || options.length === 0}
        />
        <Button
          variant="secondary"
          size="sm"
          text="Select First"
          onClick={selectFirst}
          disabled={disabled || options.length === 0}
        />
        <Button variant="primary" size="sm" text="Clear All" onClick={clearAll} disabled={disabled} />
      </Stack>
    </Stack>
  );
};

CheckboxGroupStory.displayName = 'CheckboxGroupStory';

const checkboxGroup: StoryGroup = {
  title: 'CheckboxGroup',
  stories: [
    {
      id: 'checkboxgroup',
      name: 'CheckboxGroup',
      component: CheckboxGroupStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Mana Checkbox Group' },
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

export default checkboxGroup;
