import { useState } from 'react';
import {
  Stack,
  VoidSearchableSelect,
  VoidSelect,
  type ReferencePosition,
  type VoidSelectVariant,
} from '@discord-components/components';
import type { Controls, StoryGroup } from '../../types';

export const COLOR_OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'brown', label: 'Brown' },
];

interface SelectStoryProps {
  label: string;
  description: string;
  isDisabled: boolean;
  isProcessing: boolean;
  placeholder: string;
  maxVisibleItems: number;
  clearable: boolean;
  closeOnSelect: boolean;
  popoutPosition: ReferencePosition;
  variant: VoidSelectVariant;
}

const SelectStory = ({
  label,
  description,
  isDisabled,
  isProcessing,
  placeholder,
  maxVisibleItems,
  clearable,
  closeOnSelect,
  popoutPosition,
  variant,
}: SelectStoryProps) => {
  const [value, setValue] = useState<string | null | undefined>('blue');
  return (
    <VoidSelect
      variant={variant}
      label={label}
      description={description}
      value={value}
      onChange={setValue}
      options={COLOR_OPTIONS}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isProcessing={isProcessing}
      maxVisibleItems={maxVisibleItems}
      clearable={clearable}
      closeOnSelect={closeOnSelect}
      popoutPosition={popoutPosition}
    />
  );
};

SelectStory.displayName = 'SelectStory';

interface SearchableSelectStoryProps extends Omit<SelectStoryProps, 'variant' | 'maxVisibleItems' | 'popoutPosition'> {
  clearQueryOnSelect: boolean;
  filter: boolean;
}

// `clearQueryOnSelect` only matters to Discord's older searchable select, which these props never reach.
const SearchableSelectStory = ({
  placeholder,
  isDisabled,
  isProcessing: _isProcessing,
  clearable,
  closeOnSelect,
  clearQueryOnSelect: _clearQueryOnSelect,
  filter,
  label,
  description,
}: SearchableSelectStoryProps) => {
  const [value, setValue] = useState<string | null | undefined>('blue');
  const [values, setValues] = useState<string[]>(['blue']);
  return (
    <Stack gap={24}>
      <VoidSearchableSelect<string>
        label={label}
        description={description}
        value={value}
        onChange={setValue}
        options={COLOR_OPTIONS}
        placeholder={placeholder}
        isDisabled={isDisabled}
        clearable={clearable}
        filter={filter}
      />
      <VoidSearchableSelect<string>
        label={label}
        description={description}
        multi
        value={values}
        onChange={setValues}
        options={COLOR_OPTIONS}
        placeholder={placeholder}
        isDisabled={isDisabled}
        clearable={clearable}
        closeOnSelect={closeOnSelect}
        filter={filter}
      />
    </Stack>
  );
};

SearchableSelectStory.displayName = 'SearchableSelectStory';

const SELECT_CONTROLS: Controls = {
  label: { type: 'text', label: 'Label', defaultValue: 'Color' },
  description: { type: 'text', label: 'Description', defaultValue: 'Choose a color' },
  placeholder: { type: 'text', label: 'Placeholder', defaultValue: 'Choose a color' },
  variant: {
    type: 'select',
    label: 'Variant',
    defaultValue: 'filled',
    options: [
      { label: 'Filled', value: 'filled' },
      { label: 'Text Only', value: 'text-only' },
    ],
  },
  isDisabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
  isProcessing: { type: 'boolean', label: 'Processing', defaultValue: false },
  clearable: { type: 'boolean', label: 'Clearable', defaultValue: true },
  closeOnSelect: { type: 'boolean', label: 'Close On Select', defaultValue: true },
  maxVisibleItems: { type: 'number', label: 'Max Visible Items', defaultValue: 5 },
  popoutPosition: {
    type: 'select',
    label: 'Popout Position',
    defaultValue: 'bottom',
    options: [
      { label: 'Bottom', value: 'bottom' },
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
      { label: 'Window Center', value: 'window_center' },
    ],
  },
};

const select: StoryGroup = {
  title: 'Select',
  stories: [
    { id: 'select', name: 'Select', component: SelectStory, controls: SELECT_CONTROLS },
    {
      id: 'searchable-select',
      name: 'Searchable Select',
      component: SearchableSelectStory,
      controls: {
        ...SELECT_CONTROLS,
        placeholder: { type: 'text', label: 'Placeholder', defaultValue: 'Search for a color' },
        isDisabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        isProcessing: { type: 'boolean', label: 'Processing', defaultValue: false },
        clearable: { type: 'boolean', label: 'Clearable', defaultValue: true },
        closeOnSelect: { type: 'boolean', label: 'Close On Select', defaultValue: true },
        clearQueryOnSelect: { type: 'boolean', label: 'Clear Query On Select', defaultValue: false },
        filter: { type: 'boolean', label: 'Filter', defaultValue: true },
      },
    },
  ],
};

export default select;
