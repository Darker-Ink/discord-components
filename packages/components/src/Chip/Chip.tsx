import type { ComponentType, ReactNode } from 'react';
import clsx from 'clsx';
import type { IconColor, IconProps } from '@discord-components/icons';
import { Text } from '../Text';
import styles from './Chip.module.css';

const VARIANT_CLASSES = {
  blurpleLight: 'blurple-light',
  blurpleDark: 'blurple-dark',
  greenLight: 'green-light',
  greenDark: 'green-dark',
  orangeLight: 'orange-light',
  yellowLight: 'yellow-light',
  redLight: 'red-light',
  redDark: 'red-dark',
  grayLight: 'gray-light',
  grayMedium: 'gray-medium',
  grayDark: 'gray-dark',
} as const;

export type ChipVariant = keyof typeof VARIANT_CLASSES;

export const ChipVariants = Object.keys(VARIANT_CLASSES) as ChipVariant[];

export interface ChipProps {
  text: ReactNode;
  variant?: ChipVariant;
  icon?: ComponentType<IconProps<'color'>>;
  /** Defaults to the chip's text color. */
  iconColor?: IconColor;
}

export const Chip = ({ text, variant = 'grayLight', icon: Icon, iconColor }: ChipProps) => (
  <Text
    variant="body-xs/semibold"
    className={clsx(styles.chip, styles[VARIANT_CLASSES[variant]], { [styles['with-icon']]: Icon != null })}
  >
    {Icon != null ? <Icon color={iconColor ?? 'currentColor'} size="xxs" aria-hidden className={styles.icon} /> : null}
    {text}
  </Text>
);

Chip.displayName = 'Chip';
