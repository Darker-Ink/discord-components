import { useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Avatar, AvatarSizes, Tooltip } from '@discord-mana/components';
import { Mention, MarkupTimestamp, type RoleColorStrings } from '@discord-mana/markdown';
import { Emoji, getDefaultAvatarURL, type APIResolvedChannel, type APIResolvedUser } from '@discord-mana/messages';
import { useEditorContext } from '../../core/context';
import { getUserTag } from '../../core/serialize';
import type { CustomEmojiElement, EmojiElement, TimestampElement } from '../../core/types';
import inlineStyles from './inlineElements.module.css';
import tooltipStyles from './userTooltip.module.css';

// The pills inline voids render: the same mention and emoji components message content uses, with the client's
// editor-specific wrappers (tooltips, no click actions).

const stopKeys = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
};

const stop = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

export interface InlineVoidProps {
  className?: string;
  attributes: Record<string, unknown>;
  children: ReactNode;
  /** Pills that open a popout swallow mouse down so clicking doesn't move the caret into them. */
  preventSelection?: boolean;
}

export const InlineVoid = ({ className, attributes, children, preventSelection }: InlineVoidProps) => (
  <span
    {...attributes}
    className={clsx(inlineStyles.inlineElement, inlineStyles.inlineVoid, className)}
    contentEditable={false}
    onMouseDown={preventSelection ? stop : undefined}
    onClick={preventSelection ? stop : undefined}
  >
    {children}
  </span>
);

InlineVoid.displayName = 'InlineVoid';

export const EditorEmoji = ({ emoji }: { emoji: EmojiElement['emoji'] }) => {
  const { resolvers } = useEditorContext();
  const src =
    emoji.src != null && emoji.src !== '' ? emoji.src : resolvers.getEmojiURL?.({ name: emoji.surrogate, size: 48 });
  return (
    <Tooltip text={emoji.name} delay={750} position="top">
      <Emoji src={src ?? undefined} emojiName={src != null ? emoji.name : emoji.surrogate} animated={false} />
    </Tooltip>
  );
};

EditorEmoji.displayName = 'EditorEmoji';

export const EditorCustomEmoji = ({ emoji }: { emoji: CustomEmojiElement['emoji'] }) => (
  <Tooltip text={emoji.name} delay={750} position="top">
    <Emoji emojiId={emoji.emojiId} emojiName={emoji.name} animated={emoji.animated} />
  </Tooltip>
);

EditorCustomEmoji.displayName = 'EditorCustomEmoji';

export const TextMentionPill = ({ text }: { text: string }) => <Mention>{text}</Mention>;

TextMentionPill.displayName = 'TextMentionPill';

const displayName = (user: APIResolvedUser, nick: string | null | undefined) =>
  nick ?? user.global_name ?? user.username;

export const UserMentionPill = ({ id }: { id: string }) => {
  const { resolvers } = useEditorContext();
  const ref = useRef<HTMLElement>(null);
  const user = resolvers.resolveUser?.(id);
  const name = user != null ? displayName(user, resolvers.resolveMember?.(id)?.nick) : null;
  const pill = (
    <Mention ref={ref} onKeyDown={stopKeys}>
      {name == null ? `<@${id}>` : `@${name}`}
    </Mention>
  );
  if (user == null) return pill;
  const discriminator =
    user.discriminator == null || user.discriminator === '0' || user.discriminator === ''
      ? null
      : `#${user.discriminator}`;
  const avatar = resolvers.getAvatarURL?.(user, 16) ?? getDefaultAvatarURL(user, 16);
  return (
    <Tooltip
      __unsupportedReactNodeAsText={
        <div className={tooltipStyles.userTooltip}>
          <Avatar src={avatar} size={AvatarSizes.SIZE_16} className={tooltipStyles.avatar} aria-hidden />
          {user.username}
          <span className={tooltipStyles.discriminator}>{discriminator}</span>
        </div>
      }
      delay={750}
      position="top"
      aria-label={getUserTag(user)}
      asContainer
    >
      {pill}
    </Tooltip>
  );
};

UserMentionPill.displayName = 'UserMentionPill';

const ENHANCED_ROLE_COLORS = 'ENHANCED_ROLE_COLORS';

