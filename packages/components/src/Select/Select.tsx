import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import type { Key } from 'react-aria-components';
import { ClickableContainer } from '../ClickableContainer';
import { Field, splitFieldProps, type FieldOwnProps, type FieldLayoutConfig } from '../Field';
import { useElementSize } from '../hooks/useResizeObserver';
import { useMergeRefs } from '../hooks/useMergeRefs';
import { HiddenVisually } from '../HiddenVisually';
import {
  Listbox,
  getListboxOptionId,
  isValueSelected,
  toggleOption,
  useListboxTypeahead,
  type ListboxOption,
  type SelectionMode,
} from '../Listbox';
import { useManaContext } from '../ManaContext';
import { SelectInputField, type SelectInputFieldVariant } from '../SelectInputField';
import selectStyles from '../SelectInputField/SelectInputField.module.css';
import { TagGroup, type TagGroupItem } from '../TagGroup';
import { Text } from '../Text';
import { tokens, useToken } from '../tokens';
import { HiddenSelect } from './HiddenSelect';
import { SelectOption } from './SelectOption';
import { useSelectFloating } from './useSelectFloating';
import { useSelectOptions, type SelectOptions } from './useSelectOptions';

const SelectValue = <T extends ListboxOption>({
  placeholder,
  selectionMode,
  selectedItems,
  onRemove,
  tagGroupRef,
}: {
  placeholder: string;
  selectionMode: SelectionMode;
  selectedItems: T[];
  onRemove: (keys: Set<Key>) => void;
  tagGroupRef: RefObject<HTMLDivElement | null>;
}) => {
  const { i18n } = useManaContext();
  if (selectedItems == null || selectedItems.length === 0) {
    return (
      <div className={selectStyles.placeholder}>
        <Text variant="body-md/normal" color="currentColor" lineClamp={1}>
          {placeholder}
        </Text>
      </div>
    );
  }
  if (selectionMode === 'multiple') {
    return (
      <TagGroup
        listRef={tagGroupRef}
        label={i18n.SELECTED_TAGS_HEADING}
        // The selected options themselves serve as tags, as in Discord.
        items={selectedItems as unknown as TagGroupItem[]}
        layout="inline"
        onRemove={onRemove}
      />
    );
  }
  return <SelectOption {...selectedItems[0]} inInput />;
};

SelectValue.displayName = 'SelectValue';

// A hidden copy of the list, measured so the field can be as wide as its widest option.
const useMeasuredOptionsWidth = <T extends ListboxOption>(options: T[], selectionMode: SelectionMode) => {
  const { ref, width } = useElementSize();
  const id = useId();
  return {
    measuredWidth: width,
    itemsForMeasurement: useMemo(
      () => (
        <div
          ref={ref}
          style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 'max-content' }}
          aria-hidden="true"
        >
          <Listbox
            id={`measurement-${id}`}
            required={false}
            items={options}
            selectionMode={selectionMode}
            selectedItems={[]}
            onSelectionChange={() => {}}
            shouldFocusWrap={false}
            renderListItem={(item) => <SelectOption {...item} />}
          />
        </div>
      ),
      [options, selectionMode, id, ref],
    ),
  };
};

interface SelectBaseProps<T extends ListboxOption> extends FieldOwnProps {
  readOnly?: boolean;
  autoFocus?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  closeOnSelect?: boolean;
  shouldFocusWrap?: boolean;
  placeholder?: string;
  name?: string;
  form?: string;
  autoComplete?: string;
  maxOptionsVisible?: number;
  // Size the field to its widest option instead of the default column width.
  fitContent?: boolean;
  options: SelectOptions<T>;
  formatOption?: (option: T) => T;
  wrapTags?: boolean;
  variant?: SelectInputFieldVariant;
}

export interface SingleSelectProps<T extends ListboxOption = ListboxOption> extends SelectBaseProps<T> {
  selectionMode: 'single';
  value: T['value'] | null | undefined;
  onSelectionChange: (value: T['value'] | null | undefined) => void;
}

export interface MultipleSelectProps<T extends ListboxOption = ListboxOption> extends SelectBaseProps<T> {
  selectionMode: 'multiple';
  value: T['value'][];
  onSelectionChange: (value: T['value'][]) => void;
}

export type SelectProps<T extends ListboxOption = ListboxOption> = SingleSelectProps<T> | MultipleSelectProps<T>;

