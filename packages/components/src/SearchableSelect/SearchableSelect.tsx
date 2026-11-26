import { Combobox, ComboboxInput, ComboboxListbox, type ComboboxInputProps, type ComboboxProps } from '../Combobox';
import { splitFieldProps, type FieldOwnProps } from '../Field';
import type { ListboxOption } from '../Listbox';
import { SelectOption } from '../Select/SelectOption';
import { useSelectFloating } from '../Select/useSelectFloating';
import selectStyles from '../SelectInputField/SelectInputField.module.css';

type SearchableSelectInputProps = Pick<
  ComboboxInputProps,
  'onQueryChange' | 'onKeyDown' | 'onFocus' | 'onBlur' | 'placeholder' | 'wrapTags' | 'hideTags'
>;

export type SearchableSelectProps<T extends ListboxOption = ListboxOption> = Omit<
  ComboboxProps<T>,
  'children' | 'isCollapsible' | 'isOpen' | 'setIsOpen'
> &
  FieldOwnProps &
  SearchableSelectInputProps;

/** A Select whose field is a text input that filters the options. */
export const SearchableSelect = <T extends ListboxOption = ListboxOption>({
  hideTags,
  wrapTags,
  maxOptionsVisible = 5,
  ...props
}: SearchableSelectProps<T>) => {
  const { fieldProps } = splitFieldProps(props);
  const { onQueryChange, onKeyDown, onFocus, onBlur, placeholder, closeOnSelect, selectionMode } = props;
  const { isOpen, setIsOpen, refs, floatingStyles, getFloatingProps, transitionStyles } = useSelectFloating();
  const { setReference, setFloating } = refs;
  return (
    <Combobox<T>
      {...(props as ComboboxProps<T>)}
      isCollapsible
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      closeOnSelect={closeOnSelect ?? selectionMode === 'single'}
    >
      <ComboboxInput
        hideTags={hideTags}
        wrapTags={wrapTags}
        showChevronButton
        ref={setReference}
        placeholder={placeholder}
        {...fieldProps}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onQueryChange={onQueryChange}
        onFocus={onFocus}
      />
      {isOpen && (
        <div
          ref={setFloating}
          className={selectStyles.selectDropdown}
          style={{ ...floatingStyles, ...transitionStyles }}
          {...getFloatingProps()}
        >
          <ComboboxListbox<T>
            renderListItem={(item) => <SelectOption {...item} />}
            maxVisibleItems={maxOptionsVisible}
          />
        </div>
      )}
    </Combobox>
  );
};

SearchableSelect.displayName = 'SearchableSelect';
