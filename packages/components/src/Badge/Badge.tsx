import type { ComponentType } from 'react';
import clsx from 'clsx';
import type { IconProps } from '@discord-components/icons';
import { useManaContext } from '../ManaContext';
import { Text } from '../Text';
import styles from './Badge.module.css';

export const BadgeVariants = [
  'secondary',
  'primary',
  'expressive',
  'warning',
  'critical',
  'success',
  'notification',
  'premium',
  'inverted',
  'rarity-common',
  'rarity-rare',
  'rarity-epic',
  'rarity-mythic',
] as const;
export type BadgeVariant = (typeof BadgeVariants)[number];

/** A preset label (translated through the Mana context's strings) or custom text. */
export type BadgeType = 'new' | 'beta' | 'early_access' | 'free_trial' | { text: string };

export interface BadgeProps {
  type: BadgeType;
  variant?: BadgeVariant;
  icon?: ComponentType<IconProps<'color'>>;
}

/** Turns a bare badge type into badge props, defaulting those to the primary variant. */
export const toBadgeProps = (badge: BadgeType | BadgeProps): BadgeProps =>
  typeof badge === 'string' || 'text' in badge ? { type: badge, variant: 'primary' } : badge;

export const Badge = ({ type, variant = 'secondary', icon: Icon }: BadgeProps) => {
  const { i18n } = useManaContext();
  let label: string;
  switch (type) {
    case 'new':
      label = i18n.NEW;
      break;
    case 'beta':
      label = i18n.BETA;
      break;
    case 'early_access':
      label = i18n.EARLY_ACCESS;
      break;
    case 'free_trial':
      label = i18n.BILLING_TRIAL_FREE_TRIAL_TEXT;
      break;
    default:
      label = type.text;
  }
  return (
    <Text variant="body-xs/semibold" className={clsx(styles.badge, styles[variant])}>
      {Icon != null && <Icon size="xxs" color="currentColor" />}
      <span className={styles.label}>{label}</span>
    </Text>
  );
};

Badge.displayName = 'Badge';
