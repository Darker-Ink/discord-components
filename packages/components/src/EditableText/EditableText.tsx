import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import type { ButtonIconSource } from '../Button';
import { Field } from '../Field';
import { FocusRing } from '../FocusRing';
import { useMergeRefs } from '../hooks';
import { IconButton } from '../IconButton';
import { useInputValidation } from '../InputField';
import scrollbarStyles from '../Scroller/Scrollbar.module.css';
import type { TextVariant } from '../Text';
import textVariantStyles from '../Text/TextVariants.module.css';
import { Tooltip } from '../Tooltip';
import styles from './EditableText.module.css';

export type EditableTextPadding = 'none' | 'sm' | 'md';

export interface EditableTextTrailing {
  icon: ButtonIconSource;
  'aria-label': string;
  onClick?: () => void;
  tooltip?: string;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  'aria-haspopup'?: InputHTMLAttributes<HTMLButtonElement>['aria-haspopup'];
}

type ControlElement = HTMLInputElement | HTMLTextAreaElement;

export interface EditableTextProps extends Omit<
  InputHTMLAttributes<ControlElement>,
  'value' | 'onChange' | 'size' | 'children'
> {
  inputRef?: Ref<ControlElement>;
  id?: string;
  /** Validate before the first change. */
  defaultDirty?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  error?: ReactNode;
  /** Take the parent's width instead of hugging the text. */
  fullWidth?: boolean;
  helperText?: ReactNode;
  hideLabel?: boolean;
  label: ReactNode;
  /** With `multiline`, the rows shown before the text scrolls. */
  maxRows?: number;
  minLength?: number;
  maxLength?: number;
  multiline?: boolean;
  onBlur?: (event: FocusEvent<ControlElement>) => void;
  onChange?: (value: string) => void;
  /** Called with the new value when an edit is committed (Enter, or blur) and passes the length limits. */
  onCommit?: (value: string) => void;
  onFocus?: (event: FocusEvent<ControlElement>) => void;
  onKeyDown?: (event: KeyboardEvent<ControlElement>) => void;
  paddingBlock?: EditableTextPadding;
  paddingInline?: Exclude<EditableTextPadding, 'none'>;
  /** Rendered in place of the text; a function also gets called while editing. */
  preview?: ReactNode | ((value: string, state: { focused: boolean }) => ReactNode);
  readOnly?: boolean;
  required?: boolean;
  scrollIntoViewOnFocus?: boolean;
  /** Match a control height instead of the text's own height. */
  size?: 'sm' | 'md';
  textVariant?: TextVariant | 'inherit';
  trailing?: EditableTextTrailing;
  value?: string;
}

const isWithinLength = (value: string | undefined, minLength?: number, maxLength?: number) => {
  const { length } = value ?? '';
  return (minLength == null || length >= minLength) && (maxLength == null || length <= maxLength);
};

