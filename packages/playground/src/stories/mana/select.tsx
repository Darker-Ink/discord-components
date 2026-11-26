import { useMemo, useRef, useState } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxListbox,
  Listbox,
  SearchableSelect,
  Select,
  flattenOptionGroups,
  type ListboxOption,
  type ComboboxProps,
  type FieldOwnProps,
  type ListboxOptionGroup,
  type SearchableSelectProps,
  type SelectOptions,
  type SelectProps,
  type SelectionMode,
} from '@discord-components/components';
import { TextIcon } from '@discord-components/icons';
import type { StoryGroup } from '../../types';

const IMAGE_SRC = '/mana/select-option-image.svg';

const OPTIONS: ListboxOption<string>[] = [
  { label: 'Aardvark', value: 'aardvark', id: 'aardvark', description: 'This is an aardvark' },
  { label: 'Cat', value: 'cat', id: 'cat', description: 'This is a cat' },
  { label: 'Dog', value: 'dog', id: 'dog' },
  { label: 'Kangaroo', value: 'kangaroo', id: 'kangaroo', description: 'This is a kangaroo' },
  { label: 'Panda', value: 'panda', id: 'panda' },
  { label: 'Snake', value: 'snake', id: 'snake', disabled: true },
];

const OPTIONS_WITH_ACCESSORIES: ListboxOption<string>[] = [
  {
    label: 'Aardvark',
    value: 'aardvark',
    id: 'aardvark',
    leading: TextIcon,
    trailing: { type: 'badge', badgeType: 'new' },
    description: 'This is an aardvark',
  },
  { label: 'Cat', value: 'cat', id: 'cat', leading: TextIcon, trailing: '20m', description: 'This is a cat' },
  { label: 'Dog', value: 'dog', id: 'dog', leading: TextIcon },
  { label: 'Kangaroo', value: 'kangaroo', id: 'kangaroo', leading: { type: 'image', src: IMAGE_SRC } },
  { label: 'Panda', value: 'panda', id: 'panda', leading: { type: 'avatar', src: IMAGE_SRC } },
  { label: 'Snake', value: 'snake', id: 'snake', leading: TextIcon, disabled: true },
];

const GROUPED_OPTIONS: ListboxOptionGroup<ListboxOption<string>>[] = [
  {
    label: 'Domesticated',
    options: [
      { label: 'Cat', value: 'cat', id: 'cat', description: 'This is a cat' },
      { label: 'Dog', value: 'dog', id: 'dog' },
    ],
  },
  {
    label: 'Wild',
    options: [
      { label: 'Aardvark', value: 'aardvark', id: 'aardvark', description: 'This is an aardvark' },
      { label: 'Kangaroo', value: 'kangaroo', id: 'kangaroo', description: 'This is a kangaroo' },
      { label: 'Panda', value: 'panda', id: 'panda' },
      { label: 'Snake', value: 'snake', id: 'snake', disabled: true },
    ],
  },
];

const withLongLabel = (option: ListboxOption<string>) => ({
  ...option,
  label: `${option.label} \u2014 a very long option label for testing marquee scrolling speed and overflow in the Select playground`,
});

// The story's options: plain, with accessories, grouped, with long labels, or loaded after a second.
const useStoryOptions = (
  withLeadingAndTrailing?: boolean,
  asyncOptions?: boolean,
  withGroups?: boolean,
  withLongLabels?: boolean,
) => {
  const cache = useRef<{
    key: string;
    options: ListboxOption<string>[] | ListboxOptionGroup<ListboxOption<string>>[];
  } | null>(null);
  return useMemo((): SelectOptions<ListboxOption<string>> => {
    const options = withLongLabels
      ? withGroups
        ? GROUPED_OPTIONS.map((group) => ({ ...group, options: group.options.map(withLongLabel) }))
        : (withLeadingAndTrailing ? OPTIONS_WITH_ACCESSORIES : OPTIONS).map(withLongLabel)
      : withGroups
        ? GROUPED_OPTIONS
        : withLeadingAndTrailing
          ? OPTIONS_WITH_ACCESSORIES
          : OPTIONS;
    const key = `${withGroups ?? false}-${withLeadingAndTrailing ?? false}-${withLongLabels ?? false}`;
    if (!asyncOptions) return options;
    return () => {
      const cached = cache.current;
      return new Promise(
        cached?.key === key
          ? (resolve) => resolve(cached.options)
          : (resolve) =>
              setTimeout(() => {
                cache.current = { key, options };
                resolve(options);
              }, 1000),
      );
    };
  }, [withLeadingAndTrailing, asyncOptions, withGroups, withLongLabels]);
};

type SelectStoryProps = Omit<SelectProps<ListboxOption<string>>, 'options' | 'value' | 'onSelectionChange'> & {
  withLeadingAndTrailing: boolean;
  asyncOptions: boolean;
  withGroups: boolean;
  withLongLabels: boolean;
};

