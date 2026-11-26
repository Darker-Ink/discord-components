import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Calendar as AriaCalendar, Heading, type DateValue } from 'react-aria-components';
import { ChevronSmallLeftIcon, ChevronSmallRightIcon } from '@discord-mana/icons';
import { IconButton } from '../IconButton';
import { useManaContext } from '../ManaContext';
import { Text } from '../Text';
import { CalendarGrid } from './CalendarGrid';
import styles from './Calendar.module.css';

export interface CalendarProps {
  value?: DateValue | null;
  onChange?: (value: DateValue) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  isDateUnavailable?: (date: DateValue) => boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** A month grid for picking a single date. */
export const Calendar = ({
  value,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  disabled = false,
  readOnly = false,
  className,
  'aria-label': ariaLabel,
}: CalendarProps) => {
  const { i18n } = useManaContext();
  // Keeps the visible month on the selected date when the value changes from outside.
  const [focusedValue, setFocusedValue] = useState<DateValue | null | undefined>(value);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusedValue(value);
  }, [value]);
  return (
    <AriaCalendar
      value={value}
      focusedValue={focusedValue}
      onFocusChange={setFocusedValue}
      onChange={onChange}
      minValue={minValue}
      maxValue={maxValue}
      isDateUnavailable={isDateUnavailable}
      isDisabled={disabled}
      isReadOnly={readOnly}
      aria-label={ariaLabel}
      data-mana-component="calendar"
      className={clsx(styles.calendar, className)}
    >
      {({ state }) => (
        <>
          <header className={styles.calendarHeader}>
            <IconButton
              variant="icon-only"
              size="sm"
              icon={ChevronSmallLeftIcon}
              aria-label={i18n.CALENDAR_PREVIOUS_MONTH_LABEL}
              onClick={() => state.focusPreviousPage()}
              slot="previous"
            />
            <div className={styles.monthHeadings}>
              <Text variant="body-md/semibold" color="text-strong">
                <Heading />
              </Text>
            </div>
            <IconButton
              variant="icon-only"
              size="sm"
              icon={ChevronSmallRightIcon}
              onClick={() => state.focusNextPage()}
              aria-label={i18n.CALENDAR_NEXT_MONTH_LABEL}
              slot="next"
            />
          </header>
          <div className={styles.months}>
            <CalendarGrid />
          </div>
        </>
      )}
    </AriaCalendar>
  );
};

Calendar.displayName = 'Calendar';
