import { useCallback, useState, type Key } from 'react';
import {
  Button,
  Divider,
  EditableText,
  FieldSet,
  NumberInput,
  SearchBar,
  Stack,
  Text,
  TextArea,
  TextInput,
  tokens,
  type EditableTextProps,
  type NumberInputProps,
  type SearchBarProps,
  type TagGroupItem,
  type TextAreaProps,
  type TextInputAccessory,
  type TextInputProps,
} from '@discord-mana/components';
import { AtIcon, PaintbrushThinIcon, PlusSmallIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

const noop = () => {};

const TAGS: TagGroupItem[] = [
  { id: 'strength', label: 'Strength', icon: AtIcon },
  { id: 'wisdom', label: 'Wisdom', icon: { type: 'role', color: tokens.unsafe_rawColors.BRAND_500.css } },
  { id: 'charisma', label: 'Charisma' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'dexterity', label: 'Dexterity' },
  { id: 'constitution', label: 'Constitution' },
];

interface TextInputStoryProps extends Omit<TextInputProps, 'leading' | 'trailing'> {
  leading: 'none' | 'tags' | 'icon' | 'text';
  trailing: 'none' | 'icon';
}

const TextInputStory = ({ leading, trailing, ...props }: TextInputStoryProps) => {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState(TAGS);
  const removeTags = useCallback(
    (keys: Set<Key>) => {
      setTags(tags.filter((tag) => !keys.has(tag.id)));
    },
    [tags],
  );
  const leadingAccessory = ((): TextInputAccessory | undefined => {
    switch (leading) {
      case 'tags':
        return { type: 'tags', label: 'Tags', items: tags, onRemove: removeTags };
      case 'icon':
        return { icon: AtIcon, onClick: noop, 'aria-label': 'At' };
      case 'text':
        return 'https://discord.gg/';
      default:
        return undefined;
    }
  })();
  return (
    <Stack gap={16}>
      <TextInput
        {...props}
        value={value}
        onChange={setValue}
        leading={leadingAccessory}
        trailing={trailing === 'icon' ? { icon: PlusSmallIcon, onClick: noop, 'aria-label': 'At' } : undefined}
        maxLength={500}
      />
      {leading === 'tags' ? (
        <Button text="Reset Tags" size="sm" variant="secondary" onClick={() => setTags(TAGS)} />
      ) : null}
    </Stack>
  );
};

TextInputStory.displayName = 'TextInputStory';

const SearchBarStory = (props: Omit<SearchBarProps, 'query' | 'onChange' | 'onClear'> & { clearable: boolean }) => {
  const [query, setQuery] = useState('');
  return (
    <SearchBar
      {...props}
      query={query}
      onChange={setQuery}
      onClear={props.clearable ? () => setQuery('') : undefined}
    />
  );
};

SearchBarStory.displayName = 'SearchBarStory';

const TextAreaStory = (props: TextAreaProps) => {
  const [value, setValue] = useState('');
  return <TextArea {...props} value={value} onChange={setValue} />;
};

TextAreaStory.displayName = 'TextAreaStory';

interface EditableTextStoryProps extends Omit<EditableTextProps, 'size' | 'label' | 'error'> {
  error?: string;
  layout: 'row' | 'column' | 'block';
  showAccessory: boolean;
  size: 'content' | 'sm' | 'md';
}

const EditableTextStory = ({
  error,
  layout,
  maxRows,
  multiline,
  showAccessory,
  size,
  ...props
}: EditableTextStoryProps) => {
  const [value, setValue] = useState('Name');
  const [committed, setCommitted] = useState<string | null>(null);
  const [accessoryClicks, setAccessoryClicks] = useState(0);
  const field = (
    <EditableText
      {...props}
      label="Editable text"
      error={error === '' ? undefined : error}
      maxRows={multiline ? maxRows : undefined}
      multiline={multiline}
      onChange={setValue}
      onCommit={setCommitted}
      size={size === 'content' ? undefined : size}
      trailing={
        showAccessory
          ? {
              icon: PaintbrushThinIcon,
              'aria-label': 'Example accessory',
              onClick: () => setAccessoryClicks((clicks) => clicks + 1),
            }
          : undefined
      }
      value={value}
    />
  );
  const neighbor = <Text variant="body-sm/normal">Neighbor</Text>;
  return (
    <Stack gap={16}>
      <Text variant="body-sm/normal" color="text-subtle">
        Change the parent layout and field options to check sizing and feedback. Enter commits single-line input; Escape
        restores the value from focus.
      </Text>
      <Stack direction="horizontal" wrap gap={8}>
        <Button text="Short text" size="sm" variant="secondary" onClick={() => setValue('Name')} />
        <Button text="Long text" size="sm" variant="secondary" onClick={() => setValue('W'.repeat(32))} />
        <Button text="Empty text" size="sm" variant="secondary" onClick={() => setValue('')} />
        <Button
          text="Multiple lines"
          size="sm"
          variant="secondary"
          disabled={!multiline}
          onClick={() => setValue('Line 1\nLine 2\nLine 3\nLine 4')}
        />
      </Stack>
      {layout === 'block' ? (
        <div>
          {field}
          {neighbor}
        </div>
      ) : (
        <Stack direction={layout === 'row' ? 'horizontal' : 'vertical'} align={layout === 'row' ? 'start' : 'stretch'}>
          {field}
          {neighbor}
        </Stack>
      )}
      <Text variant="body-sm/normal" role="status">
        {committed == null ? 'No commits' : `Last committed value: ${JSON.stringify(committed)}`}
      </Text>
      {showAccessory ? <Text variant="body-sm/normal">Accessory clicks: {accessoryClicks}</Text> : null}
    </Stack>
  );
};

EditableTextStory.displayName = 'EditableTextStory';

const NumberInputStory = (props: Omit<NumberInputProps, 'value' | 'onChange'>) => {
  const [value, setValue] = useState<number | undefined>(0);
  return <NumberInput {...props} value={value} onChange={setValue} />;
};

NumberInputStory.displayName = 'NumberInputStory';

interface InputCollectionStoryProps {
  label: string;
  hideLabel: boolean;
  description: string;
  required: boolean;
  error?: string;
  disabled: boolean;
  placeholder: string;
  value?: string;
  readOnly: boolean;
  helperText?: string;
  successMessage?: string;
  showCharacterCount: boolean;
}

const InputCollectionStory = ({
  label,
  hideLabel,
  description,
  required,
  error,
  disabled,
  placeholder,
  value = '',
  readOnly,
  helperText,
  successMessage,
  showCharacterCount,
}: InputCollectionStoryProps) => {
  const props = {
    label,
    hideLabel,
    description,
    required,
    value,
    error,
    disabled,
    placeholder,
    readOnly,
    helperText,
    showCharacterCount,
    successMessage,
  };
  return (
    <Stack gap={24}>
      <FieldSet label="Text Input">
        <TextInput {...props} />
        <TextInput {...props} clearable />
        <TextInput {...props} leading={{ icon: AtIcon, onClick: noop, 'aria-label': 'At' }} />
        <TextInput {...props} leading={AtIcon} />
        <TextInput {...props} leading="https://discord.gg/" />
        <TextInput {...props} trailing={{ icon: AtIcon, onClick: noop, 'aria-label': 'At' }} />
        <TextInput {...props} trailing={AtIcon} />
        <TextInput {...props} leading={{ type: 'tags', label: 'Tags', items: TAGS.slice(0, 3) }} />
      </FieldSet>
      <Divider />
      <FieldSet label="Search Bar">
        <SearchBar query={value} onChange={noop} disabled={disabled} placeholder={placeholder} />
        <SearchBar query={value} onChange={noop} size="sm" disabled={disabled} placeholder={placeholder} />
      </FieldSet>
      <Divider />
      <FieldSet label="Text Area">
        <TextArea {...props} />
      </FieldSet>
    </Stack>
  );
};

InputCollectionStory.displayName = 'InputCollectionStory';

const inputs: StoryGroup = {
  title: 'Input Components',
  stories: [
    {
      name: 'TextInput',
      component: TextInputStory,
      id: 'text-input',
      controls: {
        type: {
          label: 'Input Type',
          type: 'select',
          defaultValue: 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Password', value: 'password' },
            { label: 'Email', value: 'email' },
          ],
        },
        label: { label: 'Label', type: 'text', defaultValue: 'Example Label' },
        hideLabel: { label: 'Hide Label', type: 'boolean', defaultValue: false },
        description: { label: 'Description', type: 'text', defaultValue: 'This is an example description' },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Enter some text...' },
        error: { label: 'Error Message', type: 'text', defaultValue: undefined },
        helperText: { label: 'Helper Text', type: 'text', defaultValue: undefined },
        minLength: { label: 'Min Length', type: 'number', defaultValue: 0 },
        showCharacterCount: { label: 'Show Character Count', type: 'boolean', defaultValue: false },
        clearable: { label: 'Clearable', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        readOnly: { label: 'Read Only', type: 'boolean', defaultValue: false },
        leading: {
          label: 'Leading',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Tags', value: 'tags' },
            { label: 'Icon', value: 'icon' },
            { label: 'Text', value: 'text' },
          ],
        },
        trailing: {
          label: 'Trailing',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Icon', value: 'icon' },
          ],
        },
      },
    },
    {
      name: 'SearchBar',
      component: SearchBarStory,
      id: 'search-bar',
      controls: {
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Search...' },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        clearable: { label: 'Clearable', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'TextArea',
      id: 'text-area',
      component: TextAreaStory,
      controls: {
        label: { label: 'Label', type: 'text', defaultValue: 'Example Label' },
        hideLabel: { label: 'Hide Label', type: 'boolean', defaultValue: false },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        description: { label: 'Description', type: 'text', defaultValue: 'This is an example description' },
        helperText: { label: 'Helper Text', type: 'text', defaultValue: undefined },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Enter your message...' },
        error: { label: 'Error Message', type: 'text', defaultValue: undefined },
        rows: { label: 'Rows', type: 'number', defaultValue: 3 },
        autosize: { label: 'Autosize', type: 'boolean', defaultValue: false },
        maxLength: { label: 'Max Length', type: 'number', defaultValue: 1000 },
        showCharacterCount: { label: 'Show Character Count', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'EditableText',
      id: 'editable-text',
      component: EditableTextStory,
      controls: {
        layout: {
          label: 'Parent layout',
          type: 'select',
          defaultValue: 'row',
          options: [
            { label: 'Flex row', value: 'row' },
            { label: 'Flex column', value: 'column' },
            { label: 'Block', value: 'block' },
          ],
        },
        fullWidth: { label: 'Full width', type: 'boolean', defaultValue: false },
        size: {
          label: 'Control height',
          type: 'select',
          defaultValue: 'sm',
          options: [
            { label: 'Content', value: 'content' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        hideLabel: { label: 'Hide label', type: 'boolean', defaultValue: true },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Add text' },
        helperText: { label: 'Helper text', type: 'text', defaultValue: undefined },
        error: { label: 'Error message', type: 'text', defaultValue: undefined },
        minLength: { label: 'Minimum length', type: 'number', defaultValue: 1, minValue: 0 },
        maxLength: { label: 'Maximum length', type: 'number', defaultValue: 32, minValue: 0 },
        multiline: { label: 'Multiline', type: 'boolean', defaultValue: false },
        maxRows: { label: 'Maximum visible rows', type: 'number', defaultValue: 3, minValue: 1 },
        showAccessory: { label: 'Trailing accessory', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        readOnly: { label: 'Read only', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'NumberInput',
      id: 'number-input',
      component: NumberInputStory,
      controls: {
        label: { label: 'Label', type: 'text', defaultValue: 'Example Label' },
        hideLabel: { label: 'Hide Label', type: 'boolean', defaultValue: false },
        description: { label: 'Description', type: 'text', defaultValue: 'This is an example description' },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Enter a number...' },
        error: { label: 'Error Message', type: 'text', defaultValue: undefined },
        helperText: { label: 'Helper Text', type: 'text', defaultValue: undefined },
        min: { label: 'Min', type: 'number', defaultValue: undefined },
        max: { label: 'Max', type: 'number', defaultValue: undefined },
        step: { label: 'Step', type: 'number', defaultValue: 1 },
        mode: {
          label: 'Mode',
          type: 'select',
          defaultValue: 'integer',
          options: [
            { label: 'Integer', value: 'integer' },
            { label: 'Decimal', value: 'decimal' },
          ],
        },
        clearable: { label: 'Clearable', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        readOnly: { label: 'Read Only', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Input Collection',
      id: 'input-collection',
      component: InputCollectionStory,
      controls: {
        value: { label: 'Value', type: 'text', defaultValue: '' },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Enter some text...' },
        label: { label: 'Label', type: 'text', defaultValue: 'Example Label' },
        hideLabel: { label: 'Hide Label', type: 'boolean', defaultValue: false },
        description: { label: 'Description', type: 'text', defaultValue: 'This is an example description' },
        required: { label: 'Required', type: 'boolean', defaultValue: false },
        error: { label: 'Error Message', type: 'text', defaultValue: undefined },
        successMessage: { label: 'Success Message', type: 'text', defaultValue: undefined },
        helperText: { label: 'Helper Text', type: 'text', defaultValue: undefined },
        showCharacterCount: { label: 'Show Character Count', type: 'boolean', defaultValue: false },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        readOnly: { label: 'Read Only', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default inputs;
