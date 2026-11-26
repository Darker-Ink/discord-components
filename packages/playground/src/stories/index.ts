import type { Collection, StoryGroup } from '../types';

// Groups appear in the same order as in Discord's playground.
const MANA_GROUP_ORDER = [
  'Text',
  'Badges',
  'Indicator Dot',
  'Buttons',
  'Toolbar',
  'Calendar',
  'Checkbox',
  'CheckboxGroup',
  'DatePicker',
  'DateRangePicker',
  'RadioGroup',
  'RangeCalendar',
  'Switch',
  'Modal',
  'InlineNotice',
  'GlobalBanner',
  'Countdown',
  'Input Components',
  'Select',
  'Slider',
  'Popover',
  'ProgressBar',
  'Toast',
  'Tooltip',
  'Tabs',
  'TagGroup',
  'Forms',
  'FloatingLayer',
  'Rive Animations',
  'Animated Asset',
];

const byOrder = (order: string[]) => (a: StoryGroup, b: StoryGroup) => {
  const rank = (group: StoryGroup) => (order.includes(group.title) ? order.indexOf(group.title) : order.length);
  return rank(a) - rank(b);
};

const manaGroups = Object.values(import.meta.glob<StoryGroup>('./mana/*.tsx', { eager: true, import: 'default' }));

// Not part of Discord's playground: message rendering (embeds, attachments, components) has no Mana stories.
const MESSAGE_GROUP_ORDER = ['Message', 'Embeds', 'Media Mosaic', 'Media Viewer', 'Components'];

const messageGroups = Object.values(
  import.meta.glob<StoryGroup>('./messages/*.tsx', { eager: true, import: 'default' }),
);

// Discord's older component collection, kept for app components that predate Mana.
const VOID_GROUP_ORDER = [
  'Select',
  'Slider',
  'TabBar',
  'Avatar',
  'Badges',
  'Chip',
  'Notice',
  'VoidInputs',
  'Form Components',
  'Menu',
  'Stacked Avatars',
  'Stacked Guild Icons',
];

const voidGroups = Object.values(import.meta.glob<StoryGroup>('./void/*.tsx', { eager: true, import: 'default' }));

export const collections: Collection[] = [
  { id: 'mana', name: 'Mana', groups: manaGroups.sort(byOrder(MANA_GROUP_ORDER)) },
  {
    id: 'void',
    name: 'Void',
    groups: voidGroups.sort(byOrder(VOID_GROUP_ORDER)),
    deprecationNotice: 'Void is deprecated. Use Mana instead.',
  },
  { id: 'messages', name: 'Messages', groups: messageGroups.sort(byOrder(MESSAGE_GROUP_ORDER)) },
];
