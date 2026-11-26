import type {
  APIResolvedChannel,
  APIResolvedGuild,
  APIResolvedRole,
  APIResolvedUser,
  MessageResolvers,
} from '@discord-mana/messages';
import type { ParseState } from './simpleMarkdown';

// What the client's markdown rules read from its stores comes from the resolvers here.

/** Strings the parser itself writes into the output (unknown mentions, route names), in the client's en-US wording. */
export const DEFAULT_MARKDOWN_STRINGS = {
  UNKNOWN: 'Unknown',
  NO_ACCESS: 'No Access',
  UNKNOWN_CHANNEL: 'unknown-channel',
  UNKNOWN_ROLE: 'unknown-role',
  UNKNOWN_USER: 'unknown-user',
  SPOILER: 'Spoiler',
  SERVER_GUIDE: 'Server Guide',
  BROWSE_CHANNELS: 'Browse Channels',
  CHANNELS_AND_ROLES: 'Channels & Roles',
  LINKED_ROLES: 'Linked Roles',
  MESSAGE: 'Message',
  EMOJI_TOOLTIP_CLICK_CTA: 'Click to learn more',
  CHANNEL_ICON: {
    voice: 'Voice Channel',
    'voice-locked': 'Voice Channel (Locked)',
    'voice-nsfw': 'Voice (Age-Restricted)',
    'voice-spoiler': 'Voice (Spoiler)',
    stage: 'Stage Channel',
    'stage-locked': 'Stage Channel (Locked)',
    thread: 'Thread',
    text: 'Text',
    'text-nsfw': 'Text (Age-Restricted)',
    'text-spoiler': 'Text (Spoiler)',
    announcement: 'Announcements',
    'announcement-nsfw': 'Announcements (Age-Restricted)',
    'announcement-spoiler': 'Announcements (Spoiler)',
    forum: 'Forum Channel',
    'forum-nsfw': 'Forum (Age-Restricted)',
    'forum-spoiler': 'Forum (Spoiler)',
    post: 'Forum Post',
    home: 'Server Guide',
    guide: 'Server Guide',
    browse: 'Browse Channels',
    customize: 'Browse Channels',
    message: 'Message',
    locked: 'No Access',
    media: 'Media Channel',
    'media-nsfw': 'Media Channel (Age-Restricted)',
    'linked-roles': 'Linked Roles',
    app: 'App',
    'app-nsfw': 'App (Age-Restricted)',
    'app-spoiler': 'App (Spoiler)',
  } as Record<string, string>,
};

export type MarkdownStrings = typeof DEFAULT_MARKDOWN_STRINGS;

/** A channel the message mentions in `mention_channels` (crossposted messages from other servers). */
export interface MentionChannel {
  id: string;
  guild_id: string;
  type: number;
  name: string;
}

/**
 * The parse state options Discord's message renderer passes (`renderOptions` plus the message's ids). All are
 * optional; presets fill them in like the client does for each context.
 */
export interface MarkdownParseOptions {
  channelId?: string;
  messageId?: string;
  guildId?: string;
  authorId?: string;
  viewingChannelId?: string;
  allowLinks?: boolean;
  allowEmojiLinks?: boolean;
  allowDevLinks?: boolean;
  allowGameMentions?: boolean;
  allowTimeMentionInput?: boolean;
  allowHeading?: boolean;
  allowList?: boolean;
  allowSubtext?: boolean;
  allowEscape?: boolean;
  formatInline?: boolean;
  noStyleAndInteraction?: boolean;
  previewLinkTarget?: boolean;
  disableAnimatedEmoji?: boolean;
  disableAutoBlockNewlines?: boolean;
  unknownUserMentionPlaceholder?: boolean;
  disablePressableChannelMention?: boolean;
  mentionChannels?: MentionChannel[];
  /** Mention rules return bare `{ type, id }` nodes (what the client's chat input uses). */
  returnMentionIds?: boolean;
  /** The locale dates are formatted in (default en-US). */
  locale?: string;
  /** The word to highlight (AutoMod system messages). */
  highlightWord?: string;
  isSlate?: boolean;
}

export interface MarkdownState extends ParseState, MarkdownParseOptions {
  resolvers?: MessageResolvers;
  strings?: MarkdownStrings;
}

const CHANNEL_TYPES = {
  GUILD_TEXT: 0,
  DM: 1,
  GUILD_VOICE: 2,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  GUILD_STORE: 6,
  ANNOUNCEMENT_THREAD: 10,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
  GUILD_STAGE_VOICE: 13,
  GUILD_DIRECTORY: 14,
  GUILD_FORUM: 15,
  GUILD_MEDIA: 16,
  MEDIA_THREAD: 19,
  GUILD_SPACE: 20,
  GUILD_APP: 21,
  UNKNOWN: 10000,
} as const;

export { CHANNEL_TYPES };

