import type { ListboxGroup, ListboxOption, ListboxOptionGroup, SelectionMode } from './types';

export const getListboxOptionId = (listboxId = 'listbox', index?: number) => `${listboxId}-option-${index}`;

export const isValueSelected = (value: unknown, selected: unknown) =>
  selected != null &&
  (Array.isArray(selected)
    ? selected.includes(value)
    : typeof value === 'object'
      ? JSON.stringify(value) === JSON.stringify(selected)
      : value === selected);

/** The selection after picking `option`: toggled in multiple mode, the only item in single mode. */
export const toggleOption = <T extends ListboxOption>(selectionMode: SelectionMode, selected: T[], option: T) => {
  let next = [...selected];
  if (selected.includes(option)) next = selected.filter((item) => item.id !== option.id);
  else if (selectionMode === 'multiple') next.push(option);
  else next = [option];
  return next;
};

const isGroupList = <T extends ListboxOption>(
  options: (T | ListboxOptionGroup<T>)[],
): options is ListboxOptionGroup<T>[] => {
  if (options.length === 0) return false;
  const first = options[0];
  return !('value' in first) && Array.isArray((first as ListboxOptionGroup<T>).options);
};

/** Flattens grouped options into one list plus each group's label and size. */
export const flattenOptionGroups = <T extends ListboxOption>(
  options: T[] | ListboxOptionGroup<T>[],
): { flatOptions: T[]; groups: ListboxGroup[] } => {
  if (!isGroupList(options)) return { flatOptions: options as T[], groups: [] };
  const flatOptions: T[] = [];
  const groups: ListboxGroup[] = [];
  for (const group of options) {
    if (group.options.length === 0) continue;
    flatOptions.push(...group.options);
    groups.push({ label: group.label, count: group.options.length });
  }
  return { flatOptions, groups };
};
