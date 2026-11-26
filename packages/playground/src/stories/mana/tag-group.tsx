import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Stack,
  TagGroup,
  type TagGroupItem,
  type TagGroupLayout,
  type TagGroupSize,
} from '@discord-mana/components';
import { TextWarningIcon } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';

type Key = string | number;

const FILTER_ITEMS: TagGroupItem[] = [
  { id: 'strength', label: 'Strength', icon: TextWarningIcon },
  { id: 'dexterity', label: 'Dexterity' },
  { id: 'wisdom', label: 'Wisdom' },
  { id: 'charisma', label: 'Charisma' },
];

const LINK_ITEMS: TagGroupItem[] = [
  { id: 'safety', label: 'Safety Center', href: 'https://discord.com/safety' },
  { id: 'support', label: 'Support', href: 'https://support.discord.com' },
];

interface TagGroupStoryProps {
  disabled: boolean;
  removeable: boolean;
  layout: TagGroupLayout;
  size?: TagGroupSize;
}

const TagGroupStory = ({ disabled, removeable, layout, size }: TagGroupStoryProps) => {
  // Discord shows the signed-in user's avatar here; the playground has no user, so the URL is empty.
  const avatarUrl = '';
  const initialItems = useMemo<TagGroupItem[]>(
    () => [
      { id: 'strength', label: 'Strength', icon: TextWarningIcon },
      { id: 'dexterity', label: 'Dexterity', icon: { type: 'role', color: '#ff44aa' } },
      { id: 'wisdom', label: 'Wisdom', icon: { type: 'avatar', src: avatarUrl } },
      { id: 'charisma', label: 'Charisma' },
    ],
    [avatarUrl],
  );
  const [items, setItems] = useState(initialItems);
  const handleRemove = useCallback(
    (keys: Set<Key>) => {
      setItems(items.filter((item) => !keys.has(item.id)));
    },
    [items],
  );
  const tagGroup = (
    <TagGroup
      label="Character attributes"
      disabled={disabled}
      layout={layout}
      size={size}
      items={items}
      onRemove={removeable ? handleRemove : undefined}
    />
  );
  const handleReset = useCallback(() => {
    setItems(initialItems);
  }, [initialItems]);
  const reset = removeable && (
    <Button disabled={items.length === initialItems.length} text="Reset" onClick={handleReset} />
  );
  return layout === 'inline' ? (
    <Stack gap={24}>
      <div style={{ display: 'flex', gap: 4 }}>{tagGroup}</div>
      {reset}
    </Stack>
  ) : (
    <Stack gap={24}>
      {tagGroup}
      {reset}
    </Stack>
  );
};

TagGroupStory.displayName = 'TagGroupStory';

const TagGroupLinksStory = ({ disabled }: { disabled: boolean }) => (
  <TagGroup mode="link" label="Discord resources" disabled={disabled} items={LINK_ITEMS} />
);

TagGroupLinksStory.displayName = 'TagGroupLinksStory';

interface TagGroupFilterStoryProps {
  disabled: boolean;
  disallowEmptySelection: boolean;
  selectionMode: 'none' | 'single' | 'multiple';
  size: TagGroupSize;
}

const TagGroupFilterStory = ({ disabled, disallowEmptySelection, selectionMode, size }: TagGroupFilterStoryProps) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<Key>>(() => new Set(['strength']));
  const disabledKeys = useMemo(() => new Set<Key>(['charisma']), []);
  const handleSelectionChange = useCallback((keys: 'all' | Set<Key>) => {
    if (keys !== 'all') setSelectedKeys(new Set(keys));
  }, []);
  return (
    <Stack gap={24}>
      <TagGroup
        variant="filter"
        label="Character attributes"
        disabled={disabled}
        items={FILTER_ITEMS}
        selectionMode={selectionMode}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
        disabledKeys={disabledKeys}
        disallowEmptySelection={disallowEmptySelection}
        size={size}
      />
    </Stack>
  );
};

TagGroupFilterStory.displayName = 'TagGroupFilterStory';

const tagGroup: StoryGroup = {
  title: 'TagGroup',
  stories: [
    {
      name: 'TagGroup',
      id: 'tag-group',
      component: TagGroupStory,
      controls: {
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        removeable: { label: 'Removeable', type: 'boolean', defaultValue: false },
        layout: {
          label: 'Layout',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Inline', value: 'inline' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: undefined,
          options: [
            { label: 'Automatic', value: undefined },
            { label: 'Extra small', value: 'xs' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
      },
    },
    {
      name: 'TagGroup links',
      id: 'tag-group-links',
      component: TagGroupLinksStory,
      controls: { disabled: { label: 'Disabled', type: 'boolean', defaultValue: false } },
    },
    {
      name: 'TagGroup filter tags',
      id: 'tag-group-filter',
      component: TagGroupFilterStory,
      controls: {
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        disallowEmptySelection: { label: 'Disallow Empty Selection', type: 'boolean', defaultValue: false },
        selectionMode: {
          label: 'Selection Mode',
          type: 'select',
          defaultValue: 'multiple',
          options: [
            { label: 'None (static)', value: 'none' },
            { label: 'Single', value: 'single' },
            { label: 'Multiple', value: 'multiple' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Extra small', value: 'xs' },
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
      },
    },
  ],
};

export default tagGroup;
