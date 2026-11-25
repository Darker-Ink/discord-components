import { useContext, useMemo, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { CharacterCount } from '../CharacterCount';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { FieldContext } from '../Field/FieldContext';
import { FocusRing } from '../FocusRing';
import { useFormContext } from '../Form/FormContext';
import { InputField, useInputValidation } from '../InputField';
import scrollbarStyles from '../Scroller/Scrollbar.module.css';
import { TextAreaAutosize } from './TextAreaAutosize';
import styles from './TextArea.module.css';

export interface TextAreaProps
  extends FieldOwnProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof FieldOwnProps | 'value' | 'onChange'> {
  value?: string;
  /** Grow with the content, from `rows` up to `maxRows`. */
  autosize?: boolean;
  error?: ReactNode | null;
  defaultDirty?: boolean;
  showCharacterCount?: boolean;
  /** With `showCharacterCount`, count against `maxLength` ("12 / 100") instead of just counting. */
  showRemainingCharacterCount?: boolean;
  maxRows?: number;
  inputRef?: Ref<HTMLTextAreaElement>;
  onChange?: (value: string) => void;
}

interface TextAreaElementProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autosize: boolean;
  maxRows?: number;
  'data-mana-component'?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

const TextAreaElement = ({ 'aria-labelledby': ariaLabelledBy, autosize, maxRows, ...props }: TextAreaElementProps) => {
  const form = useFormContext();
  const field = useContext(FieldContext);
  const Tag = autosize ? TextAreaAutosize : 'textarea';
  return (
    <Tag
      {...props}
      {...(autosize ? { maxRows } : null)}
      id={field?.controlId}
      aria-labelledby={ariaLabelledBy ?? form.titleId}
      aria-describedby={field?.describedById}
      aria-errormessage={field?.errorMessageId}
      aria-invalid={field?.errorMessageId != null}
    />
  );
};

TextAreaElement.displayName = 'TextAreaElement';

// Rough width of the "123 / 1000" counter in the code font, so text doesn't run under it.
const CHARACTER_WIDTH = 7.23;

export const TextArea = ({
  value,
  placeholder = '',
  autoFocus = false,
  autosize = false,
  minLength,
  maxLength,
  error,
  defaultDirty,
  showCharacterCount,
  showRemainingCharacterCount = true,
  rows = 3,
  maxRows,
  inputRef,
  ...rest
}: TextAreaProps) => {
  const { fieldProps, props } = splitFieldProps(rest);
  const { disabled } = fieldProps;
  const validation = useInputValidation({ validateOn: 'change', error, value, minLength, maxLength, defaultDirty });
  const paddingRight = useMemo(() => {
    if (!showCharacterCount || maxLength == null) return 10;
    const length = `${maxLength}`.length + `${maxLength} / `.length;
    return CHARACTER_WIDTH * length + 10;
  }, [maxLength, showCharacterCount]);
  const characterCount = showCharacterCount ? (
    <CharacterCount
      value={value}
      maxLength={showRemainingCharacterCount && maxLength != null ? maxLength : undefined}
    />
  ) : null;
  return (
    <Field
      {...fieldProps}
      trailingAuxiliaryContent={characterCount}
      errorMessage={validation.hasError ? (validation.errorMessage ?? undefined) : undefined}
    >
      <InputField validation={validation} disabled={disabled}>
        <FocusRing>
          <TextAreaElement
            autosize={autosize}
            maxRows={maxRows}
            className={clsx(styles.textArea, scrollbarStyles.scrollbarDefault)}
            style={{ paddingRight }}
            placeholder={placeholder}
            value={value}
            autoFocus={autoFocus}
            minLength={minLength}
            maxLength={maxLength}
            rows={rows}
            disabled={disabled}
            data-mana-component="text-area"
            {...props}
            onChange={(event) => {
              props.onChange?.(event.currentTarget.value);
              validation.setShouldValidate(true);
            }}
            ref={inputRef}
          />
        </FocusRing>
      </InputField>
    </Field>
  );
};

TextArea.displayName = 'TextArea';
