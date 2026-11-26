import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { ChevronSmallDownIcon, ChevronSmallUpIcon, CircleCheckIcon, XSmallIcon } from '@discord-components/icons';
import { Clickable, type ClickableProps } from '../Clickable';
import { useFocusLock } from '../Dialog';
import { Field, splitFieldProps, type FieldOwnProps } from '../Field';
import { useElementSize, useStableCallback } from '../hooks';
import { InputField } from '../InputField';
import type { LayerContext, ReferencePosition } from '../Layer';
import {
  ListNavigatorContainer,
  ListNavigatorProvider,
  makeListItemId,
  useListItem,
  useListNavigator,
} from '../ListNavigator';
import { subscribeToFocusChange } from '../ListNavigator/utils';
import type { ListboxOption, ListboxOptionAccessory } from '../Listbox';
import { LoadingDots } from '../LoadingDots';
import { Popout } from '../Popout';
import { ScrollerNone, ScrollerThin } from '../Scroller';
import { Select } from '../Select';
import { Text } from '../Text';
import styles from './VoidSelect.module.css';

// The client's English strings.
const SELECT_PLACEHOLDER = 'Select';
const CLEAR_LABEL = 'Clear';

export interface VoidSelectOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
  key?: string;
  preventCloseOnSelect?: boolean;
}

export interface VoidSelectStateProps<T> {
  select: (value: T) => void;
  isSelected: (value: T) => boolean;
  serialize: (value: T) => string;
  clear?: () => void;
}

interface SelectInteractionResult<T> {
  newValues: Set<T>;
  updated: boolean;
}

type SelectInteraction<T> = (value: T, current: Set<T>) => SelectInteractionResult<T>;

/** Single choice: picking the current value again changes nothing. */
export const selectSingle = <T,>(value: T, current: Set<T>): SelectInteractionResult<T> =>
  current.has(value) ? { newValues: current, updated: false } : { newValues: new Set([value]), updated: true };

/** Single choice that clears when the current value is picked again. */
export const selectSingleToggle = <T,>(value: T, current: Set<T>): SelectInteractionResult<T> =>
  current.has(value) ? { newValues: new Set(), updated: true } : { newValues: new Set([value]), updated: true };

/** Multiple choice: picking a value toggles it. */
export const selectMultiToggle = <T,>(value: T, current: Set<T>): SelectInteractionResult<T> => {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return { newValues: next, updated: true };
};

export interface UseVariableSelectOptions<T> {
  value: Set<T> | null | undefined;
  onChange: (value: Set<T>) => void;
  onSelectInteraction: SelectInteraction<T>;
  serialize?: (value: T) => string;
}

/** State props for a `VoidVariableSelect` holding a set of values. */
export const useVariableSelect = <T,>({
  value,
  onChange,
  onSelectInteraction,
  serialize = (item: T) => String(item),
}: UseVariableSelectOptions<T>): VoidSelectStateProps<T> => ({
  select: (item: T) => {
    const { newValues, updated } = onSelectInteraction(item, value as Set<T>);
    if (updated) onChange(newValues);
  },
  isSelected: (item: T) => value?.has(item) ?? false,
  clear: () => onChange(new Set()),
  serialize,
});

export type VoidSelectSize = 'sm' | 'md';

export type VoidSelectVariant = 'filled' | 'text-only';

