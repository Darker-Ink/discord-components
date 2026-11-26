import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
  CalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
} from 'react-aria-components';
import type { DateDuration } from '@internationalized/date';
import { Text } from '../Text';
import styles from './Calendar.module.css';

export interface CalendarGridProps {
  /** Which visible month this grid shows, relative to the first one. */
  offset?: DateDuration;
  monthLabel?: ReactNode;
  isRangeSelection?: boolean;
}

/** One month of a `Calendar` or `RangeCalendar`: weekday header and day cells. */
export const CalendarGrid = ({ offset, monthLabel, isRangeSelection = false }: CalendarGridProps) => (
  <div className={styles.month}>
    {monthLabel != null && (
      <Text variant="body-md/semibold" color="text-strong">
        {monthLabel}
      </Text>
    )}
    <AriaCalendarGrid offset={offset} className={styles.calendarGrid} weekdayStyle="short">
      <CalendarGridHeader>
        {(day) => (
          <CalendarHeaderCell className={styles.headerCell}>
            <Text variant="body-sm/normal" color="text-muted">
              {day}
            </Text>
          </CalendarHeaderCell>
        )}
      </CalendarGridHeader>
      <CalendarGridBody>
        {(date) => (
          <CalendarCell date={date} className={clsx(styles.cell, isRangeSelection && styles.rangeSelection)}>
            {({ formattedDate }) => (
              <span className={styles.cellContent}>
                <Text variant="body-md/normal" color="currentColor">
                  {formattedDate}
                </Text>
              </span>
            )}
          </CalendarCell>
        )}
      </CalendarGridBody>
    </AriaCalendarGrid>
  </div>
);

CalendarGrid.displayName = 'CalendarGrid';
