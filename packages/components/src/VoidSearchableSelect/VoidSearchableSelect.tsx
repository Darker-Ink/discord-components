import { useCallback, type FocusEvent, type KeyboardEvent } from 'react';
import type { MatchSorterOptions } from 'match-sorter';
import { splitFieldProps, type FieldOwnProps } from '../Field';
import type { ListboxOption, ListboxOptionAccessory } from '../Listbox';
import { SearchableSelect } from '../SearchableSelect';
import type { VoidSelectOption } from '../VoidSelect';

export interface VoidSearchableSelectAccessoryContext {
  inPill: boolean;
  inDropdown: boolean;
}

type AccessoryRenderer<O> = (
  option: O,
  context: VoidSearchableSelectAccessoryContext,
) => ListboxOptionAccessory | undefined;

interface VoidSearchableSelectBaseProps<T, O extends VoidSelectOption<T>> extends FieldOwnProps {
  options: O[];
  isDisabled?: boolean;
  clearable?: boolean;
  closeOnSelect?: boolean;
  /** A custom filter replaces the default match-sorter search. */
  filter?: boolean | ((options: O[], query: string) => O[]);
  matchSorterOptions?: MatchSorterOptions<O>;
  placeholder?: string;
  'aria-required'?: boolean;
  onSearchChange?: (query: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  hidePills?: boolean;
  renderOptionPrefix?: AccessoryRenderer<O>;
  renderOptionSuffix?: AccessoryRenderer<O>;
}

export interface VoidSearchableSelectSingleProps<
  T,
  O extends VoidSelectOption<T>,
> extends VoidSearchableSelectBaseProps<T, O> {
  multi?: false;
  value?: T | null;
  onChange: (value: T | null | undefined) => void;
}

export interface VoidSearchableSelectMultiProps<T, O extends VoidSelectOption<T>> extends VoidSearchableSelectBaseProps<
  T,
  O
> {
  multi: true;
  value?: T[] | null;
  onChange: (value: T[]) => void;
}

export type VoidSearchableSelectProps<T, O extends VoidSelectOption<T> = VoidSelectOption<T>> =
  VoidSearchableSelectSingleProps<T, O> | VoidSearchableSelectMultiProps<T, O>;

/** The Void searchable select: Mana's SearchableSelect fed with Void-style options. */
export const VoidSearchableSelect = <T, O extends VoidSelectOption<T> = VoidSelectOption<T>>(
  props: VoidSearchableSelectProps<T, O>,
) => {
  const {
    options,
    value,
    multi,
    clearable,
    closeOnSelect = true,
    filter,
    matchSorterOptions,
    placeholder,
    onChange,
    onSearchChange,
    onKeyDown,
    onFocus,
    onBlur,
    hidePills,
    renderOptionPrefix,
    renderOptionSuffix,
  } = props;
  const { fieldProps } = splitFieldProps(props);
  const formatOption = useCallback(
    (option: O): ListboxOption =>
      ({
        id: option.key ?? option.value,
        value: option.value,
        label: option.label,
        disabled: option.disabled,
        leading: renderOptionPrefix?.(option, { inPill: false, inDropdown: true }),
        trailing: renderOptionSuffix?.(option, { inPill: false, inDropdown: true }),
      }) as ListboxOption,
    [renderOptionPrefix, renderOptionSuffix],
  );
  const shared = {
    hideTags: hidePills,
    // Discord combines `required` with `aria-required` and `disabled` with `isDisabled`, then spreads the
    // field props over them, so only `required` and `disabled` take effect.
    ...fieldProps,
    options: options as unknown as ListboxOption[],
    formatOption: formatOption as unknown as (option: ListboxOption) => ListboxOption,
    customMatchSorter:
      filter != null && typeof filter === 'function'
        ? (filter as unknown as (options: ListboxOption[], query: string) => ListboxOption[])
        : undefined,
    matchSorterOptions: matchSorterOptions as unknown as MatchSorterOptions<ListboxOption>,
    placeholder,
    onQueryChange: (event: { target: { value: string } }) => onSearchChange?.(event.target.value),
    onKeyDown,
    onFocus,
    onBlur,
    clearable,
    closeOnSelect,
  };
  return multi ? (
    <SearchableSelect
      {...shared}
      selectionMode="multiple"
      value={value as unknown[] | null | undefined}
      onSelectionChange={onChange as (value: unknown[]) => void}
    />
  ) : (
    <SearchableSelect
      {...shared}
      selectionMode="single"
      value={value as unknown}
      onSelectionChange={onChange as (value: unknown) => void}
    />
  );
};

VoidSearchableSelect.displayName = 'VoidSearchableSelect';