interface PopoutSelectProps<T, O extends VoidSelectOption<T>>
  extends
    VoidSelectStateProps<T>,
    Pick<FieldOwnProps, 'label' | 'description' | 'helperText' | 'errorMessage' | 'successMessage' | 'layout'> {
  options: O[];
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  maxVisibleItems?: number;
  autoFocus?: boolean;
  popoutWidth?: number | 'auto';
  clearable?: boolean;
  size?: VoidSelectSize;
  variant?: VoidSelectVariant;
  onClose?: () => void;
  onOpen?: () => void;
  renderOptionLabel?: (option: O) => ReactNode;
  renderOptionValue?: (options: O[]) => ReactNode;
  popoutClassName?: string;
  popoutPosition?: ReferencePosition;
  popoutLayerContext?: LayerContext;
  optionClassName?: string;
  closeOnSelect?: boolean;
  hideIcon?: boolean;
  isProcessing?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const getOptionLabel = (option: VoidSelectOption | undefined) => option?.label;

const joinOptionLabels = (options: VoidSelectOption[]) => options.map((option) => getOptionLabel(option)).join(', ');

// Calls `onChange(isVisible)` as the element enters or leaves full visibility.
const useVisibilityObserver = (onChange: (isVisible: boolean) => void, threshold = 1) => {
  const callback = useStableCallback((entry: IntersectionObserverEntry) => onChange(entry.isIntersecting));
  const ref = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element == null) return;
    const observer = new IntersectionObserver((entries) => entries.forEach(callback), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, threshold]);
  return ref;
};