const hex = (color: number | null | undefined) => (color == null ? null : `#${color.toString(16).padStart(6, '0')}`);

export const RoleMentionPill = ({ id }: { id: string }) => {
  const { resolvers, guildId } = useEditorContext();
  const role = guildId != null ? resolvers.resolveRole?.(id) : null;
  if (role == null) return <span>@unknown-role</span>;
  const hasColor = role.color != null && role.color !== 0;
  const guild = guildId != null ? resolvers.resolveGuild?.(guildId) : null;
  const gradient: RoleColorStrings | null =
    role.colors != null && guild?.features?.includes(ENHANCED_ROLE_COLORS) && role.colors.secondary_color != null
      ? {
          primaryColor: hex(role.colors.primary_color)!,
          secondaryColor: hex(role.colors.secondary_color),
          tertiaryColor: hex(role.colors.tertiary_color),
        }
      : null;
  return (
    <Mention color={hasColor ? role.color : null} roleColors={hasColor ? gradient : null}>
      @{role.name}
    </Mention>
  );
};

RoleMentionPill.displayName = 'RoleMentionPill';

const CHANNEL_TYPE = {
  GUILD_TEXT: 0,
  DM: 1,
  GUILD_VOICE: 2,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  ANNOUNCEMENT_THREAD: 10,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
  GUILD_STAGE_VOICE: 13,
  GUILD_FORUM: 15,
  GUILD_MEDIA: 16,
} as const;

const MENTIONABLE = new Set<number>([
  CHANNEL_TYPE.GUILD_TEXT,
  CHANNEL_TYPE.GUILD_VOICE,
  CHANNEL_TYPE.GUILD_CATEGORY,
  CHANNEL_TYPE.GUILD_ANNOUNCEMENT,
  CHANNEL_TYPE.ANNOUNCEMENT_THREAD,
  CHANNEL_TYPE.PUBLIC_THREAD,
  CHANNEL_TYPE.PRIVATE_THREAD,
  CHANNEL_TYPE.GUILD_STAGE_VOICE,
  CHANNEL_TYPE.GUILD_FORUM,
  CHANNEL_TYPE.GUILD_MEDIA,
]);

const channelIconType = (channel: APIResolvedChannel) => {
  switch (channel.type) {
    case CHANNEL_TYPE.GUILD_VOICE:
      return 'voice';
    case CHANNEL_TYPE.GUILD_STAGE_VOICE:
      return 'stage';
    case CHANNEL_TYPE.ANNOUNCEMENT_THREAD:
    case CHANNEL_TYPE.PUBLIC_THREAD:
    case CHANNEL_TYPE.PRIVATE_THREAD:
      return 'thread';
    case CHANNEL_TYPE.GUILD_ANNOUNCEMENT:
      return 'announcement';
    case CHANNEL_TYPE.GUILD_FORUM:
      return 'forum';
    case CHANNEL_TYPE.GUILD_MEDIA:
      return 'media';
    default:
      return 'text';
  }
};

export const ChannelMentionPill = ({ id }: { id: string }) => {
  const { resolvers } = useEditorContext();
  const channel = resolvers.resolveChannel?.(id);
  let name = 'unknown';
  let iconType = 'text';
  let mentionable = true;
  if (channel != null) {
    const canView = channel.can_view !== false;
    name = canView ? (channel.name ?? '') : 'No Access';
    iconType = canView ? channelIconType(channel) : 'locked';
    mentionable = MENTIONABLE.has(channel.type);
  }
  return mentionable ? <Mention iconType={iconType}>{name}</Mention> : <span>{'#' + name}</span>;
};

ChannelMentionPill.displayName = 'ChannelMentionPill';

export const CommandMentionPill = ({ text, id }: { text: string; id: string }) => (
  <Mention>
    {text}({id})
  </Mention>
);

CommandMentionPill.displayName = 'CommandMentionPill';

export const TimestampPill = ({ timestamp }: { timestamp: TimestampElement['parsed'] }) => (
  <MarkupTimestamp
    node={timestamp as Parameters<typeof MarkupTimestamp>[0]['node']}
    className={timestamp.format === 'R' ? tooltipStyles.tabular : undefined}
  />
);

TimestampPill.displayName = 'TimestampPill';