/** A button that opens a dropdown list of options; single or multiple selection. */
export const Select = <T extends ListboxOption = ListboxOption>(props: SelectProps<T>) => {
  const { i18n } = useManaContext();
  const {
    selectionMode,
    readOnly,
    autoFocus,
    clearable,
    fullWidth,
    closeOnSelect,
    shouldFocusWrap,
    placeholder = i18n.SELECT_PLACEHOLDER,
    name,
    form,
    autoComplete,
    maxOptionsVisible = 5,
    fitContent = false,
    options: optionsProp,
    formatOption,
    onSelectionChange: onSelectionChangeProp,
    value,
    wrapTags = false,
    variant = 'default',
    ...rest
  } = props;
  // The value's shape follows selectionMode; internally both are handled through one callback.
  const onSelectionChange = onSelectionChangeProp as (value: T['value'] | T['value'][] | null | undefined) => void;
  const tagGroupRef = useRef<HTMLDivElement>(null);
  const { fieldProps } = splitFieldProps(rest);
  const { id, required, label, disabled } = fieldProps;
  const { isOpen, setIsOpen, refs, floatingStyles, getFloatingProps, transitionStyles } = useSelectFloating();
  const listboxId = useId();
  const { options, groups, loading } = useSelectOptions({
    active: isOpen,
    options: optionsProp,
    renderOption: formatOption,
  });
  const buttonRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeDescendant = activeIndex != null ? getListboxOptionId(listboxId, activeIndex) : undefined;
  // Opened by Home/End or typeahead: keep that option active instead of jumping to the selection.
  const openedWithActiveIndex = useRef(false);
  const skipBlurCommit = useRef(false);
  const shouldCloseOnSelect = closeOnSelect ?? selectionMode !== 'multiple';
  const hasValue = Array.isArray(value) ? value.length > 0 : value != null;
  const isInert = disabled || readOnly;
  const { measuredWidth, itemsForMeasurement } = useMeasuredOptionsWidth(options, selectionMode);

  const handleToggle = useCallback(() => {
    if (!isInert) setIsOpen(!isOpen);
  }, [isInert, setIsOpen, isOpen]);
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (isOpen && event.button === 0) event.preventDefault();
    },
    [isOpen],
  );
  const close = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [setIsOpen]);
  const handleClear = useCallback(() => {
    if (clearable === false) return;
    if (selectionMode === 'multiple') onSelectionChange([]);
    else onSelectionChange(null);
    buttonRef.current?.focus();
  }, [onSelectionChange, selectionMode, clearable]);

  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  const containerRef = useRef<HTMLDivElement>(null);
  const handleBlur = useCallback(
    (event: FocusEvent) => {
      if (containerRef.current?.contains(event.relatedTarget as Node | null)) return;
      if (skipBlurCommit.current) {
        skipBlurCommit.current = false;
        return;
      }
      if (isOpen && selectionMode === 'single' && activeIndex != null) {
        const option = options[activeIndex];
        if (option != null && option.disabled !== true) onSelectionChange(option.value);
      }
      if (isOpen) setIsOpen(false);
    },
    [isOpen, selectionMode, activeIndex, options, onSelectionChange, setIsOpen],
  );

  const selectedItems = useMemo(() => {
    const values = Array.isArray(value) ? value : [value];
    return options.filter((option) => isValueSelected(option.value, values));
  }, [value, options]);

  const handleSelectionChange = useCallback(
    (items: Iterable<T>) => {
      if (isInert) return;
      const next = Array.from(items);
      if (selectionMode === 'multiple' && next.length < 1) onSelectionChange([]);
      else if (selectionMode === 'multiple') onSelectionChange(next.map((item) => item.value));
      else onSelectionChange(next[0]?.value);
      if (shouldCloseOnSelect && isOpen) close();
    },
    [isInert, selectionMode, onSelectionChange, shouldCloseOnSelect, close, isOpen],
  );

  const { activeIndex: typeaheadIndex, handleKeyDown: handleTypeahead } = useListboxTypeahead(true, options);
  const previousTypeaheadIndex = useRef<number | null>(null);
  useEffect(() => {
    const changed = typeaheadIndex !== previousTypeaheadIndex.current;
    previousTypeaheadIndex.current = typeaheadIndex;
    if (typeaheadIndex != null && changed) {
      setActiveIndex(typeaheadIndex);
      if (!isOpen) {
        openedWithActiveIndex.current = true;
        setIsOpen(true);
      }
    }
  }, [typeaheadIndex, isOpen, setIsOpen]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isInert) return;
      const count = options.length;
      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown': {
          const step = event.key === 'PageDown' ? 10 : 1;
          if (count === 0) return;
          event.preventDefault();
          if (!isOpen || event.altKey) {
            if (!isOpen) setIsOpen(true);
            return;
          }
          setActiveIndex((current) => {
            if (current === null) return 0;
            const next = current + step;
            return next >= count && shouldFocusWrap ? 0 : Math.min(next, count - 1);
          });
          break;
        }
        case 'ArrowUp':
        case 'PageUp': {
          const step = event.key === 'PageUp' ? 10 : 1;
          if (count === 0) return;
          event.preventDefault();
          if (event.altKey && isOpen) {
            if (activeIndex != null) {
              const option = options[activeIndex];
              if (option != null && option.disabled !== true) {
                handleSelectionChange([option]);
                break;
              }
            }
            close();
            break;
          }
          if (!isOpen) {
            setIsOpen(true);
            return;
          }
          setActiveIndex((current) => {
            if (current === null) return 0;
            const next = current - step;
            return next < 0 && shouldFocusWrap ? count - 1 : Math.max(next, 0);
          });
          break;
        }
        case 'Enter':
        case ' ':
          event.preventDefault();
          event.stopPropagation();
          if (!isOpen) {
            setIsOpen(true);
            return;
          }
          if (activeIndex == null || activeIndex > count - 1) return;
          {
            const option = options[activeIndex];
            if (option == null || option.disabled === true) return;
            handleSelectionChange(
              selectionMode === 'single' ? [option] : toggleOption(selectionMode, selectedItems, option),
            );
          }
          break;
        case 'Home':
          event.preventDefault();
          if (count === 0) return;
          setActiveIndex(0);
          if (!isOpen) {
            openedWithActiveIndex.current = true;
            setIsOpen(true);
          }
          break;
        case 'End':
          event.preventDefault();
          if (count === 0) return;
          setActiveIndex(count - 1);
          if (!isOpen) {
            openedWithActiveIndex.current = true;
            setIsOpen(true);
          }
          break;
        case 'Tab':
          if (isOpen && selectionMode === 'single' && activeIndex != null) {
            const option = options[activeIndex];
            if (option != null && option.disabled !== true) onSelectionChange(option.value);
          }
          skipBlurCommit.current = true;
          setIsOpen(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          (tagGroupRef.current?.firstChild as HTMLElement | null)?.focus();
          break;
        case 'ArrowRight':
          event.preventDefault();
          (tagGroupRef.current?.lastChild as HTMLElement | null)?.focus();
          break;
        case 'Backspace':
          if (hasValue) {
            event.preventDefault();
            (tagGroupRef.current?.lastChild as HTMLElement | null)?.focus();
          }
          break;
        case 'Escape':
          if (isOpen) {
            event.preventDefault();
            event.stopPropagation();
            close();
          } else if (hasValue && clearable) {
            event.preventDefault();
            event.stopPropagation();
            handleClear();
          }
          break;
        default:
          handleTypeahead(event);
      }
    },
    [
      isInert,
      isOpen,
      options,
      shouldFocusWrap,
      selectionMode,
      selectedItems,
      activeIndex,
      onSelectionChange,
      handleSelectionChange,
      close,
      handleClear,
      handleTypeahead,
      hasValue,
      clearable,
      setIsOpen,
    ],
  );

  const minWidth = useMemo(() => {
    if (!fullWidth || fitContent) {
      return `${
        Math.max(measuredWidth ?? 200, 200) * (selectionMode === 'multiple' ? 1.5 : 1) +
        24 * Number(!!clearable) +
        36 +
        12
      }px`;
    }
  }, [fullWidth, fitContent, measuredWidth, selectionMode, clearable]);

  const showsTags = selectionMode === 'multiple' && selectedItems.length > 0;
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(scrollTimeout.current);
    if (showsTags && !wrapTags) {
      scrollTimeout.current = setTimeout(() => {
        tagGroupRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'end' });
      }, 10);
    }
  }, [selectedItems, showsTags, wrapTags]);

  const mergedFieldRef = useMergeRefs(fieldRef, refs.setReference);
  const handleRemove = useCallback(
    (keys: Set<Key>) => {
      if (isInert) return;
      const removed = Array.from(keys)[0];
      const remaining = selectedItems.filter((item) => item.id !== removed);
      handleSelectionChange(remaining);
      if (remaining.length === 0) buttonRef.current?.focus();
    },
    [handleSelectionChange, selectedItems, isInert],
  );

  const lastSelectedIndex = Math.max(
    options.findIndex((option) => option.id === selectedItems[selectedItems.length - 1]?.id),
    0,
  );
  const hasOpened = useRef(false);
  useEffect(() => {
    if (!loading && isOpen && !hasOpened.current) {
      hasOpened.current = true;
      // Opening highlights the last selected option unless a key already chose one.
      if (!openedWithActiveIndex.current) setActiveIndex(options.length > 0 ? lastSelectedIndex : null);
      openedWithActiveIndex.current = false;
      buttonRef.current?.focus();
    } else if (!isOpen) {
      hasOpened.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(null);
      openedWithActiveIndex.current = false;
    }
  }, [loading, isOpen, lastSelectedIndex, options.length]);

  const maxWidth = useToken(tokens.modules.select.MAX_WIDTH) as number;
  const layoutConfig = useMemo<FieldLayoutConfig>(
    () =>
      fitContent && minWidth != null
        ? { horizontalControlColumnWidth: minWidth }
        : { horizontalControlColumnWidth: `min(${maxWidth}px, auto)` },
    [fitContent, minWidth, maxWidth],
  );

  return (
    <Field {...fieldProps} layoutConfig={layoutConfig}>
      {(field) => (
        <div ref={containerRef} style={{ width: fullWidth ? '100%' : `minmax(${minWidth}px, 100%)` }}>
          <SelectInputField
            ref={mergedFieldRef}
            disabled={disabled}
            readOnly={readOnly}
            loading={loading}
            clearable={clearable}
            fullWidth={fullWidth}
            isOpen={isOpen}
            isInert={isInert}
            hasValue={hasValue}
            hasError={field?.errorMessageId != null}
            handleToggle={handleToggle}
            handleClear={handleClear}
            variant={variant}
          >
            <ClickableContainer
              aria-label={label as string | undefined}
              buttonRef={buttonRef}
              buttonProps={{
                ...(id != null ? { id } : {}),
                style: { marginLeft: -4 },
                role: 'combobox',
                'aria-haspopup': 'listbox',
                'aria-controls': isOpen ? listboxId : undefined,
                'aria-expanded': isOpen,
                'aria-activedescendant': activeDescendant,
                'aria-errormessage': field?.errorMessageId,
                'aria-invalid': field?.errorMessageId != null,
                'aria-required': required,
                children: <HiddenVisually>{selectedItems.map((item) => item.label).join(', ')}</HiddenVisually>,
              }}
              focusProps={{ ringTarget: fieldRef }}
              className={clsx(selectStyles.selectButton, {
                [selectStyles.wrapTags]: wrapTags,
                [selectStyles.multiSelect]: selectionMode === 'multiple',
              })}
              onClick={handleToggle}
              onMouseDown={handleMouseDown}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              aria-describedby={field?.describedById}
            >
              <HiddenVisually>
                {label}
                {', '}
              </HiddenVisually>
              <SelectValue
                tagGroupRef={tagGroupRef}
                placeholder={placeholder}
                selectionMode={selectionMode}
                selectedItems={selectedItems}
                onRemove={handleRemove}
              />
            </ClickableContainer>
          </SelectInputField>
          <HiddenSelect
            name={name}
            form={form}
            disabled={isInert}
            autoComplete={autoComplete}
            selectionMode={selectionMode}
            selectedItems={selectedItems}
            onSelectionChange={handleSelectionChange}
            listItems={options}
          />
          {(!fullWidth || fitContent) && itemsForMeasurement}
          {!isInert && isOpen && (
            <div
              ref={refs.setFloating}
              className={selectStyles.selectDropdown}
              {...getFloatingProps()}
              style={{ ...floatingStyles, ...transitionStyles }}
            >
              <Listbox
                id={listboxId}
                tabIndex={-1}
                required={required}
                items={options}
                groups={groups}
                selectionMode={selectionMode}
                selectedItems={selectedItems}
                onSelectionChange={handleSelectionChange}
                shouldFocusWrap={shouldFocusWrap}
                activeDescendantIndex={activeIndex}
                renderListItem={(item) => <SelectOption {...item} />}
                maxVisibleItems={maxOptionsVisible}
                loading={loading}
              />
            </div>
          )}
        </div>
      )}
    </Field>
  );
};

Select.displayName = 'Select';
