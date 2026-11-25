import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import type { FocusRingProps } from 'react-focus-rings';
import { CircleXIcon, EyeIcon, EyeSlashIcon, type IconProps } from '@discord-components/icons';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import buttonStyles from '../Button/Button.module.css';
import { CharacterCount } from '../CharacterCount';
import { Clickable } from '../Clickable';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { FieldContext } from '../Field/FieldContext';
import { FocusRing } from '../FocusRing';
import { FormContext } from '../Form/FormContext';
import { useMergeRefs } from '../hooks';
import { IconButton, type IconButtonProps } from '../IconButton';
import { InputField, useInputValidation, type InputValidateOn } from '../InputField';
import { useManaContext } from '../ManaContext';
import { TagGroup, type TagGroupProps } from '../TagGroup';
import { Text } from '../Text';
import textVariantStyles from '../Text/TextVariants.module.css';
import { tokens } from '../tokens';
import { Tooltip } from '../Tooltip';
import styles from './TextInput.module.css';

export type TextInputSize = 'sm' | 'md';

const SIZE_TEXT_VARIANTS = { sm: 'body-sm/normal', md: 'body-md/normal' } as const;

export type TextInputIconAccessory = Omit<IconButtonProps, 'size' | 'variant'> & {
  icon: ComponentType<IconProps<'color'>>;
  tooltip?: string;
};

export type TextInputAccessory =
  | string
  | ComponentType<IconProps<'color'>>
  | TextInputIconAccessory
  | { button: ReactNode }
  | ({ type: 'tags' } & Omit<TagGroupProps, 'layout'>)
  | { type: 'image'; src: string };

/** Leading text that is also a button, such as a country code picker. */
export interface TextInputPressableLeadingText {
  text: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  'aria-label'?: string;
}

export interface TextInputProps
  extends
    FieldOwnProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      keyof FieldOwnProps | 'size' | 'value' | 'defaultValue' | 'onChange' | 'type'
    > {
  editable?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  focusProps?: Partial<FocusRingProps>;
  name?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  error?: ReactNode | null;
  defaultDirty?: boolean;
  leading?: TextInputAccessory | TextInputPressableLeadingText;
  trailing?: TextInputAccessory;
  validateOn?: InputValidateOn;
  size?: TextInputSize;
  fullWidth?: boolean;
  /** Show a clear button while there is a value, or `{ show }` to decide yourself. */
  clearable?: boolean | { show: boolean };
  /** For `type="password"`, a button that shows the password. */
  revealable?: boolean;
  showCharacterCount?: boolean;
  onChange?: (value: string, name: string) => void;
  onClear?: (event: MouseEvent<HTMLElement>) => void;
}

// Reports value and focus to a surrounding legacy form item.
const useFormContextValue = (value: string | undefined, defaultValue: string | undefined) => {
  const context = useContext(FormContext);
  useEffect(() => {
    context.setHasValue?.((defaultValue != null && defaultValue !== '') || (value != null && value !== ''));
    context.setIsFocused?.(false);
    // Only the initial value matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (value != null && value !== '') context.setHasValue?.(true);
  }, [context, value]);
  return context;
};

// Joins two space-separated id lists, skipping ids the first already has.
const mergeIdLists = (first: string | undefined, second: string | undefined) => {
  const a = (first ?? '').trim();
  const b = (second ?? '').trim();
  if (a === '') return b;
  if (b === '') return a;
  const padded = ` ${a} `;
  const added = b.split(/\s+/).filter((id) => id !== '' && !padded.includes(` ${id} `));
  return added.length === 0 ? a : `${a} ${added.join(' ')}`.trim();
};

interface AccessoryProps {
  accessory: TextInputAccessory;
  inputSize: TextInputSize;
  disabled?: boolean;
}

const Accessory = ({ accessory, inputSize, disabled }: AccessoryProps) => {
  if (typeof accessory === 'string') {
    return (
      <Text
        variant={inputSize === 'sm' ? 'body-sm/normal' : 'body-md/normal'}
        color="input-placeholder-text-default"
        className={styles.leadingText}
      >
        {accessory}
      </Text>
    );
  }
  if ('icon' in accessory) {
    const { tooltip, ...buttonProps } = accessory;
    const button = <IconButton {...buttonProps} size={inputSize === 'md' ? 'sm' : 'xs'} variant="input-accessory" />;
    return tooltip != null ? (
      <Tooltip asContainer text={tooltip} shouldShow={!disabled}>
        {button}
      </Tooltip>
    ) : (
      button
    );
  }
  if ('button' in accessory) return <div className={styles.icon}>{accessory.button}</div>;
  if ('type' in accessory) {
    switch (accessory.type) {
      case 'tags': {
        const { type: _type, ...tagGroupProps } = accessory;
        return <TagGroup {...tagGroupProps} layout="inline" />;
      }
      case 'image':
        return <img aria-hidden alt="" src={accessory.src} className={styles.image} />;
      default:
        return null;
    }
  }
  const Icon = accessory;
  return (
    <div className={styles.icon}>
      <Icon size="xs" color={tokens.colors.INPUT_ICON_DEFAULT} />
    </div>
  );
};