const SelectStory = ({
  selectionMode,
  withLeadingAndTrailing,
  withGroups,
  withLongLabels,
  ...props
}: SelectStoryProps) => {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [values, setValues] = useState<string[]>([]);
  const options = useStoryOptions(withLeadingAndTrailing, props.asyncOptions, withGroups, withLongLabels);
  return selectionMode === 'single' ? (
    <Select {...props} selectionMode={selectionMode} options={options} onSelectionChange={setValue} value={value} />
  ) : (
    <Select {...props} selectionMode={selectionMode} options={options} onSelectionChange={setValues} value={values} />
  );
};

SelectStory.displayName = 'SelectStory';

type SearchableSelectStoryProps = Omit<
  SearchableSelectProps<ListboxOption<string>>,
  'options' | 'value' | 'onSelectionChange'
> & {
  withLeadingAndTrailing: boolean;
  asyncOptions: boolean;
  withGroups: boolean;
};

const SearchableSelectStory = ({
  selectionMode,
  withLeadingAndTrailing,
  asyncOptions,
  withGroups,
  ...props
}: SearchableSelectStoryProps) => {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  const [values, setValues] = useState<string[]>([]);
  const options = useStoryOptions(withLeadingAndTrailing, asyncOptions, withGroups);
  return selectionMode === 'single' ? (
    <SearchableSelect
      {...props}
      selectionMode={selectionMode}
      onSelectionChange={setValue}
      value={value}
      options={options}
    />
  ) : (
    <SearchableSelect
      {...props}
      selectionMode={selectionMode}
      onSelectionChange={setValues}
      value={values}
      options={options}
    />
  );
};

SearchableSelectStory.displayName = 'SearchableSelectStory';

type ComboboxStoryProps = Omit<ComboboxProps<ListboxOption<string>>, 'options' | 'value' | 'onSelectionChange'> &
  FieldOwnProps & {
    placeholder?: string;
    wrapTags: boolean;
    withLeadingAndTrailing: boolean;
    asyncOptions: boolean;
    withGroups: boolean;
  };

const ComboboxStory = ({
  selectionMode,
  label,
  hideLabel,
  description,
  helperText,
  errorMessage,
  successMessage,
  wrapTags,
  withLeadingAndTrailing,
  withGroups,
  placeholder,
  ...props
}: ComboboxStoryProps) => {
  const { required, disabled } = props;
  const options = useStoryOptions(withLeadingAndTrailing, props.asyncOptions, withGroups);
  const [value, setValue] = useState<string | string[] | null | undefined>(null);
  return (
    <Combobox
      {...({ selectionMode, onSelectionChange: setValue, options, value, ...props } as ComboboxProps<
        ListboxOption<string>
      >)}
    >
      <ComboboxInput
        label={label}
        hideLabel={hideLabel}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        description={description}
        helperText={helperText}
        errorMessage={errorMessage}
        successMessage={successMessage}
        wrapTags={wrapTags}
      />
      <ComboboxListbox />
    </Combobox>
  );
};

ComboboxStory.displayName = 'ComboboxStory';

interface ListboxStoryProps {
  selectionMode: SelectionMode;
  required: boolean;
  shouldFocusWrap: boolean;
  withLeadingAndTrailing: boolean;
  withGroups: boolean;
}

const ListboxStory = ({
  selectionMode,
  required,
  shouldFocusWrap,
  withLeadingAndTrailing,
  withGroups,
}: ListboxStoryProps) => {
  const [selectedItems, setSelectedItems] = useState<ListboxOption[] | null>(null);
  const { flatOptions, groups } = useMemo(() => flattenOptionGroups(GROUPED_OPTIONS), []);
  return (
    <Listbox
      selectionMode={selectionMode}
      required={required}
      shouldFocusWrap={shouldFocusWrap}
      items={withGroups ? flatOptions : withLeadingAndTrailing ? OPTIONS_WITH_ACCESSORIES : OPTIONS}
      groups={withGroups ? groups : undefined}
      onSelectionChange={setSelectedItems}
      selectedItems={selectedItems}
    />
  );
};

ListboxStory.displayName = 'ListboxStory';

const SELECTION_MODE_OPTIONS = [
  { label: 'Single', value: 'single' },
  { label: 'Multiple', value: 'multiple' },
];

