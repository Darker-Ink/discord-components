import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import {
  ButtonLooks,
  Checkbox,
  Clickable,
  Field,
  FocusRing,
  HiddenVisually,
  InputField,
  LegacyButton,
  ListAuto,
  ListNavigatorContainer,
  ListNavigatorProvider,
  LoadingDots,
  Popout,
  Spinner,
  SpinnerTypes,
  Text,
  makeListItemId,
  splitFieldProps,
  useElementSize,
  useFormContext,
  useListItem,
  useListNavigator,
  type FieldOwnProps,
  type ListScrollerHandle,
  type ReferencePosition,
} from '@discord-components/components';
import { ChevronSmallDownIcon, ChevronSmallUpIcon, CircleCheckIcon, XSmallIcon } from '@discord-components/icons';
import { useMessageI18n } from '../Message/messageI18n';
import styles from './PopoutSearchableSelect.module.css';

export interface SearchableSelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  key?: string;
}

export interface SearchableSelectAccessoryContext {
  inPill: boolean;
  inDropdown: boolean;
}

type AccessoryRenderer<O> = (option: O | null, context: SearchableSelectAccessoryContext) => ReactNode;

const ROW_HEIGHT = 44;

const getLabel = <O extends SearchableSelectOption<unknown>>(option: O) => option.label;

/** Options that can be loaded per query (debounced), like the client's `useLoadableOptions`. */
const useLoadableOptions = <O,>({
  active,
  loadableOptions,
  debounceTime,
}: {
  active: boolean;
  loadableOptions: O[] | ((query: string) => Promise<O[]>);
  debounceTime?: number;
}) => {
  const isFunction = typeof loadableOptions === 'function';
  const [state, setState] = useState<{ options: O[]; query: string; debouncedQuery: string | null; loading: boolean }>({
    options: isFunction ? [] : (loadableOptions as O[]),
    query: '',
    debouncedQuery: '',
    loading: false,
  });
  const { options, loading, query, debouncedQuery } = state;
  const commit = useCallback(
    (value: string) =>
      setState((current) => ({ ...current, loading: isFunction, query: value, debouncedQuery: value })),
    [isFunction],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the query when the popout opens, like the client
    if (active) commit('');
  }, [active, commit]);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (isFunction) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the pending load, like the client
      setState((current) => ({ ...current, loading: true, debouncedQuery: null }));
      timeout = setTimeout(() => commit(query), debounceTime ?? 500);
    } else commit(query);
    return () => clearTimeout(timeout);
  }, [isFunction, query, debounceTime, commit]);
  useEffect(() => {
    let cancelled = false;
    if (active && debouncedQuery !== null)
      (typeof loadableOptions === 'function' ? loadableOptions(debouncedQuery) : Promise.resolve(loadableOptions)).then(
        (loaded) => {
          if (!cancelled) setState((current) => ({ ...current, options: loaded, loading: false }));
        },
      );
    return () => {
      cancelled = true;
    };
  }, [active, loadableOptions, debouncedQuery]);
  return {
    options,
    loading,
    onQueryChange: useCallback((value: string) => setState((current) => ({ ...current, query: value })), []),
  };
};

