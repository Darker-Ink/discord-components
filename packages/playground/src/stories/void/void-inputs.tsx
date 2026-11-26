import { useState } from 'react';
import {
  DateInput,
  Stack,
  TextInput,
  TimeInput,
  VoidSearchableSelect,
  VoidSelect,
  type DateInputProps,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';

type Moment = NonNullable<DateInputProps['value']>;

const OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'brown', label: 'Brown' },
];

const VoidInputsStory = ({ disabled, placeholder }: { disabled: boolean; placeholder: string }) => {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [date, setDate] = useState<Moment | undefined>(undefined);
  const [time, setTime] = useState<Moment | undefined>(undefined);
  return (
    <Stack gap={8}>
      <VoidSelect value={value} onChange={setValue} options={OPTIONS} placeholder={placeholder} isDisabled={disabled} />
      <TextInput placeholder={placeholder} disabled={disabled} />
      <VoidSearchableSelect<string>
        value={value}
        onChange={setValue}
        options={OPTIONS}
        placeholder={placeholder}
        isDisabled={disabled}
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
