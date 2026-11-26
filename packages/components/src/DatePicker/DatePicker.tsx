import clsx from 'clsx';
import { useTransitionStyles } from '@floating-ui/react';
import { FocusScope } from 'react-aria';
import {
  Button as AriaButton,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
} from 'react-aria-components';
import { CalendarIcon } from '@discord-mana/icons';
import { Calendar } from '../Calendar';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { useDropdownFloating } from '../hooks';
import { InputField } from '../InputField';
import { useManaContext } from '../ManaContext';
import styles from './DatePicker.module.css';
import { PICKER_POPOVER_TRANSITION } from './popoverTransition';

export type DatePickerGranularity = NonNullable<AriaDatePickerProps<DateValue>['granularity']>;

export interface DatePickerProps extends FieldOwnProps {
  value?: DateValue | null;
  onChange?: (value: DateValue | null) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  isDateUnavailable?: (date: DateValue) => boolean;
  /** The date the empty segments start from when edited. */
  placeholderValue?: DateValue | null;
  granularity?: DatePickerGranularity;
}

/** A date field with segments for each part and a calendar popover. */
export const DatePicker = ({
  value,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  placeholderValue,
  granularity = 'day',
  ...props
}: DatePickerProps) => {
  const { i18n } = useManaContext();
  const { fieldProps } = splitFieldProps(props);
  const { disabled, errorMessage, required = false } = fieldProps;
  const isUnavailable = value != null && isDateUnavailable?.(value) === true;
  const validation = { hasError: errorMessage != null && errorMessage !== '' };
  const { refs, floatingStyles, isOpen, setIsOpen, context, getFloatingProps, getReferenceProps } = useDropdownFloating(
    { matchReferenceWidth: false, placement: 'bottom-start' },
  );
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, PICKER_POPOVER_TRANSITION);

  const handleChange = (next: DateValue | null) => {
    onChange?.(next);
    setIsOpen(false);
  };

  return (
    <Field {...fieldProps}>
      {(field) => (
        <InputField
          className={granularity === 'minute' ? clsx(styles.inputFieldMinute, styles.inputField) : styles.inputField}
          validation={validation}
          ref={refs.setReference}
          {...getReferenceProps()}
        >
          <AriaDatePicker
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
            isDateUnavailable={isDateUnavailable}
            isInvalid={isUnavailable || undefined}
            placeholderValue={placeholderValue}
            granularity={granularity}
            data-mana-component="date-picker"
            className={styles.picker}
          >
            <Group className={styles.inputGroup}>
              <DateInput>
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
                    <Calendar
                      value={value}
                      onChange={handleChange}
                      minValue={minValue}
                      maxValue={maxValue}
                      isDateUnavailable={isDateUnavailable}
                      disabled={disabled}
                    />
                  </Dialog>
                </FocusScope>
              </div>
            )}
          </AriaDatePicker>
        </InputField>
      )}
    </Field>
  );
};

DatePicker.displayName = 'DatePicker';