// Repositions every animation frame while mounted.
const useAnimationFrameLoop = (callback: () => void) => {
  const stableCallback = useStableCallback(callback);
  useEffect(() => {
    let stopped = false;
    let frame = requestAnimationFrame(function tick() {
      if (stopped) return;
      stableCallback();
      frame = requestAnimationFrame(tick);
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  });
};

interface SelectOptionRowProps<T> {
  className?: string;
  value: T;
  label: ReactNode;
  onSelect: (value: T, preventCloseOnSelect?: boolean) => void;
  isSelected: boolean;
  isDisabled?: boolean;
  preventCloseOnSelect?: boolean;
  serialize: (value: T) => string;
  omitId?: boolean;
}

const SelectOptionRow = <T,>({
  className,
  value,
  label,
  onSelect,
  isSelected,
  isDisabled,
  preventCloseOnSelect,
  serialize,
  omitId = false,
}: SelectOptionRowProps<T>) => {
  const itemProps = useListItem(serialize(value));
  return (
    <Clickable
      focusProps={{ enabled: false }}
      className={clsx(styles.option, className, { [styles.optionDisabled]: isDisabled })}
      onClick={() => !isDisabled && onSelect(value, preventCloseOnSelect)}
      {...itemProps}
      id={omitId ? undefined : itemProps['data-list-item-id']}
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      role="option"
    >
      {label}
      {isSelected && (
        <CircleCheckIcon
          size="custom"
          color="currentColor"
          secondaryColor="white"
          className={styles.selectedIcon}
          width={20}
          height={20}
        />
      )}
    </Clickable>
  );
};

SelectOptionRow.displayName = 'SelectOptionRow';

interface SelectPopoutProps<T, O extends VoidSelectOption<T>> {
  className?: string;
  onSelect: (value: T) => void;
  closePopout: () => void;
  closeOnSelect?: boolean;
  isSelected: (value: T) => boolean;
  options: O[];
  width?: number;
  maxVisibleItems: number;
  renderOptionLabel: (option: O) => ReactNode;
  serialize: (value: T) => string;
  optionClassName?: string;
  buttonHeight: number;
  buttonRef: { current: HTMLElement | null };
  updatePosition: () => void;
  popoutPosition?: string | null;
}

const SelectPopout = <T, O extends VoidSelectOption<T>>({
  className,
  onSelect,
  closePopout,
  closeOnSelect = true,
  isSelected,
  options,
  width,
  maxVisibleItems,
  renderOptionLabel,
  serialize,
  optionClassName,
  buttonHeight,
  buttonRef,
  updatePosition,
  popoutPosition,
}: SelectPopoutProps<T, O>) => {
  const [maxHeight, setMaxHeight] = useState(0);
  const measurementRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const navigator = useListNavigator({
    id: listId,
    async scrollToEnd() {},
    async scrollToStart() {},
    isEnabled: true,
    wrap: true,
  });
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  useEffect(() => subscribeToFocusChange(listId, (itemId) => setFocusedItem(itemId)), [listId]);
  const scrollerRef = useRef<HTMLElement | null>(null);
  useFocusLock(scrollerRef, { returnRef: buttonRef });
  useLayoutEffect(() => {
    scrollerRef.current?.focus();
  }, []);
  useEffect(() => {
    if (buttonHeight > 0) updatePosition();
  }, [buttonHeight, updatePosition]);
  useAnimationFrameLoop(updatePosition);
  useLayoutEffect(() => {
    const height = measurementRef.current?.getBoundingClientRect()?.height;
    if (height != null) setMaxHeight(height);
  }, [maxVisibleItems, options.length]);
  useEffect(() => {
    updatePosition();
  }, [updatePosition, maxHeight]);
  const handleSelect = useCallback(
    (value: T, preventCloseOnSelect?: boolean) => {
      onSelect(value);
      if (closeOnSelect && !preventCloseOnSelect) closePopout();
    },
    [closePopout, onSelect, closeOnSelect],
  );
  const rows = useMemo(
    () =>
      options.map((option, index) => (
        <SelectOptionRow
          key={option.key ?? index}
          isSelected={isSelected(option.value)}
          value={option.value}
          label={renderOptionLabel(option)}
          onSelect={handleSelect}
          className={optionClassName}
          isDisabled={option.disabled}
          preventCloseOnSelect={option.preventCloseOnSelect}
          serialize={serialize}
        />
      )),
    [handleSelect, isSelected, optionClassName, options, renderOptionLabel, serialize],
  );
  // An invisible copy of the first rows sizes the list to `maxVisibleItems`.
  const measuredRows = useMemo(
    () =>
      options
        .slice(0, maxVisibleItems)
        .map((option, index) => (
          <SelectOptionRow
            key={option.key ?? index}
            isSelected={isSelected(option.value)}
            value={option.value}
            label={renderOptionLabel(option)}
            onSelect={handleSelect}
            className={optionClassName}
            isDisabled={option.disabled}
            preventCloseOnSelect={option.preventCloseOnSelect}
            serialize={serialize}
            omitId
          />
        )),
    [handleSelect, isSelected, maxVisibleItems, optionClassName, options, renderOptionLabel, serialize],
  );
  const Scroller = options.length <= maxVisibleItems ? ScrollerNone : ScrollerThin;
  return (
    <ListNavigatorProvider navigator={navigator}>
      <ListNavigatorContainer>
        {({ ref, onKeyDown, ...containerProps }) => (
          <>
            <Scroller
              className={clsx(styles.popout, className, { [styles.popoutPositionTop]: popoutPosition === 'top' })}
              style={{ width, maxHeight }}
              ref={(node: HTMLDivElement | null) => {
                ref.current = node;
                scrollerRef.current = node;
              }}
              {...containerProps}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  event.preventDefault();
                  closePopout();
                  return;
                }
                onKeyDown(event);
              }}
              aria-activedescendant={focusedItem != null ? makeListItemId(listId, focusedItem) : undefined}
              role="listbox"
            >
              {rows}
            </Scroller>
            <div aria-hidden ref={measurementRef} className={styles.measurement}>
              {measuredRows}
            </div>
          </>
        )}
      </ListNavigatorContainer>
    </ListNavigatorProvider>
  );
};

SelectPopout.displayName = 'SelectPopout';

// InputField always hands its `ref` (undefined here) to `as`, and Clickable would spread that over its own ref.
const ClickableTrigger = ({ ref: _ref, ...props }: ClickableProps & { ref?: unknown }) => <Clickable {...props} />;

ClickableTrigger.displayName = 'ClickableTrigger';

