import { useCallback, useState } from 'react';
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
import { format } from 'date-fns';
import { Button, Calendar, Stack, Text } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import { DateInputsExperimentNotice, useDateInputsExperiment } from './date-inputs-experiment';

interface CalendarStoryProps {
  disabled: boolean;
  readOnly: boolean;
  showMinMax: boolean;
}

const CalendarStory = ({ disabled, readOnly, showMinMax }: CalendarStoryProps) => {
  const [value, setValue] = useState<DateValue | null>(today(getLocalTimeZone()));
  const onChange = useCallback((next: DateValue) => {
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
  const enabled = useDateInputsExperiment();
  if (!enabled) return <DateInputsExperimentNotice />;
  return (
    <Stack direction="vertical" gap="md">
      <Calendar
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        minValue={showMinMax ? parseDate('2024-01-01') : undefined}
        maxValue={showMinMax ? parseDate('2024-12-31') : undefined}
        aria-label="Select a date"
      />
      <Text variant="body-sm/normal">
        Selected date: {value != null ? format(value.toDate(getLocalTimeZone()), 'MMMM d, yyyy') : 'None'}
      </Text>
      <Stack direction="horizontal" gap="sm">
        <Button variant="secondary" size="sm" text="Clear" onClick={clear} disabled={disabled || readOnly} />
        <Button variant="secondary" size="sm" text="Set Today" onClick={setToday} disabled={disabled || readOnly} />
        <Button
          variant="secondary"
          size="sm"
          text="Set Dec 25"
          onClick={setChristmas}
          disabled={disabled || readOnly}
        />
      </Stack>
    </Stack>
  );
};

CalendarStory.displayName = 'CalendarStory';

const calendar: StoryGroup = {
  title: 'Calendar',
  stories: [
    {
      id: 'calendar',
      name: 'Calendar',
      component: CalendarStory,
      controls: {
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        readOnly: { type: 'boolean', label: 'Read Only', defaultValue: false },
        showMinMax: { type: 'boolean', label: 'Show Min/Max (2024)', defaultValue: false },
      },
    },
  ],
};

export default calendar;
