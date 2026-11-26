import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { RangeCalendar as AriaRangeCalendar, type DateRange, type DateValue } from 'react-aria-components';
import { ChevronLargeLeftIcon, ChevronLargeRightIcon } from '@discord-mana/icons';
import { CalendarGrid } from '../Calendar/CalendarGrid';
import styles from '../Calendar/Calendar.module.css';
import { IconButton } from '../IconButton';
import { useManaContext } from '../ManaContext';
import { Text } from '../Text';

export interface RangeCalendarProps {
  value?: DateRange | null;
  onChange?: (value: DateRange) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Number of months shown side by side. */
  visibleMonths?: number;
  className?: string;
  'aria-label'?: string;
}

/** Month grids for picking a start and end date. */
export const RangeCalendar = ({
  value,
  onChange,
  minValue,
  maxValue,
  isDisabled = false,
  isReadOnly = false,
  visibleMonths = 1,
  className,
  'aria-label': ariaLabel,
}: RangeCalendarProps) => {
  const { i18n, locale } = useManaContext();
  const start = value?.start ?? null;
  // Keeps the visible months on the range start when the value changes from outside.
  const [focusedValue, setFocusedValue] = useState<DateValue | null>(start);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusedValue(start);
  }, [start]);
  return (
    <AriaRangeCalendar
      value={value}
      focusedValue={focusedValue}
      onFocusChange={setFocusedValue}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      visibleDuration={{ months: visibleMonths }}
      aria-label={ariaLabel}
      data-mana-component="range-calendar"
      className={clsx(styles.calendar, visibleMonths > 1 && styles.multiMonth, className)}
    >
      {({ state }) => (
        <>
          <header className={styles.calendarHeader}>
            <IconButton
              variant="icon-only"
              size="sm"
              icon={ChevronLargeLeftIcon}
              aria-label={i18n.CALENDAR_PREVIOUS_MONTH_LABEL}
              onClick={() => state.focusPreviousPage()}
              slot="previous"
            />
            <div className={styles.monthHeadings} aria-live="polite">
              {Array.from({ length: visibleMonths }, (_, index) => (
                <Text key={index} variant="body-md/medium" color="text-strong">
                  {state.visibleRange.start
                    .add({ months: index })
                    .toDate(state.timeZone)
                    .toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: state.timeZone })}
                </Text>
              ))}
            </div>
            <IconButton
              variant="icon-only"
              size="sm"
              icon={ChevronLargeRightIcon}
              onClick={() => state.focusNextPage()}
              aria-label={i18n.CALENDAR_NEXT_MONTH_LABEL}
              slot="next"
            />
          </header>
          <div className={styles.months}>
            {Array.from({ length: visibleMonths }, (_, index) => (
              <CalendarGrid key={index} offset={{ months: index }} isRangeSelection />
            ))}
          </div>
        </>
      )}
    </AriaRangeCalendar>
  );
};

RangeCalendar.displayName = 'RangeCalendar';
