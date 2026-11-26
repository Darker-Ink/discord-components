import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { CheckmarkSmallBoldIcon } from '@discord-components/icons';
import { Checkbox } from '../Checkbox';
import { ListAuto, type ListRowItem, type ListScrollerHandle, type ListSectionItem } from '../ListScroller';
import {
  ListNavigatorContainer,
  ListNavigatorProvider,
  getListItemSelector,
  makeListItemId,
  useListItem,
  useListNavigator,
} from '../ListNavigator';
import { useManaContext } from '../ManaContext';
import marqueeStyles from '../MarqueeText/MarqueeText.module.css';
import { Spinner, SpinnerTypes } from '../Spinner';
import { Text } from '../Text';
import { tokens } from '../tokens';
import type { ListboxGroup, ListboxOption, SelectionMode } from './types';
import { getListboxOptionId } from './utils';
import emptyStateStyles from './ListboxEmptyState.module.css';
import styles from './Listbox.module.css';

const OPTION_HEIGHT = tokens.modules.select.OPTION_HEIGHT.resolve({}) as number;
const OPTION_WITH_DESCRIPTION_HEIGHT = OPTION_HEIGHT + 4;
const SECTION_HEADER_HEIGHT = 26;
const NO_GROUPS: ListboxGroup[] = [];

const hasDescription = (option: ListboxOption) => option.description != null && option.description !== '';

export const ListboxEmptyState = ({ message }: { message?: ReactNode }) => {
  const { i18n } = useManaContext();
  return (
    <div className={emptyStateStyles.emptyState} role="status">
      <Text variant="body-md/medium" className={emptyStateStyles.emptyStateText}>
        {message ?? i18n.LISTBOX_EMPTY_STATE}
      </Text>
    </div>
  );
};

ListboxEmptyState.displayName = 'ListboxEmptyState';

/** A display-only checkbox marking selected options in multiple selection mode. */
export const ListboxCheckboxIndicator = ({ checked, disabled }: { checked?: boolean; disabled?: boolean }) => (
  <Checkbox checked={checked} disabled={disabled} displayOnly usageVariant="indicator" />
);

ListboxCheckboxIndicator.displayName = 'ListboxCheckboxIndicator';

/** Type-to-select: the index of the first option whose label starts with what was typed in the last 750ms. */
export const useListboxTypeahead = (enabled: boolean, options: ListboxOption[]) => {
  const [query, setQuery] = useState('');
  const labels = useMemo(
    () =>
      enabled
        ? options.map((option) =>
            option.label != null && typeof option.label.toLowerCase === 'function' ? option.label.toLowerCase() : '',
          )
        : [],
    [options, enabled],
  );
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.key.length > 1) return;
    setQuery((current) => current + event.key);
  }, []);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    timeout.current = setTimeout(() => {
      setQuery('');
    }, 750);
    return () => {
      clearTimeout(timeout.current);
    };
  }, [query]);
  return {
    activeIndex: useMemo(() => {
      if (query === '' || !enabled) return null;
      const index = labels.findIndex((label) => label.startsWith(query.toLowerCase()));
      return index >= 0 ? index : null;
    }, [labels, query, enabled]),
    handleKeyDown,
  };
};

interface ListboxItemProps {
  children?: ReactNode;
  id: string;
  descriptionId?: string;
  tabIndex: number;
  selected: boolean;
  disabled?: boolean;
  focused: boolean;
  selectionMode: SelectionMode;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
}

const ListboxItem = ({
  children,
  id,
  descriptionId,
  tabIndex,
  selected,
  disabled,
  focused,
  selectionMode,
  onClick,
}: ListboxItemProps) => {
  const listItemProps = useListItem(id);
  return (
    <div
      {...listItemProps}
      id={id}
      className={clsx(styles.listBoxItem, marqueeStyles.row)}
      role="option"
      tabIndex={tabIndex === -1 ? -1 : listItemProps.tabIndex}
      onClick={onClick}
      aria-disabled={disabled}
      aria-selected={selected}
      aria-describedby={descriptionId}
      data-focus-visible={focused}
      data-marquee-active={focused}
    >
      {children}
      <div className={styles.selectedIcon} aria-hidden>
        {selectionMode === 'multiple' ? (
          <ListboxCheckboxIndicator checked={selected} />
        ) : selected ? (
          <CheckmarkSmallBoldIcon color="currentColor" size="refresh_sm" />
        ) : null}
      </div>
    </div>
  );
};

ListboxItem.displayName = 'ListboxItem';