Accessory.displayName = 'TextInputAccessory';

const ClearButton = ({
  onClick,
  disabled,
}: {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  disabled: boolean;
}) => {
  const { i18n } = useManaContext();
  return (
    <Clickable
      className={clsx(styles.clearButton, buttonStyles.button, styles.icon)}
      onClick={disabled ? undefined : onClick}
      aria-label={i18n.TEXT_INPUT_CLEAR}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <CircleXIcon size="xs" color="currentColor" aria-hidden />
    </Clickable>
  );
};

ClearButton.displayName = 'TextInputClearButton';

const PressableLeadingText = ({
  accessory,
  disabled,
}: {
  accessory: TextInputPressableLeadingText;
  disabled: boolean;
}) => (
  <Clickable
    className={clsx(styles.pressableLeadingText, buttonStyles.button)}
    onClick={disabled ? undefined : accessory.onClick}
    aria-label={accessory['aria-label']}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
  >
    <Text variant="body-md/normal" color="input-text-default">
      {accessory.text}
    </Text>
  </Clickable>
);

PressableLeadingText.displayName = 'TextInputPressableLeadingText';

const RevealPasswordButton = ({
  inputSize,
  isRevealed,
  disabled,
  onClick,
}: {
  inputSize: TextInputSize;
  isRevealed: boolean;
  disabled: boolean;
  onClick: () => void;
}) => {
  const { i18n } = useManaContext();
  return (
    <Accessory
      accessory={{
        icon: isRevealed ? EyeSlashIcon : EyeIcon,
        'aria-label': isRevealed ? i18n.TEXT_INPUT_HIDE_PASSWORD : i18n.TEXT_INPUT_VIEW_PASSWORD,
        disabled,
        onClick: () => {
          onClick();
          AccessibilityAnnouncer.announce(
            isRevealed ? i18n.TEXT_INPUT_PASSWORD_HIDDEN : i18n.TEXT_INPUT_PASSWORD_VISIBLE,
            'polite',
          );
        },
      }}
      inputSize={inputSize}
      disabled={disabled}
    />
  );
};

RevealPasswordButton.displayName = 'TextInputRevealPasswordButton';

export interface TextInputElementProps extends InputHTMLAttributes<HTMLInputElement> {
  'data-mana-component'?: string;
  ref?: Ref<HTMLInputElement>;
}

/** The bare `<input>` of a `TextInput`, wired to the surrounding `Field` and legacy form item. */
export const TextInputElement = ({
  value,
  defaultValue,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-errormessage': ariaErrorMessage,
  'aria-invalid': ariaInvalid,
  ...props
}: TextInputElementProps) => {
  const form = useFormContextValue(value as string | undefined, defaultValue as string | undefined);
  const field = useContext(FieldContext);
  const errorMessageId = ariaErrorMessage ?? field?.errorMessageId ?? form.errorId;
  const describedBy = mergeIdLists(mergeIdLists(ariaDescribedBy, field?.describedById), errorMessageId);
  return (
    <input
      {...props}
      value={value}
      defaultValue={defaultValue}
      id={field?.controlId}
      aria-labelledby={ariaLabelledBy ?? form.titleId}
      aria-describedby={describedBy !== '' ? describedBy : undefined}
      aria-errormessage={errorMessageId}
      aria-invalid={ariaInvalid ?? (errorMessageId != null || form.error != null)}
    />
  );
};

TextInputElement.displayName = 'TextInputElement';

