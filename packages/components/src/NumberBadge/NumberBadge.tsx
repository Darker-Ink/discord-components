import type { ComponentType, CSSProperties, HTMLAttributes } from 'react';
import clsx from 'clsx';
import type { IconProps } from '@discord-components/icons';
import { Text } from '../Text';
import { tokens } from '../tokens';
import styles from './NumberBadge.module.css';

export const BadgeShapes = {
  ROUND: styles.baseShapeRound,
  ROUND_LEFT: styles.baseShapeRoundLeft,
  ROUND_RIGHT: styles.baseShapeRoundRight,
  SQUARE: '',
} as const;

export type BadgeShape = (typeof BadgeShapes)[keyof typeof BadgeShapes];

export const getBadgeWidthForValue = (count: number) => (count < 10 ? 16 : count < 100 ? 22 : 30);

export const getBadgeCountString = (count: number) =>
  count < 1000 ? `${count}` : `${Math.min(Math.floor(count / 1000), 9)}k+`;

export interface NumberBadgeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  count: number;
  color?: string;
  disableColor?: boolean;
  shape?: BadgeShape;
  renderBadgeCount?: (count: number) => string;
}

export const NumberBadge = ({
  count,
  color = tokens.colors.BADGE_NOTIFICATION_BACKGROUND.css,
  disableColor = false,
  shape = BadgeShapes.ROUND,
  className,
  style,
  renderBadgeCount = getBadgeCountString,
  ...props
}: NumberBadgeProps) => (
  <Text
    variant="body-xs/semibold"
    color="none"
    className={clsx(className, styles.numberBadge, styles.base, shape)}
    style={{ backgroundColor: disableColor ? undefined : color, width: getBadgeWidthForValue(count), ...style }}
    {...props}
  >
    {renderBadgeCount(count)}
  </Text>
);

NumberBadge.displayName = 'NumberBadge';

export interface IconBadgeProps {
  icon: ComponentType<IconProps<'color'>>;
  className?: string;
  color?: string;
  shape?: BadgeShape;
  disableColor?: boolean;
  style?: CSSProperties;
  'aria-label'?: string;
}

export const IconBadge = ({
  icon: Icon,
  className,
  color = tokens.colors.BADGE_NOTIFICATION_BACKGROUND.css,
  shape = BadgeShapes.ROUND,
  disableColor = false,
  style,
  'aria-label': ariaLabel,
}: IconBadgeProps) => (
  <Text
    variant="body-xs/semibold"
    color="none"
    className={clsx(className, styles.iconBadge, styles.base, shape)}
    style={{ backgroundColor: disableColor ? undefined : color, ...style }}
    role={ariaLabel != null ? 'img' : undefined}
    aria-label={ariaLabel}
  >
    <Icon className={styles.icon} color="currentColor" />
  </Text>
);

IconBadge.displayName = 'IconBadge';
