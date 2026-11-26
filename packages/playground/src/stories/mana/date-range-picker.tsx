import { useCallback, useState } from 'react';
import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
import { format } from 'date-fns';
import { Button, DateRangePicker, Stack } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import { DateInputsExperimentNotice, useDateInputsExperiment } from './date-inputs-experiment';

type DateRange = { start: DateValue; end: DateValue };

interface DateRangePickerStoryProps {
  label: string;
  description: string;
  errorMessage: string;
  disabled: boolean;
  required: boolean;
  showMinMax: boolean;
}

const DateRangePickerStory = ({
  label,
  errorMessage,
  description,
  disabled,
  required,
  showMinMax,
}: DateRangePickerStoryProps) => {
  const [value, setValue] = useState<DateRange | null>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ days: 7 }),
  });
  const onChange = useCallback((next: DateRange | null) => {
    setValue(next);
  }, []);
  const clear = useCallback(() => {
    setValue(null);
  }, []);
  const setThisWeek = useCallback(() => {
    const start = today(getLocalTimeZone());
    setValue({ start, end: start.add({ days: 7 }) });
  }, []);
  const now = today(getLocalTimeZone());
  const minValue = showMinMax ? now.subtract({ weeks: 1 }) : undefined;
  const maxValue = showMinMax ? now.add({ weeks: 2 }) : undefined;
  const enabled = useDateInputsExperiment();
  if (!enabled) return <DateInputsExperimentNotice />;
  const helperText = () => {
    if (value == null) return '';
    const start = format(value.start.toDate(getLocalTimeZone()), 'MMMM d, yyyy');
    const end = format(value.end.toDate(getLocalTimeZone()), 'MMMM d, yyyy');
    return `${start} – ${end}`;
  };
  return (
    <Stack direction="vertical" gap="md">
      <DateRangePicker
        label={label}
        description={description !== '' ? description : undefined}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        errorMessage={errorMessage !== '' ? errorMessage : undefined}
        minValue={minValue}
        maxValue={maxValue}
        helperText={helperText()}
      />
      <Stack direction="horizontal" gap="sm">
        <Button variant="secondary" size="sm" text="Clear" onClick={clear} disabled={disabled} />
        <Button variant="secondary" size="sm" text="This Week" onClick={setThisWeek} disabled={disabled} />
      </Stack>
    </Stack>
  );
};

DateRangePickerStory.displayName = 'DateRangePickerStory';

const dateRangePicker: StoryGroup = {
  title: 'DateRangePicker',
  stories: [
    {
      id: 'date-range-picker',
      name: 'DateRangePicker',
      component: DateRangePickerStory,
      controls: {
        label: { type: 'text', label: 'Label', defaultValue: 'Select a date range' },
        description: { type: 'text', label: 'Description', defaultValue: 'Choose your preferred date range' },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        required: { type: 'boolean', label: 'Required', defaultValue: false },
        showMinMax: { type: 'boolean', label: 'Show Min/Max (±1 week)', defaultValue: false },
      },
    },
  ],
};

export default dateRangePicker;
