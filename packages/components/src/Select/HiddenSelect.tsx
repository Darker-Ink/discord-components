import type { ChangeEvent } from 'react';
import { HiddenVisually } from '../HiddenVisually';
import type { ListboxOption, SelectionMode } from '../Listbox';

export interface HiddenSelectProps<T extends ListboxOption> {
  name?: string;
  form?: string;
  disabled?: boolean;
  autoComplete?: string;
  selectionMode?: SelectionMode;
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  listItems?: T[];
}

/** A visually hidden native `<select>` so the value takes part in forms and browser autofill. */
export const HiddenSelect = <T extends ListboxOption>({
  name,
  form,
  disabled,
  autoComplete,
  selectionMode,
  selectedItems,
  onSelectionChange,
  listItems,
}: HiddenSelectProps<T>) => {
  if (name == null && (autoComplete == null || autoComplete === 'off')) return null;
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(event.target.selectedOptions).map((option) => option.dataset.id);
    onSelectionChange((listItems ?? []).filter((item) => ids.includes(item.id)));
  };
  return (
    <HiddenVisually>
      <select
        aria-hidden
        tabIndex={-1}
        disabled={disabled}
        name={name}
        form={form}
        multiple={selectionMode === 'multiple'}
        autoComplete={autoComplete}
        onChange={handleChange}
      >
        {listItems?.map((item) => {
          const value = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
          return (
            <option key={item.id} data-id={item.id} value={value} selected={selectedItems.includes(item)}>
              {item.label}
            </option>
          );
        })}
      </select>
    </HiddenVisually>
  );
};

HiddenSelect.displayName = 'HiddenSelect';