/** Closes the popout when the field scrolls out of view. */
const useVisibilityObserver = (onChange: (visible: boolean) => void) => {
  const ref = useRef<HTMLElement | null>(null);
  const callback = useRef(onChange);
  useLayoutEffect(() => {
    callback.current = onChange;
  });
  useLayoutEffect(() => {
    const node = ref.current;
    if (node == null) return;
    const observer = new IntersectionObserver(([entry]) => callback.current(entry.isIntersecting), { threshold: 1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return ref;
};

/** Moves focus between the option pills (arrow keys) and back to the input at the ends. */
const usePillFocus = (listRef: RefObject<HTMLElement | null>, inputRef: RefObject<HTMLInputElement | null>) => {
  const getPills = useCallback(
    () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-option-pill-value]') ?? []),
    [listRef],
  );
  const move = useCallback(
    (step: 1 | -1, toInput: boolean) => {
      const pills = getPills();
      const active = listRef.current?.ownerDocument?.activeElement as HTMLElement | null;
      const index = active != null ? pills.indexOf(active) : -1;
      let next = pills[index + step] ?? (toInput ? undefined : pills[step > 0 ? 0 : pills.length - 1]);
      if (toInput && (next == null || next === active)) next = pills[index - step];
      if (next == null || next === active) inputRef.current?.focus();
      else next.focus();
    },
    [getPills, listRef, inputRef],
  );
  return {
    focusPreviousItem: (toInput = false) => move(-1, toInput),
    focusNextItem: (toInput = false) => move(1, toInput),
    focusLastItem: () => getPills().at(-1)?.focus(),
  };
};

interface OptionPillsProps<T, O extends SearchableSelectOption<T>> {
  selectedOptions: O[];
  selectValue: (value: T, focusInput?: boolean) => void;
  listRef: RefObject<HTMLUListElement | null>;
  focusPreviousItem: (toInput?: boolean) => void;
  focusNextItem: (toInput?: boolean) => void;
  renderOptionPrefix?: AccessoryRenderer<O>;
  renderOptionSuffix?: AccessoryRenderer<O>;
}

const isAfter = (container: Node | null, node: Node | null) => {
  if (container == null || node == null) return false;
  const mask = Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING;
  return (container.compareDocumentPosition(node) & mask) === mask;
};

const OptionPill = <T, O extends SearchableSelectOption<T>>({
  option,
  focused,
  onClick,
  onKeyDown,
  renderOptionPrefix,
  renderOptionSuffix,
  children,
}: {
  option: O;
  focused: boolean;
  onClick: (value: T) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  renderOptionPrefix?: AccessoryRenderer<O>;
  renderOptionSuffix?: AccessoryRenderer<O>;
  children: ReactNode;
}) => {
  const i18n = useMessageI18n();
  const prefix = renderOptionPrefix?.(option, { inPill: true, inDropdown: false });
  const suffix = renderOptionSuffix?.(option, { inPill: true, inDropdown: false });
  return (
    <FocusRing offset={3}>
      <LegacyButton
        data-migration-pending
        look={ButtonLooks.BLANK}
        tabIndex={focused ? 0 : -1}
        {...{ 'data-option-pill-value': option.value }}
        className={styles.optionPillBtn}
        innerClassName={styles.optionPill}
        onClick={() => onClick(option.value)}
        onKeyDown={onKeyDown}
      >
        {children}
        {prefix != null && <div className={styles.prefix}>{prefix}</div>}{' '}
        {suffix != null && <div className={styles.suffix}>{suffix}</div>}
        <HiddenVisually>{i18n.REMOVE}</HiddenVisually>
        <XSmallIcon size="custom" color="currentColor" className={styles.deleteOptionIcon} width={14} height={14} />
      </LegacyButton>
    </FocusRing>
  );
};

OptionPill.displayName = 'OptionPill';

const OptionPills = <T, O extends SearchableSelectOption<T>>({
  selectedOptions,
  selectValue,
  listRef,
  focusPreviousItem,
  focusNextItem,
  renderOptionPrefix,
  renderOptionSuffix,
}: OptionPillsProps<T, O>) => {
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  return (
    <ul
      className={styles.optionPillContainer}
      ref={listRef}
      onKeyDown={(event) => {
        if (listRef.current == null) return;
        if (event.key === 'ArrowRight') {
          event.stopPropagation();
          event.preventDefault();
          focusNextItem();
        } else if (event.key === 'ArrowLeft') {
          event.stopPropagation();
          event.preventDefault();
          focusPreviousItem();
        }
      }}
      onFocus={(event) => {
        const target = event.target as HTMLElement;
        if (listRef.current != null && isAfter(listRef.current, target))
          setFocusedValue(target.getAttribute('data-option-pill-value'));
      }}
      onBlur={(event) => {
        if (!isAfter(listRef.current, event.relatedTarget as Node | null)) setFocusedValue(null);
      }}
    >
      {selectedOptions.map((option, index) => (
        <li key={option.key ?? `${option.label}-${String(option.value)}`} className={styles.optionPillItem}>
          <OptionPill
            option={option}
            focused={focusedValue == null ? index === 0 : focusedValue === String(option.value)}
            onClick={() => selectValue(option.value)}
            renderOptionPrefix={renderOptionPrefix}
            renderOptionSuffix={renderOptionSuffix}
            onKeyDown={(event) => {
              if (event.key === 'Backspace') {
                focusPreviousItem(true);
                selectValue(option.value, false);
              } else if (event.key === 'Delete') {
                focusNextItem(true);
                selectValue(option.value, false);
              }
            }}
          >
            <div className={styles.content}>{option.label}</div>
          </OptionPill>
        </li>
      ))}
    </ul>
  );
};

OptionPills.displayName = 'OptionPills';

interface SearchInputProps {
  query: string | null;
  inputId?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-labelledby'?: string;
  'aria-expanded'?: boolean;
  isDisabled: boolean;
  listboxId: string;
  activeDescendant: string | null;
  navigatorId: string;
  onChange: (value: string) => void;
  onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  setInputRef: (node: HTMLInputElement | null) => void;
  isEditing: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  isProcessing: boolean;
  loading: boolean;
  style?: CSSProperties;
  className?: string;
  selectedCount: number;
  hidePills?: boolean;
}

const SearchInput = ({
  query,
  inputId,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  'aria-required': required,
  'aria-labelledby': labelledBy,
  'aria-expanded': expanded,
  isDisabled,
  listboxId,
  activeDescendant,
  navigatorId,
  onChange,
  onFocus,
  setInputRef,
  isEditing,
  onKeyDown,
  placeholder,
  isProcessing,
  loading,
  style,
  className,
  selectedCount,
  hidePills,
}: SearchInputProps) => (
  <input
    role="combobox"
    id={inputId}
    aria-haspopup="listbox"
    aria-invalid={invalid}
    aria-labelledby={labelledBy}
    aria-autocomplete="list"
    aria-expanded={expanded}
    aria-describedby={describedBy}
    aria-disabled={isDisabled}
    aria-controls={listboxId}
    aria-required={required}
    aria-busy={loading || isProcessing}
    style={style ?? {}}
    aria-activedescendant={activeDescendant != null ? makeListItemId(navigatorId, activeDescendant) : ''}
    disabled={isDisabled}
    value={query ?? ''}
    onChange={(event) => onChange(event.target.value)}
    onFocus={onFocus}
    className={clsx(styles.searchInput, className, { [styles.editing]: isEditing, [styles.disabled]: isDisabled })}
    onKeyDown={onKeyDown}
    placeholder={(query ?? '').trim() !== '' || (selectedCount > 0 && !hidePills) ? undefined : placeholder}
    ref={setInputRef}
  />
);

SearchInput.displayName = 'SearchInput';

interface OptionRowProps<T> {
  value: T;
  label: ReactNode;
  prefix: ReactNode;
  suffix: ReactNode;
  onSelect: (value: T) => void;
  isSelected: boolean;
  isFocused: boolean;
  multi: boolean;
  'aria-posinset': number;
  'aria-setsize': number;
}

const OptionRow = <T,>({
  value,
  label,
  prefix,
  suffix,
  onSelect,
  isSelected,
  isFocused,
  multi,
  ...rest
}: OptionRowProps<T>) => {
  const itemProps = useListItem(String(value));
  return (
    <Clickable
      tag="li"
      style={{ height: ROW_HEIGHT }}
      focusProps={{ enabled: false }}
      className={clsx(styles.option, { [styles.focused]: isFocused, [styles.multi]: multi })}
      onClick={() => onSelect(value)}
      {...itemProps}
      {...rest}
      aria-selected={isSelected}
      id={itemProps['data-list-item-id']}
      data-searchable-select-option
      role="option"
    >
      <div className={styles.content}>
        {label}
        {'\u00a0'}
      </div>
      {prefix != null && <div className={styles.prefix}>{prefix}</div>}{' '}
      {suffix != null && <div className={styles.suffix}>{suffix}</div>}{' '}
      {multi ? (
        <Checkbox checked={isSelected} displayOnly usageVariant="indicator" aria-hidden />
      ) : isSelected ? (
        <CircleCheckIcon
          size="custom"
          color="currentColor"
          aria-hidden
          secondaryColor="white"
          className={styles.selectedIcon}
          width={24}
          height={24}
        />
      ) : null}
    </Clickable>
  );
};

OptionRow.displayName = 'OptionRow';

interface SelectListProps<T, O extends SearchableSelectOption<T>> {
  onSelect: (value: T) => void;
  closePopout: () => void;
  selectedValues: T[];
  options: O[];
  width?: number;
  maxVisibleItems: number;
  activeDescendant: string | null;
  listRef: RefObject<ListScrollerHandle | null>;
  listId: string;
  renderOptionLabel: (option: O) => ReactNode;
  updatePosition: () => void;
  loading: boolean;
  multi: boolean;
  popoutPosition?: string | null;
  closeOnSelect: boolean;
  renderOptionPrefix?: AccessoryRenderer<O>;
  renderOptionSuffix?: AccessoryRenderer<O>;
}

const SelectList = <T, O extends SearchableSelectOption<T>>({
  onSelect,
  closePopout,
  selectedValues,
  options,
  width,
  maxVisibleItems,
  activeDescendant,
  listRef,
  listId,
  renderOptionLabel,
  updatePosition,
  loading,
  multi,
  popoutPosition,
  closeOnSelect,
  renderOptionPrefix = () => null,
  renderOptionSuffix = () => null,
}: SelectListProps<T, O>) => {
  const i18n = useMessageI18n();
  const handleSelect = useCallback(
    (value: T) => {
      onSelect(value);
      if (closeOnSelect) closePopout();
    },
    [closeOnSelect, closePopout, onSelect],
  );
  // The client repositions every frame while the popout is open.
  useEffect(() => {
    let stopped = false;
    let frame = requestAnimationFrame(function tick() {
      if (stopped) return;
      updatePosition();
      frame = requestAnimationFrame(tick);
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [updatePosition]);
  const top = popoutPosition === 'top';
  if (loading)
    return (
      <div
        aria-busy
        className={clsx(styles.popout, styles.loading, { [styles.popoutPositionTop]: top })}
        style={{ width }}
      >
        <Spinner itemClassName={styles.loadingSpinner} type={SpinnerTypes.PULSING_ELLIPSIS} />
      </div>
    );
  if (options.length === 0)
    return (
      <div className={clsx(styles.popout, styles.noResults, { [styles.popoutPositionTop]: top })} style={{ width }}>
        <Text color="text-muted" variant="body-md/normal">
          {i18n.NO_RESULTS}
        </Text>
      </div>
    );
  return (
    <ListNavigatorContainer>
      {({ ref, onKeyDown: _onKeyDown, ...containerProps }) => (
        <ListAuto
          className={clsx(styles.popout, styles.searchableSelect, {
            [styles.noScrollbar]: options.length <= maxVisibleItems,
            [styles.popoutPositionTop]: top,
          })}
          style={{ width, maxHeight: ROW_HEIGHT * maxVisibleItems }}
          ref={(handle: ListScrollerHandle | null) => {
            listRef.current = handle;
            ref.current = handle?.getScrollerNode() ?? null;
          }}
          {...containerProps}
          // Focus stays in the search input, so the client's navigator marks the list as not tabbable.
          tabIndex={-1}
          role={undefined}
          innerRole="listbox"
          innerAriaMultiselectable={multi}
          innerId={listId}
          rowHeight={ROW_HEIGHT}
          sections={[options.length]}
          sectionHeight={0}
          renderRow={({ row }) => {
            const option = options[row];
            return (
              <OptionRow<T>
                key={option.key ?? row}
                multi={multi}
                aria-posinset={row}
                aria-setsize={options.length}
                isSelected={selectedValues.includes(option.value)}
                isFocused={activeDescendant === String(option.value)}
                value={option.value}
                label={renderOptionLabel(option)}
                onSelect={handleSelect}
                prefix={renderOptionPrefix(option, { inPill: false, inDropdown: true })}
                suffix={renderOptionSuffix(option, { inPill: false, inDropdown: true })}
              />
            );
          }}
          renderSection={() => null}
        />
      )}
    </ListNavigatorContainer>
  );
};

SelectList.displayName = 'SelectList';

interface BaseProps<T, O extends SearchableSelectOption<T>> extends FieldOwnProps {
  /** Options, or a loader called with the search query (debounced). */
  options: O[] | ((query: string) => Promise<O[]>);
  clearable?: boolean;
  closeOnSelect?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  placeholder?: string;
  wrapperClassName?: string;
  className?: string;
  isDisabled?: boolean;
  isProcessing?: boolean;
  maxVisibleItems?: number;
  autoFocus?: boolean;
  popoutPosition?: ReferencePosition;
  popoutWidth?: number | 'auto';
  /** `false` keeps the loaded options as they are (the loader filters). */
  filter?: boolean | ((options: O[], query: string) => O[]);
  debounceTime?: number;
  renderOptionLabel?: (option: O) => ReactNode;
  onSearchChange?: (query: string) => void;
  renderOptionPrefix?: AccessoryRenderer<O>;
  renderOptionSuffix?: AccessoryRenderer<O>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-labelledby'?: string;
  'aria-required'?: boolean;
  inputClassNames?: string;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  clearQueryOnSelect?: boolean;
  hidePills?: boolean;
}

export type PopoutSearchableSelectProps<T, O extends SearchableSelectOption<T>> = BaseProps<T, O> &
  (
    | { multi?: false; value?: O | T | null; onChange: (value: O | T | null | undefined) => void }
    | { multi: true; value?: (O | T)[] | null; onChange: (value: (O | T)[]) => void }
  );

const defaultMatch = <O extends SearchableSelectOption<unknown>>(options: O[], query: string) => {
  const needle = query.trim().toLowerCase();
  return needle === '' ? options : options.filter((option) => option.label.toLowerCase().includes(needle));
};

/**
 * The client's searchable popout select (the legacy branch of its SearchableSelect, used with loadable options
 * or custom labels): a text input, option pills when multiple, and a virtualized list in a popout.
 */
export const PopoutSearchableSelect = <T, O extends SearchableSelectOption<T> = SearchableSelectOption<T>>(
  props: PopoutSearchableSelectProps<T, O>,
) => {
  const i18n = useMessageI18n();
  const {
    options: loadableOptions,
    value,
    onChange,
    clearable = false,
    multi = false,
    closeOnSelect = true,
    onOpen,
    onClose,
    placeholder = i18n.SELECT,
    wrapperClassName,
    className,
    isDisabled = false,
    isProcessing = false,
    maxVisibleItems = 7,
    autoFocus = false,
    popoutPosition = 'bottom',
    popoutWidth,
    filter = true,
    debounceTime,
    renderOptionLabel = getLabel as (option: O) => ReactNode,
    onSearchChange,
    renderOptionPrefix = () => null,
    renderOptionSuffix = () => null,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-labelledby': ariaLabelledBy,
    'aria-required': ariaRequired,
    inputClassNames,
    onBlur,
    onFocus,
    onKeyDown,
    clearQueryOnSelect = false,
    hidePills,
  } = props;
  const { fieldProps } = splitFieldProps(props);
  const { ref: iconsRef, width: iconsWidth } = useElementSize();
  const { titleId, errorId, error } = useFormContext();
  const { ref: fieldRef, width: fieldWidth } = useElementSize();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeDescendant, setActiveDescendant] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const listRef = useRef<ListScrollerHandle | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { options, loading, onQueryChange } = useLoadableOptions({
    active: open,
    loadableOptions,
    debounceTime,
  });
  const selectedOptions = useMemo(
    () =>
      value == null
        ? []
        : ((Array.isArray(value) ? value : [value])
            .map((item) =>
              typeof item === 'object' && (item == null || 'value' in (item as object))
                ? (item as O)
                : options.find((option) => option.value === item),
            )
            .filter(Boolean) as O[]),
    [options, value],
  );
  const selectedValues = useMemo(() => selectedOptions.map((option) => option.value), [selectedOptions]);
  const lastSelected = selectedOptions[selectedOptions.length - 1];
  const lastSelectedRef = useRef(lastSelected);
  useLayoutEffect(() => {
    lastSelectedRef.current = lastSelected;
  });
  const listId = useId();
  const navigatorId = useId();
  const setShown = useCallback(
    (shown: boolean) => {
      if (open === shown || isDisabled) return;
      setOpen(shown);
      if (shown) onOpen?.();
      else onClose?.();
    },
    [isDisabled, onClose, onOpen, open],
  );
  const visibilityRef = useVisibilityObserver(
    useCallback(
      (visible: boolean) => {
        if (open && !visible) setShown(false);
      },
      [setShown, open],
    ),
  );
  const navigator = useListNavigator({
    id: navigatorId,
    defaultFocused: lastSelected != null ? String(lastSelected.value) : undefined,
    scrollToStart: () =>
      new Promise<void>((resolve) => {
        const list = listRef.current;
        if (list == null) return resolve();
        list.scrollToTop({ callback: () => requestAnimationFrame(() => resolve()) });
      }),
    scrollToEnd: () =>
      new Promise<void>((resolve) => {
        const list = listRef.current;
        if (list == null) return resolve();
        list.scrollToBottom({ callback: () => requestAnimationFrame(() => resolve()) });
      }),
    isEnabled: open,
    wrap: true,
    useVirtualFocus: true,
    setFocus: (selector, itemId) => {
      const node = document.querySelector<HTMLElement>(selector);
      setActiveDescendant(itemId);
      if (node != null) listRef.current?.scrollIntoViewNode({ node });
    },
    disableClickOnSpace: true,
  });
  const navigatorRef = useRef(navigator);
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    navigatorRef.current = navigator;
    optionsRef.current = options;
  });
  useEffect(() => {
    const last = lastSelectedRef.current;
    if (open && last != null && !loading)
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ section: 0, row: optionsRef.current.indexOf(last) });
      });
  }, [open, loading]);
  useEffect(() => {
    if (open) inputRef.current?.scrollIntoView();
  }, [open]);
  useEffect(() => {
    const current = navigatorRef.current;
    if (open && !loading) {
      const input = inputRef.current;
      if (input != null) {
        input.focus();
        // Puts the caret at the end.
        const { value: text } = input;
        input.value = ' ';
        input.value = text;
      }
      setActiveDescendant(current.focusedItemId());
    } else {
      const last = lastSelectedRef.current;
      current.setFocus(last != null ? String(last.value) : null);
      setActiveDescendant(null);
    }
  }, [open, loading]);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows the picked label while closed, like the client
    if (!open) setQuery(multi ? '' : lastSelected != null ? lastSelected.label : null);
  }, [multi, lastSelected, open]);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the query after each pick, like the client
    if (multi) setQuery('');
  }, [multi, selectedOptions.length]);
  const selectValue = useCallback(
    (picked: T | null, focusInput = true) => {
      if (picked == null) {
        (onChange as (value: unknown) => void)(multi ? [] : undefined);
        return;
      }
      const loader = typeof loadableOptions === 'function';
      const option = loader ? options.find((item) => item.value === picked) : picked;
      if (multi) {
        const current = (value ?? []) as (O | T)[];
        const has = current.some((item) => (loader ? (item as O).value : item) === picked);
        (onChange as (value: (O | T)[]) => void)(
          has ? current.filter((item) => (loader ? (item as O).value : item) !== picked) : [...current, option as O],
        );
        if (focusInput) inputRef.current?.focus();
      } else (onChange as (value: O | T | null | undefined) => void)(option as O);
      setActiveDescendant(null);
      if (!multi || closeOnSelect) setShown(false);
      setEditing(false);
      if (clearQueryOnSelect) setQuery('');
    },
    [loadableOptions, options, multi, closeOnSelect, clearQueryOnSelect, onChange, value, setShown],
  );
  useLayoutEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  const clear = useCallback(() => {
    setQuery('');
    selectValue(null);
    setShown(true);
  }, [selectValue, setShown]);
  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'Escape':
          if (open) {
            event.stopPropagation();
            setShown(false);
          }
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          setShown(true);
      }
    },
    [setShown, open],
  );
  let shownOptions = options;
  if (editing && query != null && filter !== false)
    shownOptions = typeof filter === 'function' ? filter(options, query) : defaultMatch(options, query);
  useEffect(() => {
    listRef.current?.scrollToTop();
  }, [query]);
  useEffect(() => {
    if (!loading && editing && query !== null)
      requestAnimationFrame(() => navigatorRef.current.focusFirstVisibleItem());
  }, [loading, editing, query]);
  const pillsRef = useRef<HTMLUListElement | null>(null);
  const { focusPreviousItem, focusNextItem, focusLastItem } = usePillFocus(pillsRef, inputRef);
  const ringTarget = useRef<HTMLDivElement | null>(null);
  return (
    <ListNavigatorProvider navigator={navigator}>
      <Popout
        targetElementRef={targetRef}
        spacing={0}
        animation={Popout.Animation.NONE}
        shouldShow={open}
        onRequestClose={() => setShown(false)}
        renderPopout={({ closePopout, position, updatePosition }) => (
          <SelectList<T, O>
            loading={loading}
            multi={multi}
            listRef={listRef}
            listId={listId}
            maxVisibleItems={maxVisibleItems}
            width={popoutWidth != null && popoutWidth !== 'auto' ? popoutWidth : fieldWidth}
            selectedValues={selectedValues}
            closePopout={closePopout}
            onSelect={selectValue}
            closeOnSelect={closeOnSelect}
            options={shownOptions}
            activeDescendant={activeDescendant}
            renderOptionLabel={renderOptionLabel}
            updatePosition={updatePosition}
            popoutPosition={position}
            renderOptionPrefix={renderOptionPrefix}
            renderOptionSuffix={renderOptionSuffix}
          />
        )}
        position={popoutPosition}
      >
        {({ 'aria-expanded': expanded }, { isShown }) => {
          const Chevron = isShown ? ChevronSmallUpIcon : ChevronSmallDownIcon;
          const { ref: navigatorInputRef, onKeyDown: navigatorKeyDown } = navigator.containerProps;
          const inputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
            onKeyDown?.(event);
            navigatorKeyDown(event);
            handleKey(event);
          };
          const sharedInputProps = {
            query,
            isDisabled,
            isEditing: editing,
            isProcessing,
            loading,
            'aria-expanded': expanded as boolean | undefined,
            setInputRef: (node: HTMLInputElement | null) => {
              navigatorInputRef.current = node;
              inputRef.current = node;
            },
            onFocus: (event: FocusEvent<HTMLInputElement>) => {
              inputRef.current?.setSelectionRange(0, query?.length ?? 0);
              onFocus?.(event);
            },
            onChange: (text: string) => {
              onQueryChange(text);
              onSearchChange?.(text);
              setQuery(text);
              setShown(true);
              setEditing(true);
            },
            activeDescendant,
            placeholder,
            listboxId: listId,
            navigatorId,
            selectedCount: selectedOptions.length,
            hidePills,
          };
          return (
            <Field {...fieldProps}>
              {(field) => {
                const fieldInputProps = {
                  inputId: field?.controlId,
                  'aria-describedby': ariaDescribedBy ?? field?.describedById,
                  'aria-invalid': ariaInvalid ?? (field?.errorMessageId != null || error != null),
                  'aria-required': ariaRequired ?? fieldProps.required,
                  'aria-labelledby': ariaLabelledBy ?? titleId,
                };
                void errorId;
                const prefix = renderOptionPrefix(selectedOptions[0] ?? null, { inPill: false, inDropdown: false });
                const suffix = renderOptionSuffix(selectedOptions[0] ?? null, { inPill: false, inDropdown: false });
                return (
                  <InputField
                    as="div"
                    disabled={isDisabled}
                    ref={(node: HTMLElement | null) => {
                      targetRef.current = node as HTMLDivElement | null;
                    }}
                    className={clsx(wrapperClassName, styles.wrapper)}
                    containerClassName={className}
                    style={{ '--icons-width': `${iconsWidth ?? 0}px` } as CSSProperties}
                    onBlur={(event: FocusEvent<HTMLElement>) => {
                      if (
                        targetRef.current?.contains(event.relatedTarget as Node) ||
                        listRef.current?.getScrollerNode()?.contains(event.relatedTarget as Node)
                      )
                        return;
                      if (!multi && lastSelected != null) setQuery(lastSelected.label);
                      setEditing(false);
                      setShown(false);
                      onBlur?.(event);
                    }}
                  >
                    <FocusRing ringTarget={ringTarget} focusTarget={inputRef} offset={4}>
                      <div
                        onClick={
                          isDisabled
                            ? undefined
                            : (event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                setQuery('');
                                setShown(true);
                              }
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        ref={(node) => {
                          ringTarget.current = node;
                          fieldRef.current = node;
                          visibilityRef.current = node;
                        }}
                        className={clsx(styles.select, styles.searchable, { [styles.multi]: multi })}
                      >
                        <div className={clsx(styles.value, { [styles.multi]: multi })}>
                          {multi ? (
                            <>
                              {selectedOptions.length > 0 && !hidePills && (
                                <OptionPills<T, O>
                                  listRef={pillsRef}
                                  selectedOptions={selectedOptions}
                                  renderOptionPrefix={renderOptionPrefix}
                                  renderOptionSuffix={renderOptionSuffix}
                                  selectValue={(picked, focusInput = true) => selectValue(picked, focusInput)}
                                  focusNextItem={focusNextItem}
                                  focusPreviousItem={focusPreviousItem}
                                />
                              )}
                              <SearchInput
                                {...sharedInputProps}
                                {...fieldInputProps}
                                style={{ width: `${Math.max(placeholder.length, (query ?? '').length)}ch` }}
                                className={clsx(styles.multi, inputClassNames)}
                                onKeyDown={(event) => {
                                  if (
                                    ['ArrowLeft', 'Backspace'].includes(event.key) &&
                                    (query === '' || query == null) &&
                                    selectedOptions.length > 0
                                  )
                                    focusLastItem();
                                  else inputKeyDown(event);
                                }}
                              />
                            </>
                          ) : (
                            <>
                              {prefix != null ? <div aria-hidden>{prefix}</div> : null}
                              <SearchInput {...sharedInputProps} {...fieldInputProps} onKeyDown={inputKeyDown} />
                              {suffix != null ? <div aria-hidden>{suffix}</div> : null}
                            </>
                          )}
                        </div>
                      </div>
                    </FocusRing>
                    <div
                      className={clsx(styles.icons, styles.iconsContainer, { [styles.multi]: multi })}
                      ref={iconsRef}
                    >
                      {isProcessing ? (
                        <LoadingDots dotRadius={3.5} themed />
                      ) : (
                        <>
                          {clearable && ((query != null && query !== '') || selectedOptions.length > 0) ? (
                            <Clickable aria-label={i18n.CLEAR} aria-controls={field?.controlId} onClick={clear}>
                              <XSmallIcon size="xs" color="currentColor" className={styles.clear} />
                            </Clickable>
                          ) : null}
                          <Clickable
                            aria-label={open ? i18n.CLOSE : i18n.OPEN}
                            aria-controls={field?.controlId}
                            onClick={() => setShown(!open)}
                          >
                            <Chevron className={styles.dropdownIcon} size="sm" />
                          </Clickable>
                        </>
                      )}
                    </div>
                  </InputField>
                );
              }}
            </Field>
          );
        }}
      </Popout>
    </ListNavigatorProvider>
  );
};

PopoutSearchableSelect.displayName = 'PopoutSearchableSelect';
