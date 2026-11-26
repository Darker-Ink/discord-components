import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type SetStateAction,
} from 'react';
import clsx from 'clsx';
import { matchSorter, type MatchSorterOptions } from 'match-sorter';
import type { Key } from 'react-aria-components';
import { Field, FieldContext, splitFieldProps, type FieldOwnProps } from '../Field';
import { FocusRing } from '../FocusRing';
import { useMergeRefs } from '../hooks/useMergeRefs';
import {
  Listbox,
  ListboxEmptyState,
  getListboxOptionId,
  toggleOption,
  type ListboxGroup,
  type ListboxOption,
  type SelectionMode,
} from '../Listbox';
import { useManaContext } from '../ManaContext';
import { HiddenSelect } from '../Select/HiddenSelect';
import { SelectOption } from '../Select/SelectOption';
import { useSelectOptions, type SelectOptions } from '../Select/useSelectOptions';
import { SelectInputField } from '../SelectInputField';
import selectStyles from '../SelectInputField/SelectInputField.module.css';
import { TagGroup } from '../TagGroup';
import { TextInputElement } from '../TextInput';
import textInputStyles from '../TextInput/TextInput.module.css';
import { tokens, useToken } from '../tokens';

type ComboboxValue = unknown;

export interface ComboboxContextValue<T extends ListboxOption = ListboxOption> {
  activeDescendantIndex: number | null;
  setActiveDescendantIndex: Dispatch<SetStateAction<number | null>>;
  listBoxId?: string;
  inputFieldRef?: RefObject<HTMLElement | null>;
  isInert?: boolean;
  isCollapsible?: boolean;
  hasValue?: boolean;
  value: ComboboxValue;
  options: T[];
  filteredOptions: T[];
  groups: ListboxGroup[];
  selectedOptions: T[];
  maxOptionsVisible?: number;
  query: string;
  setQuery: (query: string, filterQuery?: string) => void;
  loading: boolean;
  handleSelectionChange: (items: Iterable<T>) => void;
  isOpen: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  selectionMode: SelectionMode;
  onSelectionChange: (value: never) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  clearable?: boolean;
  shouldFocusWrap?: boolean;
  closeOnSelect?: boolean;
}

const noop = () => {};

const ComboboxContext = createContext<ComboboxContextValue>({
  value: undefined,
  options: [],
  selectedOptions: [],
  filteredOptions: [],
  groups: [],
  query: '',
  setQuery: noop,
  activeDescendantIndex: null,
  setActiveDescendantIndex: noop,
  loading: false,
  selectionMode: 'single',
  handleSelectionChange: noop,
  onSelectionChange: noop,
  isOpen: false,
  setIsOpen: noop,
  isEditing: false,
  setIsEditing: noop,
});

ComboboxContext.displayName = 'ComboboxContext';

export const useComboboxContext = () => useContext(ComboboxContext);

const DEFAULT_MATCH_SORTER_OPTIONS = { keys: ['label'] };

interface ComboboxBaseProps<T extends ListboxOption> {
  children?: ReactNode;
  // Whether the list can close (SearchableSelect); a standalone Combobox keeps its list shown.
  isCollapsible?: boolean;
  maxOptionsVisible?: number;
  isOpen?: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
  options: SelectOptions<T>;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  clearable?: boolean;
  closeOnSelect?: boolean;
  shouldFocusWrap?: boolean;
  formatOption?: (option: T) => T;
  customMatchSorter?: (options: T[], query: string) => T[];
  matchSorterOptions?: MatchSorterOptions<T>;
}

export interface SingleComboboxProps<T extends ListboxOption = ListboxOption> extends ComboboxBaseProps<T> {
  selectionMode: 'single';
  value?: T['value'] | null;
  onSelectionChange: (value: T['value'] | null | undefined) => void;
}

export interface MultipleComboboxProps<T extends ListboxOption = ListboxOption> extends ComboboxBaseProps<T> {
  selectionMode: 'multiple';
  value?: T['value'][] | null;
  onSelectionChange: (value: T['value'][]) => void;
}

export type ComboboxProps<T extends ListboxOption = ListboxOption> = SingleComboboxProps<T> | MultipleComboboxProps<T>;

