import { useState } from 'react';
import {
  DatePicker,
  SearchableSelect,
  Select,
  Stack,
  TextInput,
  TimeInput,
  type DatePickerProps,
  type TimeInputProps,
  type ListboxOption,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';

type DateValue = NonNullable<DatePickerProps['value']>;
type Moment = NonNullable<TimeInputProps['value']>;

const OPTIONS: ListboxOption<string>[] = [
  { id: 'red', value: 'red', label: 'Red' },
  { id: 'green', value: 'green', label: 'Green' },
  { id: 'blue', value: 'blue', label: 'Blue' },
  { id: 'yellow', value: 'yellow', label: 'Yellow' },
  { id: 'purple', value: 'purple', label: 'Purple' },
  { id: 'orange', value: 'orange', label: 'Orange' },
  { id: 'pink', value: 'pink', label: 'Pink' },
  { id: 'brown', value: 'brown', label: 'Brown' },
];

const VoidInputsStory = ({ disabled, placeholder }: { disabled: boolean; placeholder: string }) => {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [date, setDate] = useState<DateValue | null>(null);
  const [time, setTime] = useState<Moment | undefined>(undefined);
  return (
    <Stack gap={8}>
      {/* Discord's story passes `isDisabled`, which these selects ignore, so they stay enabled. */}
      <Select
        selectionMode="single"
        value={value}
        onSelectionChange={setValue}
        options={OPTIONS}
        placeholder={placeholder}
        fullWidth
      />
      <TextInput placeholder={placeholder} disabled={disabled} />
      <SearchableSelect
        selectionMode="single"
        value={value}
        onSelectionChange={setValue}
        options={OPTIONS}
        placeholder={placeholder}
      />
      <DatePicker label="Date" hideLabel value={date} onChange={setDate} disabled={disabled} />
      <TimeInput onChange={setTime} value={time} disabled={disabled} />
    </Stack>
  );
};

VoidInputsStory.displayName = 'VoidInputsStory';

const voidInputs: StoryGroup = {
  title: 'VoidInputs',
  stories: [
    {
      name: 'VoidInputs',
      id: 'void-inputs',
      component: VoidInputsStory,
      controls: {
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        placeholder: { type: 'text', label: 'Placeholder', defaultValue: 'Placeholder' },
      },
    },
  ],
};

export default voidInputs;
