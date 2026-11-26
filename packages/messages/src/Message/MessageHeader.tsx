import { memo, useMemo, type MouseEventHandler, type ReactNode } from 'react';
import clsx from 'clsx';
import { Clickable, H, Tooltip } from '@discord-mana/components';
import { BellZIcon } from '@discord-mana/icons';
import {
  createResolver,
  useMessageResolvers,
  type APIResolvedUser,
  type Resolver,
} from '../MessageComponents/resolvers';
import { BotTag, BotTagTypes } from './BotTag';
import { useMessageI18n } from './messageI18n';
import { MessageTimestamp } from './MessageTimestamp';
import { MessageFlags, USER_MESSAGE_TYPES, type APIMessage } from './types';
import styles from './Message.module.css';
import silentStyles from './SilentMessage.module.css';

export const getMessageUsernameId = (message: Pick<APIMessage, 'id'>) => `message-username-${message.id}`;
export const getMessageTimestampId = (message: Pick<APIMessage, 'id'>) => `message-timestamp-${message.id}`;
export const getMessageContentId = (message: Pick<APIMessage, 'id'>) => `message-content-${message.id}`;
export const getMessageAccessoriesId = (message: Pick<APIMessage, 'id'>) => `message-accessories-${message.id}`;
export const getMessageReplyContextId = (message: Pick<APIMessage, 'id'>) => `message-reply-context-${message.id}`;
export const getMessageReactionsId = (message: Pick<APIMessage, 'id'>) => `message-reactions-${message.id}`;

export const hasFlag = (flags: number | null | undefined, flag: number) => ((flags ?? 0) & flag) === flag;

/** System messages (joins, boosts, pins…) have no header and render through their own layouts. */
export const isSystemMessage = (message: Pick<APIMessage, 'type'>) => !USER_MESSAGE_TYPES.has(message.type);

export interface MessageAuthor {
  nick: string;
  colorString: string | null;
}

const toHex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** The author's display name and role colour (nickname, global name, then username). */
export const getMessageAuthor = (
  user: APIResolvedUser | null | undefined,
  resolver: Resolver,
  member?: { nick?: string | null; roles?: string[] } | null,
): MessageAuthor => {
  const name = user == null ? '???' : (user.global_name ?? user.username);
  if (user == null) return { nick: name, colorString: null };
  const guildMember = member ?? resolver.member(user.id);
  if (guildMember == null) return { nick: name, colorString: null };
  const colored = (guildMember.roles ?? [])
    .map((id) => resolver.role(id))
    .filter((role) => role != null && role.color !== 0)
    .sort((a, b) => (b!.position ?? 0) - (a!.position ?? 0));
  return { nick: guildMember.nick ?? name, colorString: colored.length > 0 ? toHex(colored[0]!.color) : null };
};

export const getBotTagType = (message: Pick<APIMessage, 'author'>) => {
  if (message.author.system) return BotTagTypes.SYSTEM_DM;
  if (message.author.bot) return BotTagTypes.BOT;
  return null;
};

/** The username and its decorations (the client's `MessageUsername`, cozy layout). */
export const MessageUsername = ({
  author,
  compact = false,
  systemTag,
  badges,
  onClick,
  onContextMenu,
  className,
}: {
  author: MessageAuthor;
  compact?: boolean;
  systemTag?: ReactNode;
  badges?: ReactNode[];
  onClick?: MouseEventHandler<HTMLElement>;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  className?: string;
}) => (
  <>
    {systemTag != null && compact ? <> {systemTag} </> : null}
    <Clickable
      className={clsx(styles.username, className)}
      style={author.colorString != null ? { color: author.colorString } : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      data-text={author.nick}
    >
      {author.nick}
    </Clickable>
    {badges != null && badges.length > 0 ? badges : null}
    {systemTag == null || compact ? null : systemTag}
  </>
);

MessageUsername.displayName = 'MessageUsername';

const SilentBadge = () => {
  const i18n = useMessageI18n();
  return (
    <Tooltip text={i18n.SILENT_MESSAGE}>
      <div className={silentStyles.badge}>
        <BellZIcon color="currentColor" size="custom" width="1rem" height="1rem" />
      </div>
    </Tooltip>
  );
};

SilentBadge.displayName = 'SilentBadge';

export interface MessageHeaderProps {
  message: APIMessage;
  author: MessageAuthor;
  hideTimestamp?: boolean;
  /** `aria-describedby` of the header (the reply context of a reply). */
  ariaDescribedBy?: string;
  onClickUsername?: MouseEventHandler<HTMLElement>;
  onClickAvatar?: MouseEventHandler<HTMLImageElement>;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  className?: string;
}

const AVATAR_SIZE = 80;

/** The cozy header: avatar, username with its tags and badges, and the timestamp. */
export const MessageHeader = memo(
  ({
    message,
    author,
    hideTimestamp,
    ariaDescribedBy,
    onClickUsername,
    onClickAvatar,
    onContextMenu,
    className,
  }: MessageHeaderProps) => {
    const resolver = createResolver(useMessageResolvers(), message.resolved);
    const user = resolver.user(message.author.id) ?? message.author;
    const avatarSrc = useMemo(() => resolver.avatarURL(user, AVATAR_SIZE), [resolver, user]);
    const tagType = getBotTagType(message);
    const systemTag =
      tagType != null ? <BotTag className={clsx(styles.botTagCozy, styles.botTag)} type={tagType} useRemSizes /> : null;
    const badges = useMemo(
      () =>
        hasFlag(message.flags, MessageFlags.SuppressNotifications)
          ? [<SilentBadge key="suppress-notifications" />]
          : [],
      [message.flags],
    );
    const usernameId = getMessageUsernameId(message);
    const timestampId = getMessageTimestampId(message);
    return (
      <>
        <img
          onClick={onClickAvatar}
          onContextMenu={onContextMenu}
          src={avatarSrc}
          aria-hidden
          className={clsx(styles.avatar, { [styles.clickable]: onClickAvatar != null })}
          alt=" "
        />
        <H
          className={clsx(styles.header, className)}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={hideTimestamp ? usernameId : `${usernameId} ${timestampId}`}
        >
          <span
            id={usernameId}
            className={clsx(styles.headerText, { [styles.hasBadges]: systemTag != null || badges.length > 0 })}
          >
            <MessageUsername
              author={author}
              systemTag={systemTag}
              onClick={onClickUsername}
              onContextMenu={onContextMenu}
            />
          </span>
          {hideTimestamp !== true && <MessageTimestamp id={timestampId} timestamp={message.timestamp} />}
          {badges.length > 0 ? <div className={styles.badgesContainer}>{badges}</div> : null}
        </H>
      </>
    );
  },
);

MessageHeader.displayName = 'MessageHeader';
