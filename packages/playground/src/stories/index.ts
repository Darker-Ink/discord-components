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

export const collections: Collection[] = [
  { id: 'mana', name: 'Mana', groups: manaGroups.sort(byOrder(MANA_GROUP_ORDER)) },
];