/** Text that edits in place: it reads as text until hovered or focused. */
export const EditableText = ({
  inputRef,
  id,
  defaultDirty = false,
  description,
  disabled = false,
  error,
  fullWidth = true,
  helperText,
  hideLabel = false,
  label,
  maxRows,
  minLength,
  multiline = false,
  onBlur,
  onChange,
  onCommit,
  onFocus,
  onKeyDown,
  paddingBlock = 'sm',
  paddingInline = 'md',
  preview,
  readOnly = false,
  required,
  scrollIntoViewOnFocus = false,
  size,
  textVariant = 'body-sm/normal',
  trailing,
  value,
  ...props
}: EditableTextProps) => {
  const { maxLength, placeholder } = props;
  const controlRef = useMergeRefs(inputRef);
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  // The value when editing started, restored by Escape.
  const [committed, setCommitted] = useState(value ?? '');
  const editing = useRef(false);
  const pointerFocus = useRef(false);
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const { hasError, errorMessage, setShouldValidate } = useInputValidation({
    defaultDirty,
    error: focused && !disabled && draft !== committed ? undefined : error,
    maxLength,
    minLength,
    validateOn: 'change',
    value: draft,
  });

  const revert = () => {
    editing.current = false;
    setDraft(committed);
    setShouldValidate(defaultDirty);
    onChange?.(committed);
  };

  const commit = () => {
    if (!editing.current) return;
    if (isWithinLength(draft, minLength, maxLength)) {
      editing.current = false;
      setCommitted(draft ?? '');
      onCommit?.(draft ?? '');
    } else {
      revert();
    }
  };

  useEffect(() => {
    if (focused && !disabled && scrollIntoViewOnFocus) {
      rootRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion.enabled ? 'auto' : 'smooth' });
    }
  }, [focused, disabled, scrollIntoViewOnFocus, reducedMotion.enabled]);

  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(value);
    if ((draft ?? '') === committed) setCommitted(value ?? '');
  }

  const previewContent =
    typeof preview === 'function' ? preview((focused ? draft : value) ?? '', { focused }) : focused ? null : preview;
  const hasPreview = previewContent != null;
  const inputClassName = clsx(styles.input, { [styles.multiline]: multiline });

  const controlProps = {
    ...props,
    ref: controlRef,
    className: clsx(inputClassName, styles.field, { [scrollbarStyles.scrollbarDefault]: multiline }),
    disabled,
    minLength,
    onBlur: (event: FocusEvent<ControlElement>) => {
      setFocused(false);
      pointerFocus.current = false;
      if (!readOnly) commit();
      onBlur?.(event);
    },
    onChange: (event: ChangeEvent<ControlElement>) => {
      editing.current = true;
      setDraft(event.currentTarget.value);
      setShouldValidate(true);
      onChange?.(event.currentTarget.value);
    },
    onFocus: (event: FocusEvent<ControlElement>) => {
      const element = event.currentTarget;
      setCommitted(element.value);
      editing.current = true;
      setFocused(true);
      if (!pointerFocus.current) element.setSelectionRange(element.value.length, element.value.length);
      onFocus?.(event);
    },
    onKeyDown: (event: KeyboardEvent<ControlElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || readOnly || event.nativeEvent.isComposing) return;
      if (!multiline && event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        revert();
      }
    },
    onMouseDown: () => {
      pointerFocus.current = true;
    },
    readOnly,
    required,
    value: draft ?? '',
  };

  const isEmpty = draft == null || draft === '';
  const sizerText = (isEmpty ? placeholder : draft) ?? '';
  // The zero-width space keeps an empty or newline-ending sizer one line tall.
  const sizerContent = hasPreview ? previewContent : `${sizerText}\u200b`;
  const trailingDisabled = disabled || readOnly || trailing?.disabled;

  return (
    <div ref={rootRef} className={clsx(styles.root, { [styles.hugContents]: !fullWidth })}>
      <Field
        id={id}
        description={description}
        disabled={disabled}
        errorMessage={hasError ? errorMessage : undefined}
        helperText={hasError ? undefined : helperText}
        hideLabel={hideLabel}
        label={label}
        required={required}
      >
        {({ controlId, describedById, errorMessageId }) => {
          const elementProps = {
            ...controlProps,
            id: controlId,
            'aria-describedby': describedById,
            'aria-errormessage': errorMessageId,
            'aria-invalid': hasError,
          };
          return (
            <div
              ref={containerRef}
              className={clsx(styles.container, textVariant !== 'inherit' && textVariantStyles[textVariant], {
                [styles.hasPreview]: hasPreview,
                [styles.hasError]: hasError,
                [styles.clamped]: maxRows != null,
                [styles.controlHeight]: size != null,
                [styles.controlHeightSm]: size === 'sm',
                [styles.hasTrailing]: trailing != null,
              })}
              data-disabled={disabled}
              data-padding-block={paddingBlock}
              data-padding-inline={paddingInline}
              data-read-only={readOnly}
            >
              <FocusRing ringTarget={containerRef}>
                {multiline ? (
                  <textarea {...(elementProps as InputHTMLAttributes<HTMLTextAreaElement>)} rows={1} />
                ) : (
                  <input {...(elementProps as InputHTMLAttributes<HTMLInputElement>)} type="text" />
                )}
              </FocusRing>
              <div
                aria-hidden="true"
                className={clsx(inputClassName, styles.sizer, {
                  [styles.placeholderSizer]: !hasPreview && isEmpty,
                  [styles.clampedSizer]: maxRows != null,
                })}
                style={maxRows != null ? ({ '--custom-editable-text-max-rows': maxRows } as CSSProperties) : undefined}
              >
                {sizerContent}
              </div>
              {trailing != null && (
                <div className={styles.trailing}>
                  <Tooltip
                    asContainer
                    ariaHidden
                    shouldShow={!trailingDisabled}
                    text={trailing.tooltip ?? trailing['aria-label']}
                  >
                    <IconButton
                      buttonRef={trailing.buttonRef}
                      aria-haspopup={trailing['aria-haspopup']}
                      aria-label={trailing['aria-label']}
                      disabled={trailingDisabled}
                      icon={trailing.icon}
                      onClick={trailing.onClick}
                      size="sm"
                      type="button"
                      variant="icon-only"
                    />
                  </Tooltip>
                </div>
              )}
            </div>
          );
        }}
      </Field>
    </div>
  );
};

EditableText.displayName = 'EditableText';