// Section and row of a flat option index, given each group's size.
const getSectionRow = (groups: ListboxGroup[], index: number): [number, number] => {
  let start = 0;
  for (let section = 0; section < groups.length; section++) {
    const { count } = groups[section];
    if (index < start + count) return [section, index - start];
    start += count;
  }
  return [0, index];
};

const getFlatIndex = (groups: ListboxGroup[], section: number, row: number) => {
  let start = 0;
  for (let i = 0; i < section; i++) start += groups[i].count;
  return start + row;
};

// How many group headers appear among the first `limit` options.
const countVisibleHeaders = (groups: ListboxGroup[], limit: number) => {
  let headers = 0;
  let start = 0;
  for (const group of groups) {
    if (start < limit) headers++;
    start += group.count;
  }
  return headers;
};

export interface ListboxProps<T extends ListboxOption = ListboxOption> {
  id?: string;
  tabIndex?: number;
  required?: boolean;
  disabled?: boolean;
  selectionMode?: SelectionMode;
  items: T[];
  groups?: ListboxGroup[];
  defaultSelectedItems?: T[];
  selectedItems?: T[] | null;
  onSelectionChange?: (items: T[]) => void;
  // The option shown as focused while DOM focus stays elsewhere (a select's trigger or combobox input).
  activeDescendantIndex?: number | null;
  shouldFocusWrap?: boolean;
  renderListItem?: (item: T, descriptionId: string | undefined) => ReactNode;
  renderEmptyState?: () => ReactNode;
  maxVisibleItems?: number | null;
  loading?: boolean;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  typeahead?: boolean;
}

