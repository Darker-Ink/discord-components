import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Button,
  Checkbox as ManaCheckbox,
  CheckboxGroup as ManaCheckboxGroup,
  FormContextProvider,
  FormText,
  FormTextTypes,
  FormTitle,
  RadioGroup as ManaRadioGroup,
  TextArea,
  TextInput as ManaTextInput,
} from '@discord-components/components';
import { useMessageI18n } from '../Message/messageI18n';
import { useComponentContext, useComponentParents, useComponentState, type ComponentState } from './ComponentState';
import { FileUpload } from './FileUpload';
import {
  ComponentType,
  TextInputStyle,
  type CheckboxComponent,
  type CheckboxGroupComponent,
  type LabelComponent,
  type MessageComponent,
  type RadioGroupComponent,
  type TextInputComponent,
} from './types';
import fieldStyles from './FormItemField.module.css';
import formItemStyles from './FormItem.module.css';
import labelStyles from './LabelDescription.module.css';
import clearStyles from './RadioGroupClear.module.css';

export { FileUpload };

export interface ModalFormItemProps {
  title?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: ReactNode;
  className?: string;
  titleClassName?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'label' | 'legend';
  titleId?: string;
  children?: ReactNode;
}

/** The client's legacy form item: a title (with the required star or the error) over its control. */
export const ModalFormItem = ({
  children,
  disabled = false,
  className,
  titleClassName,
  tag = 'h5',
  required = false,
  title,
  error,
  titleId,
}: ModalFormItemProps) => {
  const generatedTitleId = useId();
  const generatedErrorId = useId();
  const id = titleId ?? generatedTitleId;
  const errorId = error != null ? generatedErrorId : undefined;
  const [isFocused, setIsFocused] = useState<boolean | undefined>(undefined);
  const [hasValue, setHasValue] = useState<boolean | undefined>(undefined);
  return (
    <div className={className ?? undefined}>
      <FormContextProvider
        titleId={id}
        errorId={errorId}
        error={error ?? undefined}
        isFocused={isFocused}
        setIsFocused={setIsFocused}
        hasValue={hasValue}
        setHasValue={setHasValue}
      >
        <div className={hasValue !== undefined ? fieldStyles.fieldWrapper : undefined}>
          {title != null || error != null ? (
            <FormTitle
              data-migration-pending
              tag={tag}
              disabled={disabled}
              required={required}
              error={error}
              className={titleClassName}
              id={id}
              errorId={errorId}
            >
              {title}
            </FormTitle>
          ) : null}
          {children}
        </div>
      </FormContextProvider>
    </div>
  );
};

ModalFormItem.displayName = 'ModalFormItem';

/** Only the modal's first input gets focus when it opens. */
const useIsFirstModalInput = (id: string) => {
  const context = useComponentContext();
  const first = context?.modal != null ? context.components[0] : undefined;
  return (
    (first?.type === ComponentType.ActionRow && first.components[0]?.id === id) ||
    (first?.type === ComponentType.Label && first.component.id === id)
  );
};

export const TextInput = (component: TextInputComponent) => {
  const { type, style, label, placeholder, minLength, maxLength, required, value: initialValue } = component;
  const [value, setValue] = useState(initialValue ?? '');
  const { state, executeStateUpdate, error } = useComponentState(
    component,
    initialValue != null ? { type, value: initialValue } : undefined,
  );
  const autoFocus = useIsFirstModalInput(component.id);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the stored state, like the client
    if (state?.type === type) setValue(state.value);
  }, [type, state]);
  const inputProps = {
    value,
    placeholder,
    minLength,
    maxLength,
    required,
    onChange: (next: string) => {
      setValue(next);
      executeStateUpdate({ type, value: next });
    },
    autoFocus,
  };
  const input =
    style === TextInputStyle.Paragraph ? <TextArea autosize {...inputProps} /> : <ManaTextInput {...inputProps} />;
  return label != null ? (
    <ModalFormItem title={label} required={required} className={formItemStyles.formItem} error={error}>
      {input}
    </ModalFormItem>
  ) : (
    input
  );
};