/** Holds a combobox's options, query and selection; renders `ComboboxInput` and `ComboboxListbox` inside. */
export const Combobox = <T extends ListboxOption = ListboxOption>({
  children,
  isCollapsible = false,
  maxOptionsVisible = 5,
  isOpen = true,
  setIsOpen,
  options: optionsProp,
  ...props
}: ComboboxProps<T>) => {
  const {
    selectionMode,
    disabled,
    readOnly,
    closeOnSelect,
    formatOption,
    onSelectionChange: onSelectionChangeProp,
    value,
    customMatchSorter,
    matchSorterOptions,
    required,
  } = props;
  const onSelectionChange = onSelectionChangeProp as (value: T['value'] | T['value'][] | null | undefined) => void;
  const listBoxId = useId();
  const inputFieldRef = useRef<HTMLElement>(null);
  const [activeDescendantIndex, setActiveDescendantIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [query, setQueryState] = useState('');
  const { options, groups, loading, onQueryChange } = useSelectOptions({
    active: isOpen ?? true,
    options: optionsProp,
    renderOption: formatOption,
  });
  // The input shows `query`; options are filtered by `filterQuery`, which is empty while it shows the selection.
  const setQuery = useCallback((value: string, filter?: string) => {
    setQueryState(value);
    setFilterQuery(filter ?? value);
  }, []);
  useEffect(() => {
    onQueryChange(filterQuery);
  }, [onQueryChange, filterQuery]);
  const filter = useCallback(
    (items: T[]) =>
      customMatchSorter != null
        ? customMatchSorter(items, filterQuery)
        : matchSorter(
            items,
            filterQuery,
            (matchSorterOptions ?? DEFAULT_MATCH_SORTER_OPTIONS) as MatchSorterOptions<T>,
          ),
    [filterQuery, customMatchSorter, matchSorterOptions],
  );
  const { flatOptions: filteredOptions, groups: filteredGroups } = useMemo(() => {
    if (filterQuery === '') return { flatOptions: options, groups };
    if (groups.length === 0) return { flatOptions: filter(options), groups: [] };
    const flatOptions: T[] = [];
    const nextGroups: ListboxGroup[] = [];
    let start = 0;
    for (const group of groups) {
      const matches = filter(options.slice(start, start + group.count));
      start += group.count;
      if (matches.length !== 0) {
        flatOptions.push(...matches);
        nextGroups.push({ label: group.label, count: matches.length });
      }
    }
    return { flatOptions, groups: nextGroups };
  }, [options, groups, filterQuery, filter]);
  const singleSelection = useRef<T | undefined>(undefined);
  const selectedOptions = useMemo(() => {
    // Remembers the single selection for the effects below, as Discord's combobox does.
    // eslint-disable-next-line react-hooks/refs
    singleSelection.current = selectionMode === 'single' ? options.find((option) => option.value === value) : undefined;
    if (value == null || (Array.isArray(value) && value.length === 0)) return [];
    return (Array.isArray(value) ? value : [value])
      .map((item) => options.find((option) => option.value === item))
      .filter((option): option is T => option != null);
  }, [value, options, selectionMode]);

  useEffect(() => {
    // Shows the selected label in the input whenever the user isn't typing.
    if (!isEditing && selectionMode === 'single') setQuery(singleSelection.current?.label ?? '', '');
  }, [setQuery, selectedOptions, selectionMode, isEditing]);
  useEffect(() => {
    // A closed multi-select clears its query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isCollapsible && !isOpen && selectionMode === 'multiple') setQuery('', '');
  }, [isCollapsible, isOpen, selectionMode, setQuery]);
  useEffect(() => {
    if (isOpen && singleSelection.current != null) {
      const index = filteredOptions.findIndex((option) => option.value === singleSelection.current?.value);
      setActiveDescendantIndex(index !== -1 ? index : null);
    }
  }, [isOpen, setActiveDescendantIndex, filteredOptions]);

  const isInert = disabled || readOnly;
  const handleSelectionChange = useCallback(
    (items: Iterable<T>) => {
      const next = Array.from(items);
      if (isInert || (required && next.length === 0)) return;
      if (selectionMode === 'multiple' && next.length < 1) onSelectionChange([]);
      else if (selectionMode === 'multiple') onSelectionChange(next.map((item) => item.value));
      else onSelectionChange(next[0]?.value);
      if (selectionMode === 'multiple' && !isCollapsible) setQuery('', '');
      if (closeOnSelect && isOpen) setIsOpen?.(false);
      setIsEditing(false);
    },
    [isInert, selectionMode, isCollapsible, onSelectionChange, closeOnSelect, isOpen, setIsOpen, required, setQuery],
  );
  const hasValue = selectedOptions.length > 0;

  return (
    <ComboboxContext.Provider
      value={
        {
          activeDescendantIndex,
          setActiveDescendantIndex,
          listBoxId,
          inputFieldRef,
          isInert,
          isCollapsible,
          hasValue,
          options,
          filteredOptions,
          groups: filteredGroups,
          selectedOptions,
          maxOptionsVisible,
          query,
          setQuery,
          loading,
          handleSelectionChange,
          isOpen,
          setIsOpen,
          isEditing,
          setIsEditing,
          ...props,
        } as unknown as ComboboxContextValue
      }
    >
      {children}
    </ComboboxContext.Provider>
  );
};

Combobox.displayName = 'Combobox';

export interface ComboboxInputProps extends FieldOwnProps {
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
  // Hide the selected options' tags (multiple selection).
  hideTags?: boolean;
  name?: string;
  form?: string;
  showChevronButton?: boolean;
  onQueryChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  wrapTags?: boolean;
  ref?: Ref<HTMLElement>;
}

type ComboboxInputFieldProps = Omit<ComboboxInputProps, keyof FieldOwnProps> & { id?: string };

const ComboboxInputField = ({
  id,
  autoFocus,
  placeholder,
  hideTags,
  name,
  form,
  showChevronButton = false,
  onQueryChange,
  onFocus,
  onBlur,
  onKeyDown,
  wrapTags,
  ref,
}: ComboboxInputFieldProps) => {
  const tagListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const field = useContext(FieldContext);
  const { i18n } = useManaContext();
  const {
    activeDescendantIndex,
    setActiveDescendantIndex,
    selectionMode,
    disabled,
    readOnly,
    loading,
    clearable,
    required,
    listBoxId,
    inputFieldRef,
    shouldFocusWrap,
    isInert,
    isCollapsible,
    hasValue,
    handleSelectionChange,
    onSelectionChange,
    isOpen,
    setIsOpen,
    selectedOptions,
    filteredOptions,
    query,
    setQuery,
    isEditing,
    setIsEditing,
  } = useComboboxContext();
  const showsTags = selectionMode === 'multiple' && hasValue;
  const rendersTags = showsTags && hideTags !== true;
  const activeDescendant =
    activeDescendantIndex != null ? getListboxOptionId(listBoxId, activeDescendantIndex) : undefined;
  const clearSelection = onSelectionChange as (value: unknown) => void;

  const handleToggle = useCallback(() => {
    if (isInert) return;
    setIsOpen?.((open) => {
      if (!open) inputRef.current?.focus();
      return !open;
    });
  }, [isInert, setIsOpen]);
  const handleClear = useCallback(() => {
    if (clearable !== true) return;
    if (selectionMode === 'multiple') clearSelection([]);
    else clearSelection(null);
    setQuery('');
    inputRef.current?.focus();
  }, [clearSelection, selectionMode, clearable, setQuery]);
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setIsEditing(true);
      onFocus?.(event);
      inputRef.current?.setSelectionRange(query?.length ?? 0, query?.length ?? 0);
    },
    [onFocus, setIsEditing, query],
  );
  const handleInputClick = useCallback(() => {
    if (!isInert) setIsOpen?.(true);
  }, [setIsOpen, isInert]);
  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if ((event.relatedTarget as Element | null)?.closest(`[data-list-id="${listBoxId}"]`) != null) return;
      setIsEditing(false);
      setIsOpen?.(false);
      onBlur?.(event);
    },
    [onBlur, setIsOpen, listBoxId, setIsEditing],
  );
  useEffect(() => {
    if (showsTags && !wrapTags) {
      scrollTimeout.current = setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 10);
    }
  }, [selectedOptions, showsTags, wrapTags]);
  const handleContainerClick = useCallback(() => {
    if (isInert) return;
    setIsOpen?.(true);
    inputRef.current?.focus();
  }, [setIsOpen, isInert]);
  const selectQuery = useCallback(() => {
    inputRef.current?.select();
  }, []);
  const handleRemove = useCallback(
    (keys: Set<Key>) => {
      if (isInert) return;
      const removed = Array.from(keys)[0];
      handleSelectionChange(selectedOptions.filter((option) => option.id !== removed));
    },
    [handleSelectionChange, selectedOptions, isInert],
  );
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const count = filteredOptions.length;
      let step = 1;
      onKeyDown?.(event);
      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          step = event.key === 'PageDown' ? 10 : 1;
          if (count === 0) return;
          event.preventDefault();
          setIsOpen?.(true);
          if (event.altKey || !isOpen) return;
          setActiveDescendantIndex((current) => {
            if (current === null) return 0;
            const next = current + step;
            return next >= count && shouldFocusWrap ? 0 : Math.min(next, count - 1);
          });
          break;
        case 'ArrowUp':
        case 'PageUp':
          step = event.key === 'PageUp' ? 10 : 1;
          if (count === 0) return;
          event.preventDefault();
          setActiveDescendantIndex((current) => {
            if (current === null) return 0;
            const next = current - step;
            return next < 0 && shouldFocusWrap ? count - 1 : Math.max(next, 0);
          });
          setIsOpen?.(true);
          break;
        case 'Enter': {
          event.preventDefault();
          event.stopPropagation();
          if (!isOpen) {
            if (count === 0) return;
            setIsOpen?.(true);
            return;
          }
          if (activeDescendantIndex == null || count - 1 < activeDescendantIndex) return;
          const option = filteredOptions[activeDescendantIndex];
          if (option == null || option.disabled === true) return;
          if (required && selectedOptions.length === 1 && selectedOptions.includes(option)) {
            handleSelectionChange(selectedOptions);
            return;
          }
          handleSelectionChange(
            selectionMode === 'single' ? [option] : toggleOption(selectionMode, selectedOptions, option),
          );
          break;
        }
        case 'Backspace':
          if (
            selectionMode === 'multiple' &&
            query === '' &&
            selectedOptions.length > 0 &&
            tagListRef.current != null
          ) {
            event.preventDefault();
            event.stopPropagation();
            (tagListRef.current.lastChild as HTMLElement | null)?.focus();
          }
          break;
        case 'Escape':
          if (hasValue && clearable) {
            event.preventDefault();
            event.stopPropagation();
            handleClear();
          }
          break;
        case 'Home':
          event.preventDefault();
          if (count === 0) return;
          setActiveDescendantIndex(0);
          break;
        case 'End':
          event.preventDefault();
          if (count === 0) return;
          setActiveDescendantIndex(count - 1);
      }
    },
    [
      selectionMode,
      required,
      clearable,
      hasValue,
      shouldFocusWrap,
      isOpen,
      onKeyDown,
      handleClear,
      handleSelectionChange,
      selectedOptions,
      query,
      setIsOpen,
      filteredOptions,
      activeDescendantIndex,
      setActiveDescendantIndex,
    ],
  );
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setIsEditing(true);
      setQuery(event.target.value);
      setIsOpen?.(true);
      onQueryChange?.(event);
      setActiveDescendantIndex(null);
    },
    [onQueryChange, setIsEditing, setQuery, setIsOpen, setActiveDescendantIndex],
  );

  const value = useMemo(() => {
    if (selectedOptions.length === 0) return null;
    if (selectionMode === 'single') {
      if (isEditing) return null;
      const option = Array.from(selectedOptions)[0];
      return (
        <div className={selectStyles.singleSelectOption}>
          <SelectOption {...option} onClick={selectQuery} aria-hidden inInput />
        </div>
      );
    }
    if (hideTags) return null;
    const items = Array.from(selectedOptions).map((option) => ({
      id: option.id,
      label: option.label,
      icon: option.leading != null ? option.leading : undefined,
      isDisabled: disabled || option.disabled,
      accessibilityHint: i18n.PRESS_DELETE_TO_REMOVE_TAG,
    }));
    return (
      <TagGroup
        listRef={tagListRef}
        label={i18n.SELECTED_TAGS_HEADING}
        // Option accessories double as tag graphics, as in Discord.
        items={items as Parameters<typeof TagGroup>[0]['items']}
        layout="inline"
        onRemove={handleRemove}
      />
    );
  }, [selectionMode, disabled, selectQuery, handleRemove, isEditing, selectedOptions, hideTags, i18n]);

  const mergedRef = useMergeRefs(inputFieldRef, ref);

  return (
    <>
      <SelectInputField
        ref={mergedRef}
        disabled={disabled}
        readOnly={readOnly}
        loading={loading}
        clearable={clearable}
        fullWidth
        showChevronButton={showChevronButton}
        isOpen={!!isOpen}
        isInert={isInert}
        hasValue={hasValue}
        hasError={field?.errorMessageId != null}
        handleToggle={handleToggle}
        handleClear={handleClear}
      >
        <div
          className={clsx(selectStyles.comboBoxInputScroller, {
            [selectStyles.hasTags]: showsTags,
            [selectStyles.wrapTags]: showsTags && wrapTags,
          })}
          onClick={handleContainerClick}
        >
          <div className={selectStyles.comboBoxInputContainer}>
            {value}
            <FocusRing ringTarget={inputFieldRef}>
              <TextInputElement
                ref={inputRef}
                id={id}
                className={clsx(textInputStyles.input, selectStyles.comboBoxInput, {
                  [selectStyles.hiddenVisually]: selectionMode === 'single' && hasValue && !isEditing,
                })}
                autoFocus={autoFocus}
                placeholder={rendersTags ? undefined : (placeholder ?? i18n.SELECT_PLACEHOLDER)}
                role="combobox"
                disabled={disabled}
                readOnly={readOnly}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-busy={loading}
                aria-controls={listBoxId}
                aria-expanded={!isCollapsible || isOpen}
                aria-activedescendant={activeDescendant}
                aria-labelledby={field?.labelId}
                aria-describedby={field?.describedById}
                aria-errormessage={field?.errorMessageId}
                aria-invalid={field?.errorMessageId != null}
                aria-required={required}
                value={query ?? ''}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={handleInputClick}
              />
            </FocusRing>
          </div>
        </div>
      </SelectInputField>
      <HiddenSelect
        name={name}
        form={form}
        disabled={isInert}
        selectionMode={selectionMode}
        selectedItems={selectedOptions}
        onSelectionChange={handleSelectionChange}
        listItems={useComboboxContext().options}
      />
    </>
  );
};