const T = CHANNEL_TYPES;
const TEXT_CHANNEL_TYPES = new Set<number>([
  T.DM,
  T.GROUP_DM,
  T.GUILD_TEXT,
  T.GUILD_ANNOUNCEMENT,
  T.ANNOUNCEMENT_THREAD,
  T.PUBLIC_THREAD,
  T.PRIVATE_THREAD,
  T.GUILD_APP,
]);
const THREAD_TYPES = new Set<number>([T.ANNOUNCEMENT_THREAD, T.PUBLIC_THREAD, T.PRIVATE_THREAD, T.MEDIA_THREAD]);
const MENTIONABLE_TYPES = new Set<number>([
  T.GUILD_TEXT,
  T.GUILD_ANNOUNCEMENT,
  T.GUILD_STORE,
  T.ANNOUNCEMENT_THREAD,
  T.PUBLIC_THREAD,
  T.PRIVATE_THREAD,
  T.GUILD_DIRECTORY,
  T.GUILD_FORUM,
  T.GUILD_MEDIA,
  T.GUILD_APP,
  T.DM,
  T.GROUP_DM,
  T.GUILD_VOICE,
  T.GUILD_STAGE_VOICE,
]);
const SPOILER_CHANNEL_FLAG = 2097152;

export const isPrivateChannel = (channel: APIResolvedChannel) => channel.type === T.DM || channel.type === T.GROUP_DM;
export const isMentionableChannelType = (type: number) => MENTIONABLE_TYPES.has(type);

/** The resolvers' view of the client's stores, as the markdown rules use them. */
export const getLookup = (state: MarkdownState) => {
  const resolvers = state.resolvers ?? {};
  const channel = (id: string | null | undefined): APIResolvedChannel | null =>
    id == null ? null : (resolvers.resolveChannel?.(id) ?? null);
  const guildIdOf = (channelId: string | null | undefined) => channel(channelId)?.guild_id ?? undefined;
  const currentGuildId = guildIdOf(state.channelId) ?? state.guildId;
  // Apps rarely resolve the server they render; the current one exists even without a resolver entry.
  const guild = (id: string | null | undefined): APIResolvedGuild | null => {
    if (id == null) return null;
    const resolved = resolvers.resolveGuild?.(id);
    if (resolved != null) return resolved;
    return id === currentGuildId ? { id, name: '' } : null;
  };
  const isForumPost = (c: APIResolvedChannel) => {
    if (c.type !== T.PUBLIC_THREAD) return false;
    const parent = channel(c.parent_id);
    return parent != null && (parent.type === T.GUILD_FORUM || parent.type === T.GUILD_MEDIA);
  };
  const iconType = (c: APIResolvedChannel | null): string | undefined => {
    if (c == null) return 'text';
    const nsfw = c.nsfw === true;
    const spoiler = ((c.flags ?? 0) & SPOILER_CHANNEL_FLAG) !== 0;
    const media = c.type === T.GUILD_MEDIA;
    if (c.type === T.GUILD_VOICE)
      return c.can_connect !== false ? (nsfw ? 'voice-nsfw' : spoiler ? 'voice-spoiler' : 'voice') : 'voice-locked';
    if (c.type === T.GUILD_STAGE_VOICE) return c.can_connect !== false ? 'stage' : 'stage-locked';
    if (THREAD_TYPES.has(c.type)) return isForumPost(c) ? 'post' : 'thread';
    if (c.type === T.GUILD_FORUM)
      return media ? (nsfw ? 'media-nsfw' : 'media') : nsfw ? 'forum-nsfw' : spoiler ? 'forum-spoiler' : 'forum';
    if (c.type === T.GUILD_MEDIA) return nsfw ? 'media-nsfw' : 'media';
    if (c.type === T.GUILD_ANNOUNCEMENT)
      return nsfw ? 'announcement-nsfw' : spoiler ? 'announcement-spoiler' : 'announcement';
    if (c.type === T.GUILD_APP) return nsfw ? 'app-nsfw' : spoiler ? 'app-spoiler' : 'app';
    if (TEXT_CHANNEL_TYPES.has(c.type)) return nsfw ? 'text-nsfw' : spoiler ? 'text-spoiler' : 'text';
    return undefined;
  };
  const user = (id: string | null | undefined): APIResolvedUser | null =>
    id == null ? null : (resolvers.resolveUser?.(id) ?? null);
  const role = (id: string | null | undefined): APIResolvedRole | null =>
    id == null ? null : (resolvers.resolveRole?.(id) ?? null);
  return {
    resolvers,
    strings: state.strings ?? DEFAULT_MARKDOWN_STRINGS,
    currentGuildId,
    channel,
    guildIdOf,
    guild,
    isForumPost,
    iconType,
    user,
    member: (userId: string) => resolvers.resolveMember?.(userId) ?? null,
    role,
    channelName: (c: APIResolvedChannel) => c.name ?? '',
  };
};

export type Lookup = ReturnType<typeof getLookup>;

/** The name the client shows for a user: the server nickname, else the display name, else the username. */
export const getUserDisplayName = (user: APIResolvedUser, nick?: string | null) =>
  nick ?? (user.global_name != null && user.global_name !== '' ? user.global_name : user.username);
