import type { FocusEvent, KeyboardEvent, MouseEvent, Ref } from 'react';
import type { FocusRingProps } from 'react-focus-rings';
import { MagnifyingGlassIcon } from '@discord-mana/icons';
import { useManaContext } from '../ManaContext';
import { TextInput, type TextInputProps, type TextInputSize } from '../TextInput';

export interface SearchBarProps {
  query: string;
  autoFocus?: boolean;
  /** Shows a clear button while there is a query. */
  onClear?: (event: MouseEvent<HTMLElement>) => void;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  size?: TextInputSize;
  disabled?: boolean;
  onChange: (query: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  inputProps?: Partial<TextInputProps>;
  focusProps?: Partial<FocusRingProps>;
  'aria-label'?: string;
  ref?: Ref<HTMLInputElement>;
}

export const SearchBar = ({
  query,
  autoFocus,
  onClear,
  placeholder,
  onKeyDown,
  size = 'md',
  disabled = false,
  onChange,
  onBlur,
  onFocus,
  autoComplete,
  inputProps,
  focusProps,
  'aria-label': ariaLabel,
  ref,
}: SearchBarProps) => {
  const { i18n } = useManaContext();
  return (
    <TextInput
      role="searchbox"
      {...inputProps}
      onFocus={onFocus}
      onBlur={onBlur}
      value={query}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder ?? i18n.SEARCH}
      disabled={disabled}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      aria-label={ariaLabel ?? i18n.SEARCH}
      inputRef={ref}
      leading={MagnifyingGlassIcon}
      onClear={onClear}
      clearable={onClear != null}
      size={size}
      fullWidth
      focusProps={focusProps}
    />
  );
};

SearchBar.displayName = 'SearchBar';