export const TextInput = ({
  disabled = false,
  editable,
  inputRef,
  focusProps,
  name = '',
  type = 'text',
  placeholder = '',
  maxLength,
  value,
  defaultValue,
  minLength,
  error,
  defaultDirty = false,
  leading,
  trailing,
  validateOn = 'change',
  size = 'md',
  fullWidth = false,
  clearable = false,
  revealable = false,
  showCharacterCount = false,
  ...rest
}: TextInputProps) => {
  const { fieldProps, props } = splitFieldProps(rest);
  const { onChange, onClear, onBlur, onFocus, ...inputProps } = props;
  const validation = useInputValidation({
    validateOn,
    error,
    value,
    minLength,
    maxLength,
    min: rest.min != null ? Number(rest.min) : undefined,
    max: rest.max != null ? Number(rest.max) : undefined,
    defaultDirty,
  });
  const { setShouldValidate } = validation;
  const form = useFormContextValue(value, defaultValue);
  const hasTags = typeof leading === 'object' && 'type' in leading && leading.type === 'tags';
  const ownInputRef = useRef<HTMLInputElement>(null);
  const mergedInputRef = useMergeRefs(ownInputRef, inputRef);
  const fieldRef = useRef<HTMLElement>(null);
  let readOnly = rest.readOnly;
  if (readOnly == null && editable === false) readOnly = true;

  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === 'password';
  if (isRevealed && (disabled || !revealable || !isPassword)) setIsRevealed(false);
  const canReveal = revealable && isPassword;
  const inputType = canReveal && isRevealed ? 'text' : type;

  let trailingElement: ReactNode = null;
  const showClear =
    !readOnly && (typeof clearable === 'boolean' ? clearable && value != null && value !== '' : clearable.show);
  if (canReveal) {
    trailingElement = (
      <RevealPasswordButton
        inputSize={size}
        isRevealed={isRevealed}
        disabled={disabled}
        onClick={() => setIsRevealed((revealed) => !revealed)}
      />
    );
  } else if (showClear) {
    trailingElement = (
      <ClearButton
        onClick={(event) => {
          if (onClear != null) onClear(event);
          else onChange?.('', name);
          requestAnimationFrame(() => {
            ownInputRef.current?.focus();
          });
        }}
        disabled={disabled}
      />
    );
  } else if (trailing != null) {
    trailingElement = <Accessory accessory={trailing} inputSize={size} />;
  }

  const hasPressableLeadingText = typeof leading === 'object' && 'text' in leading;
  let leadingElement: ReactNode = null;
  if (hasPressableLeadingText) {
    leadingElement = <PressableLeadingText accessory={leading} disabled={disabled} />;
  } else if (leading != null) {
    leadingElement = <Accessory accessory={leading} inputSize={size} />;
  }

  const characterCount = showCharacterCount ? <CharacterCount value={value} maxLength={maxLength} /> : null;

  return (
    <Field
      {...fieldProps}
      errorMessage={validation.hasError ? (validation.errorMessage ?? undefined) : undefined}
      trailingAuxiliaryContent={characterCount}
    >
      <InputField
        ref={fieldRef}
        disabled={disabled}
        validation={validation}
        fullWidth={fullWidth}
        readOnly={readOnly}
        className={clsx(styles.container, styles[size], textVariantStyles[SIZE_TEXT_VARIANTS[size]], {
          [styles.hasLeading]: leadingElement != null,
          [styles.hasLeadingText]: typeof leading === 'string',
          [styles.hasPressableLeadingText]: hasPressableLeadingText,
          [styles.hasTrailing]: trailingElement != null,
          [styles.hasTags]: hasTags,
        })}
      >
        {leadingElement}
        <FocusRing ringTarget={fieldRef} {...focusProps}>
          <TextInputElement
            name={name}
            className={styles.input}
            disabled={disabled}
            readOnly={readOnly}
            required={fieldProps.required}
            aria-required={fieldProps.required}
            type={inputType}
            placeholder={placeholder}
            maxLength={maxLength}
            minLength={minLength}
            value={value}
            defaultValue={defaultValue}
            data-mana-component="text-input"
            {...inputProps}
            spellCheck={!isPassword && inputProps.spellCheck}
            autoCorrect={inputProps.autoCorrect ?? (isPassword ? 'off' : undefined)}
            autoCapitalize={inputProps.autoCapitalize ?? (isPassword ? 'off' : undefined)}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              onChange?.(nextValue, name);
              setShouldValidate(true);
              form.setHasValue?.(nextValue !== '');
            }}
            onBlur={(event: FocusEvent<HTMLInputElement>) => {
              onBlur?.(event);
              form.setIsFocused?.(false);
            }}
            onFocus={(event: FocusEvent<HTMLInputElement>) => {
              onFocus?.(event);
              form.setIsFocused?.(true);
            }}
            ref={mergedInputRef}
          />
        </FocusRing>
        {trailingElement}
      </InputField>
    </Field>
  );
};

TextInput.displayName = 'TextInput';
