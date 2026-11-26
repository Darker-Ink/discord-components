import clsx from 'clsx';
import { useTransitionStyles } from '@floating-ui/react';
import { FocusScope } from 'react-aria';
import {
  Button as AriaButton,
  DateInput,
  DateRangePicker as AriaDateRangePicker,
  DateSegment,
  Dialog,
  Group,
  type DateRange,
  type DateValue,
} from 'react-aria-components';
import { CalendarIcon } from '@discord-components/icons';
import type { DatePickerGranularity } from '../DatePicker';
import styles from '../DatePicker/DatePicker.module.css';
import { PICKER_POPOVER_TRANSITION } from '../DatePicker/popoverTransition';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { useDropdownFloating } from '../hooks';
import { InputField } from '../InputField';
import { useManaContext } from '../ManaContext';
import { RangeCalendar } from '../RangeCalendar';

export interface DateRangePickerProps extends FieldOwnProps {
  value?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  /** The date the empty segments start from when edited. */
  placeholderValue?: DateValue | null;
  /** Form field name of the start date. */
  startName?: string;
  /** Form field name of the end date. */
  endName?: string;
  fullWidth?: boolean;
  granularity?: DatePickerGranularity;
}

const getInputFieldClassName = (fullWidth: boolean, granularity: DatePickerGranularity) => {
  if (fullWidth) return clsx(styles.inputFieldFullWidth, styles.inputField);
  if (granularity === 'minute') return clsx(styles.inputFieldRangeMinute, styles.inputField);
  return clsx(styles.inputFieldRange, styles.inputField);
};

/** Start and end date fields with a two-month calendar popover. */
export const DateRangePicker = ({
  value,
  onChange,
  minValue,
  maxValue,
  placeholderValue,
  startName,
  endName,
  fullWidth = false,
  granularity = 'day',
  ...props
}: DateRangePickerProps) => {
  const { i18n } = useManaContext();
  const { fieldProps } = splitFieldProps(props);
  const { disabled, errorMessage, required = false } = fieldProps;
  const validation = { hasError: errorMessage != null && errorMessage !== '' };
  const { refs, floatingStyles, isOpen, setIsOpen, context, getFloatingProps, getReferenceProps } = useDropdownFloating(
    { matchReferenceWidth: false, placement: 'bottom-start' },
  );
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, PICKER_POPOVER_TRANSITION);

  // The popover stays open until both ends of the range are picked.
  const handleChange = (next: DateRange | null) => {
    onChange?.(next);
    if (next?.start != null && next?.end != null) setIsOpen(false);
  };

  return (
    <Field {...fieldProps}>
      {(field) => (
        <InputField
          className={getInputFieldClassName(fullWidth, granularity)}
          validation={validation}
          ref={refs.setReference}
          {...getReferenceProps()}
        >
          <AriaDateRangePicker
            id={field.controlId}
            aria-labelledby={field.labelId}
            aria-describedby={field.describedById}
            aria-invalid={field.errorMessageId != null}
            aria-errormessage={field.errorMessageId}
            value={value}
            onChange={handleChange}
            isDisabled={disabled}
            isRequired={required}
            minValue={minValue}
            maxValue={maxValue}
            placeholderValue={placeholderValue}
            granularity={granularity}
            startName={startName}
            endName={endName}
            data-mana-component="date-range-picker"
            className={styles.picker}
          >
            <Group className={styles.inputGroup}>
              <DateInput slot="start">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className={clsx(styles.segment, segment.isPlaceholder && styles.placeholder)}
                  />
                )}
              </DateInput>
              <span className={styles.separator} aria-hidden="true">
                {'→'}
              </span>
              <DateInput slot="end">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className={clsx(styles.segment, segment.isPlaceholder && styles.placeholder)}
                  />
                )}
              </DateInput>
              <AriaButton
                className={styles.calendarButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={i18n.DATE_INPUT_OPEN_CALENDAR_LABEL}
              >
                <CalendarIcon size="sm" color="currentColor" />
              </AriaButton>
            </Group>
            {isOpen && isMounted && (
              <div {...getFloatingProps()} ref={refs.setFloating} style={floatingStyles} className={styles.popover}>
                <FocusScope contain restoreFocus>
                  <Dialog
                    aria-label={i18n.DATE_INPUT_OPEN_CALENDAR_LABEL}
                    style={transitionStyles}
                    className={styles.dialog}
                  >
                    <RangeCalendar
                      value={value}
                      onChange={handleChange}
                      minValue={minValue}
                      maxValue={maxValue}
                      isDisabled={disabled}
                      visibleMonths={2}
                    />
                  </Dialog>
                </FocusScope>
              </div>
            )}
          </AriaDateRangePicker>
        </InputField>
      )}
    </Field>
  );
};

DateRangePicker.displayName = 'DateRangePicker';