// The pre-Mana select: a field that opens a popout list. Void selects use it for the text-only variant and
// whenever options render custom labels.
const PopoutSelect = <T, O extends VoidSelectOption<T>>({
  options,
  placeholder = SELECT_PLACEHOLDER,
  className,
  isDisabled = false,
  maxVisibleItems = 7,
  autoFocus = false,
  popoutWidth,
  clearable = false,
  size = 'md',
  variant = 'filled',
  onClose,
  onOpen,
  renderOptionLabel = getOptionLabel as (option: O) => ReactNode,
  renderOptionValue = joinOptionLabels as (options: O[]) => ReactNode,
  popoutClassName,
  popoutPosition = 'bottom',
  popoutLayerContext,
  optionClassName,
  closeOnSelect,
  select,
  isSelected,
  serialize,
  clear,
  hideIcon = false,
  isProcessing = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  label,
  description,
  helperText,
  errorMessage,
  successMessage,
  layout = 'vertical',
}: PopoutSelectProps<T, O>) => {
  const [isOpen, setIsOpen] = useState(false);
  const { ref: buttonRef, width, height } = useElementSize();
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isDisabled) setIsOpen(false);
  }, [isDisabled]);
  const setOpen = useCallback(
    (open: boolean) => {
      if (isOpen === open || isDisabled) return;
      setIsOpen(open);
      if (open) onOpen?.();
      else onClose?.();
    },
    [isDisabled, onClose, onOpen, isOpen],
  );
  const handleVisibilityChange = useCallback(
    (isVisible: boolean) => {
      if (isOpen && !isVisible) setOpen(false);
    },
    [setOpen, isOpen],
  );
  const visibilityRef = useVisibilityObserver(handleVisibilityChange);
  const handleSelect = useCallback(
    (value: T) => {
      select(value);
      if (closeOnSelect) buttonRef.current?.focus();
    },
    [select, closeOnSelect, buttonRef],
  );
  const handleClear = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      clear?.();
    },
    [clear],
  );
  const selectedOptions = options.filter((option) => isSelected(option.value));
  useLayoutEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus, buttonRef]);
  return (
    <Popout
      targetElementRef={buttonRef}
      spacing={0}
      animation={Popout.Animation.NONE}
      shouldShow={isOpen}
      onRequestOpen={() => setOpen(true)}
      onRequestClose={() => setOpen(false)}
      renderPopout={({ closePopout, position, updatePosition }) => (
        <SelectPopout
          className={popoutClassName}
          closeOnSelect={closeOnSelect}
          maxVisibleItems={maxVisibleItems}
          width={popoutWidth === 'auto' ? undefined : (popoutWidth ?? width)}
          isSelected={isSelected}
          closePopout={closePopout}
          buttonHeight={height ?? 0}
          buttonRef={buttonRef}
          onSelect={handleSelect}
          options={options}
          serialize={serialize}
          renderOptionLabel={renderOptionLabel}
          optionClassName={optionClassName}
          updatePosition={updatePosition}
          popoutPosition={position}
        />
      )}
      position={popoutPosition}
      layerContext={popoutLayerContext}
    >
      {({ onClick, onKeyDown, ...triggerProps }, { isShown }) => {
        const Chevron = isShown ? ChevronSmallUpIcon : ChevronSmallDownIcon;
        return (
          <Field
            label={label}
            description={description}
            helperText={helperText}
            errorMessage={errorMessage}
            successMessage={successMessage}
            layout={layout}
          >
            {(field) => (
              <InputField
                as={ClickableTrigger}
                // Clickable's own props, passed through InputField.
                {...{
                  tag: 'div',
                  innerRef: (node: HTMLElement | null) => {
                    buttonRef.current = node as HTMLDivElement | null;
                    visibilityRef.current = node;
                  },
                }}
                role="button"
                id={field?.controlId}
                aria-describedby={field?.describedById}
                aria-errormessage={field?.errorMessageId}
                aria-invalid={field?.errorMessageId != null}
                disabled={isDisabled}
                aria-busy={isProcessing}
                aria-disabled={isDisabled}
                fullWidth={layout === 'horizontal'}
                onClick={
                  isDisabled
                    ? undefined
                    : (event: MouseEvent<HTMLElement>) => {
                        onClick(event);
                        setOpen(!isOpen);
                      }
                }
                onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                  if (event.key === 'ArrowDown') setOpen(true);
                  else if (event.key === 'Escape' && isShown) {
                    event.stopPropagation();
                    setOpen(false);
                  }
                  onKeyDown(event);
                }}
                {...triggerProps}
                containerClassName={clsx(styles.container, className)}
                data-size={size}
                data-variant={variant}
                className={styles.select}
                aria-haspopup="listbox"
                aria-expanded={isShown}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
              >
                {selectedOptions.length > 0 ? (
                  <Text className={styles.value} variant="body-md/medium">
                    {renderOptionValue(selectedOptions)}
                  </Text>
                ) : (
                  <span className={styles.placeholder}>{placeholder}</span>
                )}
                <div className={styles.icons}>
                  {isProcessing ? (
                    <LoadingDots dotRadius={3.5} themed />
                  ) : (
                    <>
                      {clearable ? (
                        <Clickable
                          role="button"
                          aria-disabled={isDisabled}
                          onClick={handleClear}
                          aria-label={CLEAR_LABEL}
                        >
                          <XSmallIcon size="xs" color="currentColor" className={styles.clear} />
                        </Clickable>
                      ) : null}
                      {hideIcon ? null : <Chevron color="currentColor" size="sm" />}
                    </>
                  )}
                </div>
              </InputField>
            )}
          </Field>
        );
      }}
    </Popout>
  );
};