TextInput.displayName = 'TextInput';

/** A modal Label: title, optional description and its one component (checkboxes label themselves). */
export const Label = ({
  label,
  description,
  component,
  renderComponent,
}: LabelComponent & {
  renderComponent: (component: MessageComponent, key?: string, location?: 'label-child') => ReactNode;
}) => {
  const context = useComponentContext();
  const error = context?.validationErrors?.[component.id] ?? null;
  if (component.type === ComponentType.Checkbox) return renderComponent(component, undefined, 'label-child');
  return (
    <ModalFormItem title={label} required={'required' in component ? component.required : undefined} error={error}>
      {description != null && (
        <FormText type={FormTextTypes.DESCRIPTION} className={labelStyles.description}>
          {description}
        </FormText>
      )}
      {renderComponent(component, undefined, 'label-child')}
    </ModalFormItem>
  );
};

Label.displayName = 'Label';

export const RadioGroup = (component: RadioGroupComponent) => {
  const { type, options, required } = component;
  const i18n = useMessageI18n();
  const defaultValue = useMemo(() => options.find((option) => option.default)?.value, [options]);
  const { state, executeStateUpdate } = useComponentState<
    Extract<ComponentState, { type: typeof ComponentType.RadioGroup }>
  >(component, defaultValue != null ? { type, value: defaultValue } : undefined);
  const value = state?.type === type ? state.value : null;
  const hasValue = value != null;
  const radioOptions = useMemo(
    () => options.map((option) => ({ name: option.label, value: option.value, desc: option.description })),
    [options],
  );
  const select = (next: string | null) => executeStateUpdate({ type: ComponentType.RadioGroup, value: next });
  return (
    <Fragment>
      <ManaRadioGroup options={radioOptions} value={value ?? ''} onChange={select} required={required} />
      {!required && (
        <div
          className={clsx(clearStyles.clearButtonContainer, { [clearStyles.clearButtonContainerHidden]: !hasValue })}
          aria-hidden={!hasValue}
        >
          <Button text={i18n.CLEAR_SELECTION} variant="secondary" size="sm" onClick={() => select(null)} />
        </div>
      )}
    </Fragment>
  );
};

RadioGroup.displayName = 'RadioGroup';

export const CheckboxGroup = (component: CheckboxGroupComponent) => {
  const { type, options, required, maxValues } = component;
  const defaults = useMemo(() => options.filter((option) => option.default).map((option) => option.value), [options]);
  const { state, executeStateUpdate } = useComponentState(
    component,
    defaults.length > 0 ? { type, values: defaults } : undefined,
  );
  const values = useMemo(() => (state?.type === type ? state.values : []), [state, type]);
  return (
    <ManaCheckboxGroup
      options={options.map((option) => ({
        label: option.label,
        value: option.value,
        description: option.description,
        disabled: maxValues != null && values.length >= maxValues && !values.includes(option.value),
      }))}
      selectedValues={values}
      onChange={(next) => executeStateUpdate({ type, values: next })}
      required={required}
    />
  );
};

CheckboxGroup.displayName = 'CheckboxGroup';

/** A single checkbox; it must sit in a Label, whose label and description it shows. */
export const Checkbox = ({ location: _location, ...component }: CheckboxComponent & { location?: 'label-child' }) => {
  const { type, default: initial } = component;
  const { state, executeStateUpdate } = useComponentState(
    component,
    initial != null ? { type, value: initial } : undefined,
  );
  const checked = state?.type === type && state.value;
  const label = useComponentParents(component)?.[0];
  if (label?.type !== ComponentType.Label)
    throw new Error('CheckboxActionComponent must be a child of a Label component');
  return (
    <ManaCheckbox
      label={label.label}
      description={label.description}
      checked={checked}
      onChange={(next) => executeStateUpdate({ type, value: next })}
    />
  );
};

Checkbox.displayName = 'Checkbox';