ComboboxInputField.displayName = 'ComboboxInputField';

/** The text field of a `Combobox`, with its label and the selected options. */
export const ComboboxInput = ({ ref, ...props }: ComboboxInputProps) => {
  const { fieldProps, props: inputProps } = splitFieldProps(props);
  const maxWidth = useToken(tokens.modules.select.MAX_WIDTH) as number;
  const layoutConfig = useMemo(() => ({ horizontalControlColumnWidth: `minmax(${maxWidth}px, auto)` }), [maxWidth]);
  return (
    <Field {...fieldProps} layoutConfig={layoutConfig}>
      <ComboboxInputField {...inputProps} ref={ref} />
    </Field>
  );
};

ComboboxInput.displayName = 'ComboboxInput';

export interface ComboboxListboxProps<T extends ListboxOption = ListboxOption> {
  renderListItem?: (item: T, descriptionId: string | undefined) => ReactNode;
  renderEmptyState?: () => ReactNode;
  maxVisibleItems?: number;
}

/** The options of a `Combobox`, filtered by its query. */
export const ComboboxListbox = <T extends ListboxOption = ListboxOption>({
  renderListItem,
  renderEmptyState,
  maxVisibleItems = 5,
}: ComboboxListboxProps<T>) => {
  const {
    filteredOptions,
    selectedOptions,
    options,
    groups,
    activeDescendantIndex,
    selectionMode,
    listBoxId,
    required,
    disabled,
    handleSelectionChange,
    query,
    loading,
  } = useComboboxContext();
  const { i18n } = useManaContext();
  return (
    <Listbox
      id={listBoxId}
      required={required}
      disabled={disabled}
      items={(filteredOptions ?? options) as T[]}
      groups={groups}
      tabIndex={-1}
      selectionMode={selectionMode}
      selectedItems={selectedOptions as T[]}
      onSelectionChange={handleSelectionChange}
      activeDescendantIndex={activeDescendantIndex}
      renderListItem={renderListItem}
      renderEmptyState={
        renderEmptyState ??
        (() => (
          <ListboxEmptyState
            message={
              query == null || query === '' ? i18n.LISTBOX_EMPTY_STATE : i18n.LISTBOX_EMPTY_STATE_WITH_QUERY(query)
            }
          />
        ))
      }
      maxVisibleItems={maxVisibleItems}
      loading={loading}
    />
  );
};

ComboboxListbox.displayName = 'ComboboxListbox';
