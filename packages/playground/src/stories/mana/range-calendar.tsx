import { useCallback, useState } from 'react';
import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
import { format } from 'date-fns';
import { Button, RangeCalendar, Stack, Text } from '@discord-mana/components';
import type { StoryGroup } from '../../types';

type DateRange = { start: DateValue; end: DateValue };

interface RangeCalendarStoryProps {
  disabled: boolean;
  readOnly: boolean;
  showMinMax: boolean;
}

const formatDate = (date: DateValue | null) =>
  date == null ? 'None' : format(date.toDate(getLocalTimeZone()), 'MMMM d, yyyy');

const RangeCalendarStory = ({ disabled, readOnly, showMinMax }: RangeCalendarStoryProps) => {
  const [value, setValue] = useState<DateRange | null>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ days: 7 }),
  });
  const onChange = useCallback((next: DateRange) => {
    setValue(next);
  }, []);
  const clear = useCallback(() => {
    setValue(null);
  }, []);
  const setThisWeek = useCallback(() => {
    const start = today(getLocalTimeZone());
    setValue({ start, end: start.add({ days: 7 }) });
  }, []);
  const setDecember = useCallback(() => {
    setValue({ start: parseDate('2024-12-01'), end: parseDate('2024-12-31') });
  }, []);
  return (
    <Stack direction="vertical" gap="md">
      <RangeCalendar
        value={value}
        onChange={onChange}
        isDisabled={disabled}
        isReadOnly={readOnly}
        minValue={showMinMax ? parseDate('2024-01-01') : undefined}
        maxValue={showMinMax ? parseDate('2024-12-31') : undefined}
        aria-label="Select a date range"
      />
      <Text variant="body-sm/normal">
        Selected range: {value != null ? `${formatDate(value.start)} – ${formatDate(value.end)}` : 'None'}
      </Text>
      <Stack direction="horizontal" gap="sm">
        <Button variant="secondary" size="sm" text="Clear" onClick={clear} disabled={disabled || readOnly} />
        <Button variant="secondary" size="sm" text="This Week" onClick={setThisWeek} disabled={disabled || readOnly} />
        <Button variant="secondary" size="sm" text="December" onClick={setDecember} disabled={disabled || readOnly} />
      </Stack>
    </Stack>
  );
};

RangeCalendarStory.displayName = 'RangeCalendarStory';

const rangeCalendar: StoryGroup = {
  title: 'RangeCalendar',
  stories: [
    {
      id: 'range-calendar',
      name: 'RangeCalendar',
      component: RangeCalendarStory,
      controls: {
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        readOnly: { type: 'boolean', label: 'Read Only', defaultValue: false },
        showMinMax: { type: 'boolean', label: 'Show Min/Max (2024)', defaultValue: false },
      },
    },
  ],
};

export default rangeCalendar;
