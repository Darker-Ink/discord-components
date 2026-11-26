import { useMemo, type ComponentType } from 'react';
import { Clickable, showToast, Text, tokens } from '@discord-mana/components';
import * as Icons from '@discord-mana/icons';
import type { IconSize } from '@discord-mana/icons';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { valueOptions } from './shared';

type IconComponent = ComponentType<{ size?: IconSize; color?: string }>;

const ICONS = Object.entries(Icons)
  .filter(([name, value]) => name.endsWith('Icon') && typeof value === 'function')
  .map(([name, Icon]) => ({ name, Icon: Icon as IconComponent }));

const COLORS = {
  'Icon Default': tokens.colors.ICON_DEFAULT.css,
  'Icon Strong': tokens.colors.ICON_STRONG.css,
  'Icon Subtle': tokens.colors.ICON_SUBTLE.css,
  'Icon Muted': tokens.colors.ICON_MUTED.css,
  'Icon Brand': tokens.colors.ICON_BRAND.css,
  'Feedback Positive': tokens.colors.ICON_FEEDBACK_POSITIVE.css,
  'Feedback Warning': tokens.colors.ICON_FEEDBACK_WARNING.css,
  'Feedback Critical': tokens.colors.ICON_FEEDBACK_CRITICAL.css,
  'Feedback Info': tokens.colors.ICON_FEEDBACK_INFO.css,
};

const copyName = (name: string) => {
  void navigator.clipboard
    ?.writeText(name)
    .then(() => showToast({ text: `Copied ${name}`, variant: 'success' }))
    .catch(() => {});
};

interface IconGalleryProps {
  search: string;
  size: IconSize;
  color: keyof typeof COLORS | 'Custom';
  customColor: string;
}

// Every icon the icons package exports; click one to copy its name.
const IconGallery = ({ search, size, color, customColor }: IconGalleryProps) => {
  const query = search.trim().toLowerCase();
  const icons = useMemo(() => ICONS.filter(({ name }) => name.toLowerCase().includes(query)), [query]);
  const iconColor = color === 'Custom' ? customColor : COLORS[color];
  return (
    <div style={{ width: '100%' }}>
      <Text variant="body-sm/normal" color="text-subtle" style={{ marginBottom: 12 }}>
        {icons.length} of {ICONS.length} icons
      </Text>
      <div className={styles.iconGrid}>
        {icons.map(({ name, Icon }) => (
          <Clickable key={name} className={styles.iconCell} onClick={() => copyName(name)} aria-label={`Copy ${name}`}>
            <Icon size={size} color={iconColor} />
            <Text variant="body-xs/normal" color="text-subtle" className={styles.iconName}>
              {name.replace(/Icon$/, '')}
            </Text>
          </Clickable>
        ))}
      </div>
    </div>
  );
};

IconGallery.displayName = 'IconGallery';

const icons: StoryGroup = {
  title: 'Icons',
  stories: [
    {
      name: 'Icon Gallery',
      id: 'icon-gallery',
      component: IconGallery,
      controls: {
        search: { label: 'Search', type: 'text', defaultValue: '' },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: valueOptions(['xxs', 'xs', 'sm', 'refresh_sm', 'md', 'lg']),
        },
        color: {
          label: 'Color',
          type: 'select',
          defaultValue: 'Icon Default',
          options: valueOptions([...Object.keys(COLORS), 'Custom']),
        },
        customColor: {
          label: 'Custom Color',
          type: 'color',
          defaultValue: '#5865f2',
          isVisible: (props) => props.color === 'Custom',
        },
      },
    },
  ],
};

export default icons;
