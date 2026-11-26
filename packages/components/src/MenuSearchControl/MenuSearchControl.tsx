import { useImperativeHandle, useRef, type KeyboardEvent, type Ref } from 'react';
import { MenuInteractionType, type MenuControlHandle } from '../Menu';
import { SearchBar } from '../SearchBar';

// The client's English string.
const SEARCH_PLACEHOLDER = 'Search';

export interface MenuSearchControlProps {
  query: string;
  onChange: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  onInteraction?: (type?: MenuInteractionType) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  ref?: Ref<MenuControlHandle>;
}

// A search field for a MenuControlItem's `control`.
export const MenuSearchControl = ({
  ref,
  query,
  onChange,
  disabled = false,
  placeholder = SEARCH_PLACEHOLDER,
  'aria-label': ariaLabel,
  onInteraction,
  onKeyDown,
}: MenuSearchControlProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(
    ref,
    () => ({ focus: () => inputRef.current?.focus(), blur: () => inputRef.current?.blur(), activate: () => false }),
    [],
  );
  return (
    <SearchBar
      size="sm"
      disabled={disabled}
      onChange={(next) => {
        onChange(next);
        onInteraction?.(MenuInteractionType.SEARCH);
      }}
      onClear={() => {
        onChange('');
        onInteraction?.(MenuInteractionType.SEARCH);
      }}
      onKeyDown={onKeyDown}
      query={query}
      placeholder={placeholder}
      autoFocus={false}
      aria-label={ariaLabel}
      ref={inputRef}
      focusProps={{ offset: { top: 2, bottom: 2, left: 4, right: 4 } }}
    />
  );
};

MenuSearchControl.displayName = 'MenuSearchControl';
