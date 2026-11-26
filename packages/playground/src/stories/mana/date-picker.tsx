import { useCallback, useState } from 'react';
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
import { format } from 'date-fns';
import { Button, DatePicker, Stack } from '@discord-components/components';
import type { StoryGroup } from '../../types';

interface DatePickerStoryProps {
  label: string;
  description: string;
  errorMessage: string;
  disabled: boolean;
  required: boolean;
  showMinMax: boolean;
}

const DatePickerStory = ({
  label,
  description,
  errorMessage,
  disabled,
  required,
  showMinMax,
}: DatePickerStoryProps) => {
  const [value, setValue] = useState<DateValue | null>(today(getLocalTimeZone()));
  const onChange = useCallback((next: DateValue | null) => {
    setValue(next);
  }, []);
  const clear = useCallback(() => {
    setValue(null);
  }, []);
  const setToday = useCallback(() => {
    setValue(today(getLocalTimeZone()));
  }, []);
  const setChristmas = useCallback(() => {
    setValue(parseDate('2024-12-25'));
  }, []);
  return (
    <Stack direction="vertical" gap="md">
      <DatePicker
        label={label}
        description={description !== '' ? description : undefined}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        minValue={showMinMax ? parseDate('2024-01-01') : undefined}
        maxValue={showMinMax ? parseDate('2024-12-31') : undefined}
        errorMessage={errorMessage !== '' ? errorMessage : undefined}
        helperText={value != null ? format(value.toDate(getLocalTimeZone()), 'MMMM d, yyyy') : ''}
      />
      <Stack direction="horizontal" gap="sm">
        <Button variant="secondary" size="sm" text="Clear" onClick={clear} disabled={disabled} />
        <Button variant="secondary" size="sm" text="Set Today" onClick={setToday} disabled={disabled} />
        <Button variant="secondary" size="sm" text="Set Dec 25" onClick={setChristmas} disabled={disabled} />
      </Stack>
    </Stack>
  );
};

DatePickerStory.displayName = 'DatePickerStory';

const datePicker: StoryGroup = {
  title: 'DatePicker',
  stories: [
    {
      id: 'date-picker',
      name: 'DatePicker',
      component: DatePickerStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Select a date' },
        description: { type: 'text', label: 'Description', defaultValue: 'Choose your preferred date' },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        required: { type: 'boolean', label: 'Required', defaultValue: false },
        showMinMax: { type: 'boolean', label: 'Show Min/Max (2024)', defaultValue: false },
      },
    },
  ],
};

export default datePicker;
