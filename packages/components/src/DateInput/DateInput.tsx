import { useRef } from 'react';
import type { Moment } from 'moment';
import { CalendarIcon } from '@discord-components/icons';
import { CalendarPicker } from '../CalendarPicker';
import { Clickable, type ClickableProps } from '../Clickable';
import { PopoutDialog } from '../ColorPicker';
import { Field, type FieldOwnProps } from '../Field';
import { InputField } from '../InputField';
import { Popout } from '../Popout';
import { Text } from '../Text';
import styles from './DateInput.module.css';

// InputField always hands its `ref` (undefined here) to `as`, and Clickable would spread that over its own ref.
const ClickableTrigger = ({ ref: _ref, ...props }: ClickableProps & { ref?: unknown }) => <Clickable {...props} />;

ClickableTrigger.displayName = 'ClickableTrigger';

export interface DateInputProps extends Omit<FieldOwnProps, 'disabled'> {
  value?: Moment;
  onSelect: (value: Moment) => void;
  /** A moment.js format string. */
  dateFormat?: string;
  minDate?: Moment;
  maxDate?: Moment;
  disabled?: boolean;
}

/** A field showing a date that opens a month calendar to pick another. */
export const DateInput = ({
  value,
  onSelect,
  dateFormat = 'll',
  minDate,
  maxDate,
  disabled = false,
  ...fieldProps
}: DateInputProps) => {
  const { required } = fieldProps;
  const targetRef = useRef<HTMLElement | null>(null);
  return (
    <Popout
      targetElementRef={targetRef}
      renderPopout={({ closePopout }) => (
        <PopoutDialog>
          <CalendarPicker
            minDate={minDate}
            maxDate={maxDate}
            value={value}
            onSelect={(date) => {
              onSelect(date);
              closePopout();
            }}
            calendarClassName={styles.calendarContainer}
            onClickOutside={() => closePopout()}
            autoFocus
          />
        </PopoutDialog>
      )}
      position="bottom"
    >
      {({ onClick, ...triggerProps }) => (
        <Field {...fieldProps}>
          {(field) => (
            <InputField
              as={ClickableTrigger}
              // Clickable's own props, passed through InputField.
              {...{ tag: 'div', innerRef: targetRef }}
              disabled={disabled}
              aria-disabled={disabled}
              {...triggerProps}
              id={field?.controlId}
              aria-labelledby={field != null ? `${field.labelId} ${field.controlId}` : undefined}
              aria-describedby={field?.describedById}
              aria-errormessage={field?.errorMessageId}
              aria-invalid={field?.errorMessageId != null}
              aria-required={required}
              className={styles.container}
              onClick={disabled ? undefined : onClick}
            >
              <Text variant="body-md/normal">{value?.format(dateFormat)}</Text>
              <CalendarIcon size="sm" />
            </InputField>
          )}
        </Field>
      )}
    </Popout>
  );
};

DateInput.displayName = 'DateInput';
