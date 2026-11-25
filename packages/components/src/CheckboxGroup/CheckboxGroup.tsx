import { CheckboxGroup as AriaCheckboxGroup } from 'react-aria-components';
import { Checkbox, type CheckboxLeadingIcon } from '../Checkbox';
import { Field, type FieldProps } from '../Field';

export interface CheckboxGroupOption<T extends string | number = string> {
  label: string;
  value: T;
  description?: string;
  leadingIcon?: CheckboxLeadingIcon;
  disabled?: boolean;
}

export interface CheckboxGroupProps<T extends string | number = string> extends Omit<
  FieldProps,
  'children' | 'disabled'
> {
  // Receives the selected values as strings, the way React Aria reports them.
  onChange?: (values: string[]) => void;
  options: CheckboxGroupOption<T>[];
  selectedValues: T[];
  disabled?: boolean;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

export const CheckboxGroup = <T extends string | number = string>({
  onChange,
  options,
  selectedValues,
  disabled = false,
  'aria-labelledby': ariaLabelledBy,
  'aria-label': ariaLabel,
  ...fieldProps
}: CheckboxGroupProps<T>) => (
  <Field {...fieldProps}>
    {(field) => (
      // Discord gives the group a class from a stylesheet that isn't part of the build we have, so
      // it renders without one.
      <AriaCheckboxGroup
        id={field.controlId}
        value={selectedValues.map(String)}
        onChange={(values) => onChange?.(values)}
        aria-labelledby={ariaLabelledBy ?? field.labelId}
        aria-label={ariaLabel}
        aria-describedby={field.describedById}
        aria-errormessage={field.errorMessageId}
        data-mana-component="checkbox-group"
        isDisabled={disabled}
      >
        {options.map((option) => (
          <Checkbox
            key={String(option.value)}
            disabled={disabled || option.disabled}
            checked={selectedValues.includes(option.value)}
            label={option.label}
            value={option.value}
            description={option.description}
            leadingIcon={option.leadingIcon}
          />
        ))}
      </AriaCheckboxGroup>
    )}
  </Field>
);

CheckboxGroup.displayName = 'CheckboxGroup';
