import {
  CircleCheckIcon,
  ClockIcon,
  ExperimentalCommonIcon,
  ExperimentalEpicIcon,
  ExperimentalMythicIcon,
  ExperimentalRareIcon,
  FireIcon,
  LockIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
} from '@discord-mana/icons';
import {
  Badge,
  Chip,
  type BadgeProps,
  type BadgeType,
  type BadgeVariant,
  type ChipProps,
  type ChipVariant,
} from '@discord-mana/components';
import type { StoryGroup } from '../../types';

const CHIP_ICONS: Record<string, ChipProps['icon']> = {
  none: undefined,
  CircleCheckIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  ClockIcon,
};

const BADGE_ICONS: Record<string, BadgeProps['icon']> = {
  none: undefined,
  StarIcon,
  FireIcon,
  SparklesIcon,
  ClockIcon,
  LockIcon,
  TagIcon,
  ExperimentalCommonIcon,
  ExperimentalRareIcon,
  ExperimentalEpicIcon,
  ExperimentalMythicIcon,
};

const BadgeStory = ({
  type,
  customText,
  variant,
  iconName,
}: {
  type: Exclude<BadgeType, { text: string }> | 'custom';
  customText?: string;
  variant: BadgeVariant;
  iconName?: string;
}) => {
  const icon = iconName != null && iconName !== '' && iconName !== 'none' ? BADGE_ICONS[iconName] : undefined;
  return (
    <Badge
      type={type === 'custom' && customText != null && customText !== '' ? { text: customText } : (type as BadgeType)}
      variant={variant}
      icon={icon}
    />
  );
};

BadgeStory.displayName = 'BadgeStory';

const ChipStory = ({ text, variant, iconName }: { text: string; variant: ChipVariant; iconName: string }) => {
  const icon = iconName !== '' && iconName !== 'none' ? CHIP_ICONS[iconName] : undefined;
  return <Chip text={text} variant={variant} icon={icon} />;
};

ChipStory.displayName = 'ChipStory';

const badges: StoryGroup = {
  title: 'Badges',
  stories: [
    {
      name: 'Badge',
      id: 'badge',
      component: BadgeStory,
      docs: 'https://design.discord.tools/components/web/badge',
      controls: {
        type: {
          label: 'Type',
          type: 'select',
          defaultValue: 'new',
          options: [
            { label: 'New', value: 'new' },
            { label: 'Beta', value: 'beta' },
            { label: 'Early Access', value: 'early_access' },
            { label: 'Free Trial', value: 'free_trial' },
            { label: 'Custom Text', value: 'custom' },
          ],
        },
        customText: { label: 'Custom Text', type: 'text', defaultValue: 'Custom' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'secondary',
          options: [
            { label: 'Secondary', value: 'secondary' },
            { label: 'Primary', value: 'primary' },
            { label: 'Expressive', value: 'expressive' },
            { label: 'Warning', value: 'warning' },
            { label: 'Critical', value: 'critical' },
            { label: 'Success', value: 'success' },
            { label: 'Notification', value: 'notification' },
            { label: 'Premium', value: 'premium' },
            { label: 'Inverted', value: 'inverted' },
            { label: 'Rarity — Common', value: 'rarity-common' },
            { label: 'Rarity — Rare', value: 'rarity-rare' },
            { label: 'Rarity — Epic', value: 'rarity-epic' },
            { label: 'Rarity — Mythic', value: 'rarity-mythic' },
          ],
        },
        iconName: {
          label: 'Icon',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Star', value: 'StarIcon' },
            { label: 'Fire', value: 'FireIcon' },
            { label: 'Sparkles', value: 'SparklesIcon' },
            { label: 'Clock', value: 'ClockIcon' },
            { label: 'Lock', value: 'LockIcon' },
            { label: 'Tag', value: 'TagIcon' },
            { label: 'Rarity — Common', value: 'ExperimentalCommonIcon' },
            { label: 'Rarity — Rare', value: 'ExperimentalRareIcon' },
            { label: 'Rarity — Epic', value: 'ExperimentalEpicIcon' },
            { label: 'Rarity — Mythic', value: 'ExperimentalMythicIcon' },
          ],
        },
      },
    },
    {
      name: 'Chip',
      id: 'chip',
      component: ChipStory,
      docs: 'https://design.discord.tools/components/web/chip',
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'Active' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'grayLight',
          options: [
            { label: 'Blurple — Light', value: 'blurpleLight' },
            { label: 'Blurple — Dark', value: 'blurpleDark' },
            { label: 'Green — Light', value: 'greenLight' },
            { label: 'Green — Dark', value: 'greenDark' },
            { label: 'Orange — Light', value: 'orangeLight' },
            { label: 'Yellow — Light', value: 'yellowLight' },
            { label: 'Red — Light', value: 'redLight' },
            { label: 'Red — Dark', value: 'redDark' },
            { label: 'Gray — Light', value: 'grayLight' },
            { label: 'Gray — Medium', value: 'grayMedium' },
            { label: 'Gray — Dark', value: 'grayDark' },
          ],
        },
        iconName: {
          label: 'Icon',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Circle Check', value: 'CircleCheckIcon' },
            { label: 'Star', value: 'StarIcon' },
            { label: 'Fire', value: 'FireIcon' },
            { label: 'Sparkles', value: 'SparklesIcon' },
            { label: 'Clock', value: 'ClockIcon' },
          ],
        },
      },
    },
  ],
};

export default badges;