const select: StoryGroup = {
  title: 'Select',
  stories: [
    {
      id: 'select',
      name: 'Select',
      component: SelectStory,
      controls: {
        selectionMode: {
          label: 'SelectionType',
          type: 'select',
          options: SELECTION_MODE_OPTIONS,
          defaultValue: 'single',
        },
        withLeadingAndTrailing: { label: 'Show leading and trailing content', type: 'boolean', defaultValue: false },
        asyncOptions: { label: 'Async loaded options', type: 'boolean', defaultValue: false },
        withGroups: { label: 'Group options under headers', type: 'boolean', defaultValue: false },
        withLongLabels: { label: 'Long option labels', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        readOnly: { type: 'boolean', label: 'Read Only', defaultValue: false },
        clearable: { type: 'boolean', label: 'Clearable', defaultValue: false },
        fullWidth: { type: 'boolean', label: 'Full width', defaultValue: false },
        closeOnSelect: { type: 'boolean', label: 'Close on select', defaultValue: false },
        shouldFocusWrap: { type: 'boolean', label: 'Should listbox focus wrap', defaultValue: false },
        wrapTags: { type: 'boolean', label: 'Wrap tags', defaultValue: false },
        maxOptionsVisible: { type: 'number', label: 'Max options visible', defaultValue: 5 },
        label: { type: 'text', label: 'Label', defaultValue: 'Sort by' },
        helperText: { type: 'text', label: 'Helper text', defaultValue: undefined },
        hideLabel: { type: 'boolean', label: 'Hide Label', defaultValue: false },
        placeholder: { type: 'text', label: 'Placeholder', defaultValue: undefined },
        description: { type: 'text', label: 'Description', defaultValue: 'This is an example description' },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        successMessage: { type: 'text', label: 'Success Message', defaultValue: '' },
        layout: {
          type: 'select',
          label: 'Layout',
          defaultValue: 'vertical',
          options: [
            { label: 'Vertical', value: 'vertical' },
            { label: 'Horizontal', value: 'horizontal' },
            { label: 'Horizontal (Responsive)', value: 'horizontal-responsive' },
          ],
        },
      },
    },
    {
      id: 'searchable-select',
      name: 'SearchableSelect',
      component: SearchableSelectStory,
      controls: {
        selectionMode: {
          label: 'Selection Mode',
          type: 'select',
          options: SELECTION_MODE_OPTIONS,
          defaultValue: 'single',
        },
        withLeadingAndTrailing: { label: 'Show leading and trailing content', type: 'boolean', defaultValue: false },
        asyncOptions: { label: 'Async loaded options', type: 'boolean', defaultValue: false },
        withGroups: { label: 'Group options under headers', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        clearable: { type: 'boolean', label: 'Clearable', defaultValue: false },
        closeOnSelect: { type: 'boolean', label: 'Close on select', defaultValue: false },
        shouldFocusWrap: { type: 'boolean', label: 'Should listbox focus wrap', defaultValue: false },
        wrapTags: { type: 'boolean', label: 'Wrap tags', defaultValue: false },
        maxOptionsVisible: { type: 'number', label: 'Max options visible', defaultValue: 5 },
        label: { type: 'text', label: 'Label', defaultValue: 'Sort by' },
        hideLabel: { type: 'boolean', label: 'Hide Label', defaultValue: false },
        placeholder: { type: 'text', label: 'Placeholder', defaultValue: undefined },
        description: { type: 'text', label: 'Description', defaultValue: 'This is an example description' },
        helperText: {
          type: 'text',
          label: 'Helper Text',
          defaultValue:
            'This is an example of helper text, which can be used to provide additional information about the field.',
        },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        successMessage: { type: 'text', label: 'Success Message', defaultValue: '' },
      },
    },
    {
      id: 'combobox',
      name: 'ComboBox',
      component: ComboboxStory,
      controls: {
        selectionMode: {
          label: 'Selection Mode',
          type: 'select',
          options: SELECTION_MODE_OPTIONS,
          defaultValue: 'single',
        },
        withLeadingAndTrailing: { label: 'Show leading and trailing content', type: 'boolean', defaultValue: false },
        asyncOptions: { label: 'Async loaded options', type: 'boolean', defaultValue: false },
        withGroups: { label: 'Group options under headers', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
        clearable: { type: 'boolean', label: 'Clearable', defaultValue: false },
        closeOnSelect: { type: 'boolean', label: 'Close on select', defaultValue: false },
        shouldFocusWrap: { type: 'boolean', label: 'Should listbox focus wrap', defaultValue: false },
        wrapTags: { type: 'boolean', label: 'Wrap tags', defaultValue: false },
        label: { type: 'text', label: 'Label', defaultValue: 'Sort by' },
        hideLabel: { type: 'boolean', label: 'Hide Label', defaultValue: false },
        placeholder: { type: 'text', label: 'Placeholder', defaultValue: undefined },
        description: { type: 'text', label: 'Description', defaultValue: 'This is an example description' },
        helperText: {
          type: 'text',
          label: 'Helper Text',
          defaultValue:
            'This is an example of helper text, which can be used to provide additional information about the field.',
        },
        errorMessage: { type: 'text', label: 'Error Message', defaultValue: '' },
        successMessage: { type: 'text', label: 'Success Message', defaultValue: '' },
      },
    },
    {
      id: 'listbox',
      name: 'ListBox',
      component: ListboxStory,
      controls: {
        selectionMode: {
          label: 'Selection Mode',
          type: 'select',
          options: SELECTION_MODE_OPTIONS,
          defaultValue: 'single',
        },
        withLeadingAndTrailing: { label: 'Show leading and trailing content', type: 'boolean', defaultValue: false },
        withGroups: { label: 'Group options under headers', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        shouldFocusWrap: { label: 'Should focus wrap', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default select;