PopoutSelect.displayName = 'PopoutSelect';

type OptionAccessoryRenderer<O> = (option: O) => ListboxOptionAccessory | undefined;

const toListboxOption = <T, O extends VoidSelectOption<T>>(
  option: O,
  serialize: (value: T) => string,
  renderLeading?: OptionAccessoryRenderer<O>,
  renderTrailing?: OptionAccessoryRenderer<O>,
): ListboxOption<T> => ({
  id: option.key ?? serialize(option.value),
  value: option.value,
  label: option.label,
  disabled: option.disabled,
  leading: renderLeading != null ? renderLeading(option) : undefined,
  trailing: renderTrailing != null ? renderTrailing(option) : undefined,
});

// Leading and trailing accessories next to the label, for the popout select's custom option labels.
const getAccessoryLabelRenderer = <O extends VoidSelectOption>(
  renderLeading?: OptionAccessoryRenderer<O>,
  renderTrailing?: OptionAccessoryRenderer<O>,
) => {
  if (renderLeading == null && renderTrailing == null) return undefined;
  const renderOptionLabel = (option: O): ReactNode => (
    <div className={styles.newOptionLabel}>
      {renderLeading?.(option) as ReactNode}
      {option.label}
      {renderTrailing?.(option) as ReactNode}
    </div>
  );
  return renderOptionLabel;
};

interface VoidSelectSharedProps<T, O extends VoidSelectOption<T>>
  extends
    Omit<PopoutSelectProps<T, O>, keyof VoidSelectStateProps<T>>,
    Pick<FieldOwnProps, 'hideLabel' | 'badge' | 'icon' | 'required' | 'disabled' | 'id' | 'layoutConfig'> {
  renderLeading?: OptionAccessoryRenderer<O>;
  renderTrailing?: OptionAccessoryRenderer<O>;
}

export type VoidVariableSelectProps<T, O extends VoidSelectOption<T> = VoidSelectOption<T>> = VoidSelectSharedProps<
  T,
  O
> &
  VoidSelectStateProps<T>;

