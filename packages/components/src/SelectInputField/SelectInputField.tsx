import type { MouseEvent, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { ChevronLargeDownIcon, CircleXIcon } from '@discord-mana/icons';
import { FocusRing } from '../FocusRing';
import { InputField } from '../InputField';
import { useManaContext } from '../ManaContext';
import styles from './SelectInputField.module.css';

export type SelectInputFieldVariant = 'default' | 'unsupported_payment_modal_card';

export interface SelectInputFieldProps {
  ref?: Ref<HTMLElement>;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  isOpen?: boolean;
  /** Disabled or read-only: shows the controls but they don't respond. */
  isInert?: boolean;
  hasValue?: boolean;
  hasError?: boolean;
  showChevronButton?: boolean;
  children?: ReactNode;
  handleToggle?: (event: MouseEvent<HTMLButtonElement>) => void;
  handleClear?: (event: MouseEvent<HTMLButtonElement>) => void;
  variant?: SelectInputFieldVariant;
}

const ClearButton = ({
  show,
  iconSize,
  onClick,
}: {
  show: boolean;
  iconSize: 'xs' | 'sm';
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) => {
  const { i18n } = useManaContext();
  if (!show) return <span aria-hidden />;
  return (
    <FocusRing>
      <button type="button" className={styles.clearButton} aria-label={i18n.CLEAR_SELECTION} onClick={onClick}>
        <CircleXIcon size={iconSize} color="currentColor" />
      </button>
    </FocusRing>
  );
};

ClearButton.displayName = 'SelectInputFieldClearButton';

const ChevronButton = ({
  show,
  isOpen,
  onClick,
}: {
  show: boolean;
  isOpen?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) =>
  show ? (
    // The field itself opens the dropdown for keyboard and screen reader users.
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      className={styles.chevronButton}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <span className={clsx(styles.chevronIcon, { [styles.isOpen]: isOpen })}>
        <ChevronLargeDownIcon size="refresh_sm" color="currentColor" />
      </span>
    </button>
  ) : null;

ChevronButton.displayName = 'SelectInputFieldChevronButton';

/** The closed field of a Select or Combobox: its content, a clear button and the chevron. */
export const SelectInputField = ({
  ref,
  disabled,
  readOnly,
  loading,
  clearable,
  fullWidth,
  isOpen,
  isInert,
  hasValue,
  hasError,
  showChevronButton = true,
  children,
  handleToggle,
  handleClear,
  variant = 'default',
}: SelectInputFieldProps) => (
  <InputField
    ref={ref}
    containerClassName={clsx(styles.selectFieldContainer, { [styles.fullWidth]: fullWidth })}
    className={clsx(styles.selectField, {
      [styles.isFocused]: isOpen,
      [styles.isInert]: isInert,
      [styles.variantUnsupportedPaymentModalCard]: variant === 'unsupported_payment_modal_card',
    })}
    data-mana-component="select-input-field"
    disabled={disabled}
    readOnly={readOnly}
    fullWidth={fullWidth}
    validation={hasError ? { hasError: true } : undefined}
    aria-busy={loading}
  >
    <div className={styles.selectFieldContent}>{children}</div>
    <ClearButton
      show={clearable === true && !isInert && hasValue === true}
      iconSize={showChevronButton ? 'xs' : 'sm'}
      onClick={handleClear}
    />
    <ChevronButton show={showChevronButton} isOpen={isOpen} onClick={handleToggle} />
  </InputField>
);

SelectInputField.displayName = 'SelectInputField';
