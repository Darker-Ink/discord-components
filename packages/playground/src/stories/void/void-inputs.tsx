import { useState } from 'react';
import {
  DateInput,
  SearchableSelect,
  Select,
  Stack,
  TextInput,
  TimeInput,
  type DateInputProps,
  type ListboxOption,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';

type Moment = NonNullable<DateInputProps['value']>;

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
  const [date, setDate] = useState<Moment | undefined>(undefined);
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
      <DateInput onSelect={setDate} value={date} disabled={disabled} />
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