// The filled variant without custom option labels is the Mana Select; everything else is the popout select.
// Discord also hands `isProcessing` to the Mana Select as `loading`, which it ignores.
export const VoidVariableSelect = <T, O extends VoidSelectOption<T> = VoidSelectOption<T>>({
  renderLeading,
  renderTrailing,
  ...props
}: VoidVariableSelectProps<T, O>) => {
  const {
    serialize,
    options,
    select,
    autoFocus,
    clearable,
    closeOnSelect,
    maxVisibleItems,
    placeholder,
    'aria-label': ariaLabel,
    variant,
    isSelected,
    renderOptionLabel,
  } = props;
  const { fieldProps } = splitFieldProps(props);
  if (variant !== 'text-only' && renderOptionLabel == null) {
    const labelFromAria = fieldProps.label == null && ariaLabel != null;
    return (
      <Select
        selectionMode="single"
        onSelectionChange={(value) => select(value as T)}
        value={options?.find((option) => isSelected?.(option.value))?.value ?? undefined}
        options={options as unknown as ListboxOption[]}
        formatOption={(option) =>
          toListboxOption(option as unknown as O, serialize, renderLeading, renderTrailing) as ListboxOption
        }
        fullWidth
        autoFocus={autoFocus}
        clearable={clearable}
        closeOnSelect={closeOnSelect}
        maxOptionsVisible={maxVisibleItems}
        placeholder={placeholder}
        // The field props carry id, required and disabled. Like Discord's, their `disabled` wins over
        // `isDisabled`, so `isDisabled` only disables the popout select.
        {...fieldProps}
        label={labelFromAria ? ariaLabel : fieldProps.label}
        hideLabel={fieldProps.hideLabel === true || labelFromAria}
      />
    );
  }
  return (
    <PopoutSelect<T, O>
      {...props}
      renderOptionLabel={renderOptionLabel ?? getAccessoryLabelRenderer(renderLeading, renderTrailing)}
    />
  );
};

VoidVariableSelect.displayName = 'VoidVariableSelect';

export type VoidSelectProps<T, O extends VoidSelectOption<T> = VoidSelectOption<T>> = VoidSelectSharedProps<T, O> & {
  value: T | null | undefined;
  onChange: (value: T | null) => void;
};

/** A single-choice Void select holding its value in `value`. */
export const VoidSelect = <T, O extends VoidSelectOption<T> = VoidSelectOption<T>>({
  renderLeading,
  renderTrailing,
  value,
  onChange,
  ...props
}: VoidSelectProps<T, O>) => {
  const state: VoidSelectStateProps<T> = {
    select: (item) => onChange(item),
    isSelected: (item) => item === value,
    clear: () => onChange(null),
    serialize: (item) => String(item),
  };
  const {
    options,
    autoFocus,
    clearable,
    closeOnSelect = true,
    maxVisibleItems,
    'aria-label': ariaLabel,
    placeholder,
    variant,
    renderOptionLabel,
  } = props;
  const { fieldProps } = splitFieldProps(props);
  if (variant !== 'text-only' && renderOptionLabel == null) {
    const labelFromAria = fieldProps.label == null && ariaLabel != null;
    return (
      <Select
        selectionMode="single"
        onSelectionChange={(selected) => onChange(selected as T)}
        options={options as unknown as ListboxOption[]}
        formatOption={(option) =>
          toListboxOption(option as unknown as O, state.serialize, renderLeading, renderTrailing) as ListboxOption
        }
        value={value}
        fullWidth
        autoFocus={autoFocus}
        clearable={clearable}
        closeOnSelect={closeOnSelect}
        maxOptionsVisible={maxVisibleItems}
        placeholder={placeholder}
        // The field props carry id, required and disabled. Like Discord's, their `disabled` wins over
        // `isDisabled`, so `isDisabled` only disables the popout select.
        {...fieldProps}
        label={labelFromAria ? ariaLabel : fieldProps.label}
        hideLabel={fieldProps.hideLabel === true || labelFromAria}
      />
    );
  }
  return (
    <PopoutSelect<T, O>
      {...props}
      {...state}
      renderOptionLabel={renderOptionLabel ?? getAccessoryLabelRenderer(renderLeading, renderTrailing)}
    />
  );
};

VoidSelect.displayName = 'VoidSelect';
