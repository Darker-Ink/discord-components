import {
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from 'react';
import ReactDatePickerModule from 'react-datepicker';
import moment, { type Moment } from 'moment';
import { useManaContext } from '../ManaContext';
import './react-datepicker.css';
import styles from './CalendarPicker.module.css';

export interface CalendarPickerProps {
  value?: Moment;
  minDate?: Moment;
  maxDate?: Moment;
  onSelect?: (value: Moment, event: SyntheticEvent | undefined) => void;
  calendarClassName?: string;
  autoFocus?: boolean;
  onClickOutside?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

// The package's CommonJS build can arrive wrapped in a module object.
const ReactDatePicker =
  (ReactDatePickerModule as unknown as { default?: typeof ReactDatePickerModule }).default ?? ReactDatePickerModule;

// Discord loads date-fns locale data for the user's language; its week start for en-US is Sunday.
const WEEK_STARTS_ON = 0;

/** The legacy month calendar (react-datepicker) that DateInput opens. */
export const CalendarPicker = ({
  value = moment().local(),
  minDate,
  maxDate,
  onSelect,
  calendarClassName,
  autoFocus,
  onClickOutside,
}: CalendarPickerProps) => {
  const handleChange = useCallback(
    (date: Date | null, event: SyntheticEvent | undefined) => onSelect?.(moment(date), event),
    [onSelect],
  );
  const selected = useMemo(() => value.toDate(), [value]);
  const max = useMemo(() => maxDate?.toDate(), [maxDate]);
  const min = useMemo(() => minDate?.toDate(), [minDate]);
  const { locale } = useManaContext();
  const containerRef = useRef<HTMLDivElement>(null);
  // Keeps keyboard focus on a day after the month changes.
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (!target.classList.contains('react-datepicker__day')) return;
    setTimeout(() => {
      if (containerRef.current?.contains(target)) return;
      containerRef.current?.querySelector<HTMLElement>('.react-datepicker__day[tabindex="0"]')?.focus();
    }, 100);
  }, []);
  return (
    <div ref={containerRef} className={styles.calendarPicker}>
      <ReactDatePicker
        calendarClassName={calendarClassName}
        selected={selected}
        onChange={handleChange}
        autoFocus={autoFocus}
        fixedHeight
        inline
        locale={locale}
        calendarStartDay={WEEK_STARTS_ON}
        maxDate={max}
        minDate={min}
        onKeyDown={handleKeyDown}
        onClickOutside={onClickOutside ?? (() => {})}
      />
    </div>
  );
};

CalendarPicker.displayName = 'CalendarPicker';