/** A virtualized list of selectable options, optionally grouped under headers. */
export const Listbox = <T extends ListboxOption = ListboxOption>({
  id,
  tabIndex = 0,
  required = false,
  disabled = false,
  selectionMode = 'single',
  items,
  groups = NO_GROUPS,
  defaultSelectedItems,
  selectedItems,
  onSelectionChange,
  activeDescendantIndex,
  shouldFocusWrap = false,
  renderListItem,
  renderEmptyState,
  maxVisibleItems = 5,
  loading = false,
  onBlur,
  onFocus,
  typeahead = false,
}: ListboxProps<T>) => {
  const generatedId = useId();
  const listboxId = id ?? generatedId;
  const listRef = useRef<ListScrollerHandle>(null);
  const indexedItems = useMemo(() => items.map((item, index) => ({ ...item, index })), [items]);
  const [uncontrolledSelection, setUncontrolledSelection] = useState<T[]>(defaultSelectedItems ?? []);
  const isControlled = selectedItems != null;
  const selection = isControlled ? selectedItems : uncontrolledSelection;
  const navigator = useListNavigator({
    id: listboxId,
    defaultFocused: activeDescendantIndex != null ? getListboxOptionId(listboxId, activeDescendantIndex) : undefined,
    async scrollToEnd() {},
    async scrollToStart() {},
    isEnabled: !disabled,
    wrap: shouldFocusWrap,
    preserveFocusPosition: false,
    useVirtualFocus: tabIndex === -1,
  });
  const groupsRef = useRef(groups);
  useLayoutEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (activeDescendantIndex != null) {
        const [section, row] = getSectionRow(groupsRef.current, activeDescendantIndex);
        listRef.current?.scrollToIndex({ section, row });
      }
    });
  }, [listboxId, activeDescendantIndex]);

  const { activeIndex: typeaheadIndex, handleKeyDown: handleTypeahead } = useListboxTypeahead(typeahead, indexedItems);
  useEffect(() => {
    if (typeaheadIndex != null && typeahead && tabIndex !== -1) {
      const selector = getListItemSelector(makeListItemId(listboxId, getListboxOptionId(listboxId, typeaheadIndex)));
      document.querySelector<HTMLElement>(selector)?.focus();
    }
  }, [typeaheadIndex, indexedItems, typeahead, listboxId, tabIndex]);

  const rowHeight = useCallback(
    (section: number, row: number) =>
      hasDescription(indexedItems[getFlatIndex(groups, section, row)]) ? OPTION_WITH_DESCRIPTION_HEIGHT : OPTION_HEIGHT,
    [indexedItems, groups],
  );

  const toggle = useCallback(
    (item: T) => {
      if (required === true && selection.length === 1 && selection.includes(item)) return;
      let next = [...selection];
      if (selectionMode === 'multiple') {
        if (selection.find((selected) => selected.id === item.id) != null) {
          next = selection.filter((selected) => selected.id !== item.id);
        } else next.push(item);
      } else next = [item];
      if (!isControlled) setUncontrolledSelection(next);
      onSelectionChange?.(next);
    },
    [required, selection, onSelectionChange, isControlled, selectionMode],
  );

  const renderDefaultContent = useCallback((item: T, descriptionId: string | undefined) => {
    const { label, description } = item;
    const withDescription = hasDescription(item);
    return (
      <div className={styles.listBoxItemContent} data-has-description={withDescription || undefined}>
        <Text variant="body-md/medium" color="currentColor" className={styles.listBoxItemLabel}>
          {label}
        </Text>
        {withDescription && (
          <Text
            id={descriptionId}
            variant="body-sm/normal"
            color="text-subtle"
            lineClamp={1}
            className={styles.listBoxItemDescription}
          >
            {description}
          </Text>
        )}
      </div>
    );
  }, []);

  let content: ReactNode;
  if (loading) {
    content = (
      <div className={styles.loadingSpinnerWrapper} aria-busy>
        <Spinner
          type={SpinnerTypes.PULSING_ELLIPSIS}
          className={styles.loadingSpinner}
          itemClassName={styles.loadingSpinnerInner}
        />
      </div>
    );
  } else if (indexedItems.length > 0) {
    const grouped = groups.length > 0;
    content = (
      <ListAuto
        ref={listRef}
        style={{
          height:
            maxVisibleItems != null
              ? `${
                  indexedItems
                    .slice(0, maxVisibleItems)
                    .reduce(
                      (height, item) =>
                        height + (hasDescription(item) ? OPTION_WITH_DESCRIPTION_HEIGHT : OPTION_HEIGHT),
                      0,
                    ) +
                  SECTION_HEADER_HEIGHT * countVisibleHeaders(groups, maxVisibleItems)
                }px`
              : '100%',
        }}
        role={undefined}
        tabIndex={tabIndex}
        rowHeight={rowHeight}
        sections={grouped ? groups.map((group) => group.count) : [indexedItems.length]}
        sectionHeight={SECTION_HEADER_HEIGHT * Number(grouped)}
        renderSection={
          grouped
            ? ({ section }: ListSectionItem) => (
                <Text
                  key={`section-${section}`}
                  aria-hidden
                  variant="body-sm/semibold"
                  color="text-muted"
                  className={styles.listBoxSectionHeader}
                >
                  {groups[section].label}
                </Text>
              )
            : () => null
        }
        wrapSection={
          grouped
            ? (section: number, children: ReactNode[]) => (
                <div key={`section-group-${section}`} role="group" aria-label={groups[section].label}>
                  {children}
                </div>
              )
            : undefined
        }
        renderRow={({ rowIndex }: ListRowItem) => {
          const item = indexedItems[rowIndex];
          const optionId = getListboxOptionId(listboxId, rowIndex);
          const descriptionId = renderListItem == null && hasDescription(item) ? `${optionId}-desc` : undefined;
          const selected = selection.length !== 0 && selection.find((selected) => selected.id === item.id) != null;
          return (
            <ListboxItem
              key={item.index}
              id={optionId}
              descriptionId={descriptionId}
              tabIndex={tabIndex}
              selectionMode={selectionMode}
              selected={selected}
              disabled={disabled || item.disabled}
              focused={rowIndex === activeDescendantIndex}
              onClick={() => {
                if (!disabled && !item.disabled) toggle(item);
              }}
            >
              {renderListItem?.(item, descriptionId) ?? renderDefaultContent(item, descriptionId)}
            </ListboxItem>
          );
        }}
      />
    );
  } else content = renderEmptyState?.() ?? <ListboxEmptyState />;

  return (
    <ListNavigatorProvider navigator={navigator}>
      <ListNavigatorContainer>
        {({ ref, onKeyDown, ...containerProps }) => (
          <div
            onBlur={onBlur}
            onFocus={onFocus}
            onMouseDown={tabIndex === -1 ? (event) => event.preventDefault() : undefined}
            aria-busy={loading}
            ref={ref as RefObject<HTMLDivElement | null>}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              handleTypeahead(event);
            }}
            {...containerProps}
            role="listbox"
            tabIndex={tabIndex}
            aria-multiselectable={selectionMode === 'multiple'}
            className={clsx(styles.listBox, { [styles.scrollable]: indexedItems.length > (maxVisibleItems ?? 0) })}
            data-mana-component="listbox"
          >
            {content}
          </div>
        )}
      </ListNavigatorContainer>
    </ListNavigatorProvider>
  );
};

Listbox.displayName = 'Listbox';
