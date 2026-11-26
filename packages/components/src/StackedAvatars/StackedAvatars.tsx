import clsx from 'clsx';
import { Avatar, AvatarSizes, getAvatarSize, type AvatarSize } from '../Avatar';
import { HiddenVisually } from '../HiddenVisually';
import { Text, type TextColor, type TextVariant } from '../Text';
import { Tooltip } from '../Tooltip';
import styles from './StackedAvatars.module.css';

/** The parts of a Discord user record the stack reads. */
export interface StackedAvatarsUser {
  id: string;
  username?: string | null;
  globalName?: string | null;
  global_name?: string | null;
  getAvatarURL: (guildId: string | null | undefined, size: number) => string | null | undefined;
}

const isNonEmpty = (value: string | null | undefined): value is string => value != null && value !== '';

// Discord's display name: the global name, else the username. Nicknames come from the client's member store.
const getDisplayName = (user: StackedAvatarsUser) =>
  isNonEmpty(user.global_name)
    ? user.global_name
    : isNonEmpty(user.globalName)
      ? user.globalName
      : isNonEmpty(user.username)
        ? user.username
        : '???';

// The client's English string.
const formatOthersCount = (count: number) => `and ${count} ${count === 1 ? 'other' : 'others'}`;

const getSizeClassName = (size: AvatarSize = AvatarSizes.SIZE_24) => {
  switch (size) {
    case AvatarSizes.SIZE_16:
      return styles.size16;
    case AvatarSizes.SIZE_20:
      return styles.size20;
    case AvatarSizes.SIZE_32:
      return styles.size32;
    default:
      return styles.size24;
  }
};

const getOverflowTextVariant = (size: AvatarSize = AvatarSizes.SIZE_24): TextVariant => {
  switch (size) {
    case AvatarSizes.SIZE_16:
    case AvatarSizes.SIZE_20:
      return 'footnote/semibold';
    case AvatarSizes.SIZE_32:
      return 'body-sm/medium';
    default:
      return 'body-xs/medium';
  }
};

interface AvatarListProps {
  users: StackedAvatarsUser[];
  maxUsers: number;
  guildId?: string | null;
  channelId?: string | null;
  size?: AvatarSize;
  shouldShowOverflowCount: boolean;
  disableUsernameTooltip: boolean;
}

const AvatarList = ({
  users,
  maxUsers,
  guildId,
  size = AvatarSizes.SIZE_24,
  shouldShowOverflowCount,
  disableUsernameTooltip,
}: AvatarListProps) => {
  const sizeClassName = getSizeClassName(size);
  const count = shouldShowOverflowCount ? maxUsers - 1 : Math.min(users.length, maxUsers);
  const lastIndex = count - 1;
  return (
    <ul className={styles.avatars}>
      {users.slice(0, count).map((user, index) => {
        const name = getDisplayName(user);
        const avatar = <Avatar src={user.getAvatarURL(guildId, getAvatarSize(size))} size={size} aria-hidden />;
        const image = (
          <span role="img" aria-label={name}>
            {avatar}
          </span>
        );
        return (
          <li
            key={user.id}
            className={clsx(
              styles.avatar,
              sizeClassName,
              index === lastIndex && !shouldShowOverflowCount && styles.isLast,
            )}
          >
            {disableUsernameTooltip ? (
              image
            ) : (
              <Tooltip text={name} ariaHidden>
                {image}
              </Tooltip>
            )}
          </li>
        );
      })}
    </ul>
  );
};

AvatarList.displayName = 'AvatarList';

export interface StackedAvatarsOverflowCountProps {
  count: number;
  textVariant?: TextVariant;
  color?: TextColor;
  size?: AvatarSize;
  className?: string;
}

export const StackedAvatarsOverflowCount = ({
  count,
  textVariant,
  color = 'interactive-text-default',
  size = AvatarSizes.SIZE_24,
  className,
}: StackedAvatarsOverflowCountProps) => (
  <Text
    variant={textVariant ?? getOverflowTextVariant(size)}
    color={color}
    className={clsx(styles.overflow, getSizeClassName(size), className)}
  >
    <HiddenVisually>{formatOthersCount(count)}</HiddenVisually>
    <span aria-hidden>{count > 99 ? '>99' : `+${count}`}</span>
  </Text>
);

StackedAvatarsOverflowCount.displayName = 'StackedAvatarsOverflowCount';

export interface StackedAvatarsProps {
  users: StackedAvatarsUser[];
  maxUsers: number;
  guildId?: string | null;
  channelId?: string | null;
  size?: AvatarSize;
  overflowCountClassName?: string;
  overflowCountColor?: TextColor;
  hideOverflowCount?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-hidden'?: boolean;
}

/** Overlapping user avatars, with a "+N" count for the users that don't fit. */
export const StackedAvatars = ({
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-hidden': ariaHidden,
  users,
  maxUsers,
  guildId,
  channelId,
  size = AvatarSizes.SIZE_24,
  overflowCountClassName,
  overflowCountColor = 'interactive-text-default',
  hideOverflowCount = false,
}: StackedAvatarsProps) => {
  const overflow = users.length - maxUsers;
  const showOverflowCount = overflow > 0 && !hideOverflowCount;
  return (
    <div
      role="group"
      className={clsx(className, styles.avatars)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-hidden={ariaHidden}
    >
      {users.length <= 0 ? null : (
        <>
          <AvatarList
            users={users}
            maxUsers={maxUsers}
            guildId={guildId}
            channelId={channelId}
            size={size}
            shouldShowOverflowCount={showOverflowCount}
            disableUsernameTooltip
          />
          {showOverflowCount && (
            <StackedAvatarsOverflowCount
              count={overflow + 1}
              color={overflowCountColor}
              size={size}
              className={overflowCountClassName}
            />
          )}
        </>
      )}
    </div>
  );
};

StackedAvatars.displayName = 'StackedAvatars';
