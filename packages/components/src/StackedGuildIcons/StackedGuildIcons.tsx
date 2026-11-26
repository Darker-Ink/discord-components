import type { FocusEventHandler, MouseEvent, MouseEventHandler, ReactNode } from 'react';
import clsx from 'clsx';
import { GuildIcon, GuildIconPixelSizes, GuildIconSizes, type GuildIconGuild } from '../GuildIcon';
import { LegacyButton } from '../LegacyButton';
import { Mask, MaskIDs, NotchedSquircleMasks } from '../Mask';
import { Text, type TextVariant } from '../Text';
import { Tooltip } from '../Tooltip';
import styles from './StackedGuildIcons.module.css';

type StackedGuildIconSize = typeof GuildIconSizes.SMOL | typeof GuildIconSizes.MINI | typeof GuildIconSizes.SMALLER;

const getSizeClassName = (size: StackedGuildIconSize) => {
  switch (size) {
    case GuildIconSizes.SMOL:
      return styles.size16;
    case GuildIconSizes.MINI:
      return styles.size20;
    default:
      return styles.size24;
  }
};

const getOverflowTextVariant = (size: StackedGuildIconSize): TextVariant => {
  switch (size) {
    case GuildIconSizes.SMOL:
    case GuildIconSizes.MINI:
      return 'footnote/semibold';
    default:
      return 'body-xs/medium';
  }
};

interface SquircleProps {
  size: StackedGuildIconSize;
  notched: boolean;
  width?: number;
  children: ReactNode;
}

// Clips an icon to a squircle, notched on the right where the next icon overlaps it.
const Squircle = ({ size, notched, width, children }: SquircleProps) => {
  const pixels = GuildIconPixelSizes[size];
  return (
    <Mask
      mask={notched ? NotchedSquircleMasks[pixels as keyof typeof NotchedSquircleMasks] : MaskIDs.SQUIRCLE}
      width={width ?? pixels}
      height={pixels}
    >
      <div className={styles.squircleIcon}>{children}</div>
    </Mask>
  );
};

Squircle.displayName = 'Squircle';

interface OverflowProps {
  count: number;
  size: StackedGuildIconSize;
  notched: boolean;
  tooltip?: ReactNode;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onClick?: MouseEventHandler<HTMLElement>;
}

const Overflow = ({ count, size, notched, tooltip, onFocus, onClick }: OverflowProps) => {
  const text = count > 99 ? '>99' : `+${count}`;
  const pixels = GuildIconPixelSizes[size];
  const button = (
    <LegacyButton
      className={clsx(styles.overflow, styles.overflowButton)}
      onFocus={onFocus}
      onClick={(event: MouseEvent<HTMLElement>) => onClick?.(event)}
      look={LegacyButton.Looks.BLANK}
      size={LegacyButton.Sizes.NONE}
    >
      <Text variant={getOverflowTextVariant(size)}>{text}</Text>
    </LegacyButton>
  );
  return (
    <Squircle size={size} notched={notched} width={text.length <= 2 ? pixels : pixels + 8}>
      {tooltip != null ? (
        <Tooltip __unsupportedReactNodeAsText={tooltip} position="top" asContainer>
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </Squircle>
  );
};

Overflow.displayName = 'StackedGuildIcons.Overflow';

export interface StackedGuildIconsProps {
  guilds: GuildIconGuild[];
  maxGuilds: number;
  size?: StackedGuildIconSize;
  hideOverflowCount?: boolean;
  disableGuildNameTooltip?: boolean;
  overflowTooltip?: ReactNode;
  className?: string;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onClick?: MouseEventHandler<HTMLElement>;
}

/** Overlapping server icons, with a "+N" count for the servers that don't fit. */
export const StackedGuildIcons = ({
  className,
  maxGuilds,
  guilds,
  onFocus,
  onClick,
  size = GuildIconSizes.SMALLER,
  hideOverflowCount = false,
  disableGuildNameTooltip = false,
  overflowTooltip,
}: StackedGuildIconsProps) => {
  if (guilds.length <= 0) return null;
  const hasOverflow = guilds.length > maxGuilds && !hideOverflowCount;
  const overflowCount = hasOverflow ? guilds.length - maxGuilds + 1 : 0;
  const shownCount = hasOverflow ? Math.min(guilds.length, maxGuilds) - 1 : Math.min(guilds.length, maxGuilds);
  const icons = guilds.slice(0, shownCount).map((guild, index) => (
    <li key={guild.id} className={getSizeClassName(size)}>
      <Squircle size={size} notched={hasOverflow || index !== shownCount - 1}>
        <GuildIcon guild={guild} active onClick={onClick} size={size} showTooltip={!disableGuildNameTooltip} />
      </Squircle>
    </li>
  ));
  return (
    <ul className={clsx(className, styles.avatars)}>
      {hasOverflow
        ? [
            ...icons,
            <li key="overflow" className={getSizeClassName(size)}>
              <Overflow
                count={overflowCount}
                size={size}
                notched={false}
                tooltip={overflowTooltip}
                onFocus={onFocus}
                onClick={onClick}
              />
            </li>,
          ]
        : icons}
    </ul>
  );
};

StackedGuildIcons.displayName = 'StackedGuildIcons';
