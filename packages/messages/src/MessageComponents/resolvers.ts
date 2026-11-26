import { createContext, useContext } from 'react';
import type { StatusType } from '@discord-mana/components';

// Users, roles and channels the client reads from its stores. Apps pass resolvers (and the message's
// `resolved` data is used as a fallback) so selects, mentions and headers can show names, avatars and colours.

export interface APIResolvedUser {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
  bot?: boolean;
  system?: boolean;
  /** Not part of the API: a ready-made avatar URL that wins over the CDN URL built from `avatar`. */
  avatar_url?: string;
}

export interface APIResolvedMember {
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
}

export interface APIResolvedRole {
  id: string;
  name: string;
  color: number;
  /** Gradient colours (`colors.primary_color`…) are not drawn here; the plain `color` is used. */
  position?: number;
  icon?: string | null;
  unicode_emoji?: string | null;
}

export interface APIResolvedChannel {
  id: string;
  name?: string | null;
  type: number;
  parent_id?: string | null;
}

/** The `resolved` object of a message (auto-populated select menus) or an interaction. */
export interface APIResolvedData {
  users?: Record<string, APIResolvedUser>;
  members?: Record<string, APIResolvedMember>;
  roles?: Record<string, APIResolvedRole>;
  channels?: Record<string, APIResolvedChannel>;
}

export interface EmojiURLOptions {
  id?: string | null;
  name?: string | null;
  animated?: boolean;
  /** CSS pixel size the client asks for. */
  size: number;
}

export interface MessageResolvers {
  resolveUser?: (id: string) => APIResolvedUser | null | undefined;
  /** The author's guild member (nickname, roles for the name colour). */
  resolveMember?: (userId: string) => APIResolvedMember | null | undefined;
  resolveRole?: (id: string) => APIResolvedRole | null | undefined;
  resolveChannel?: (id: string) => APIResolvedChannel | null | undefined;
  /** A server, for the origin of forwarded messages from other servers. */
  resolveGuild?: (id: string) => { id: string; name: string; icon?: string | null } | null | undefined;
  /** Options for user and mentionable selects (the client searches the guild's members). */
  searchUsers?: (query: string) => APIResolvedUser[];
  /** Options for role and mentionable selects. */
  searchRoles?: (query: string) => APIResolvedRole[];
  /** A user's presence for the status dot on user options ("online", "idle", "dnd", "offline"…). */
  getUserStatus?: (userId: string) => StatusType | null | undefined;
  /** Members with a role, shown next to role options. */
  getRoleMemberCount?: (roleId: string) => number | null | undefined;
  /** Options for channel selects, already filtered to `channelTypes` when given. */
  searchChannels?: (query: string, channelTypes?: number[]) => APIResolvedChannel[];
  /**
   * Image URL for an emoji. Custom emojis default to the CDN; unicode emojis default to no image (the client's
   * text fallback), since the client ships its emoji artwork as bundled assets.
   */
  getEmojiURL?: (emoji: EmojiURLOptions) => string | null | undefined;
  /**
   * An emoji's name for labels: the client names unicode emojis by their shortcode ("thumbsup"). Defaults to
   * the custom emoji's name or the unicode emoji itself.
   */
  getEmojiName?: (emoji: { id?: string | null; name?: string | null }) => string | null | undefined;
  /** Avatar URL for a user at a CSS pixel size; defaults to the CDN (or the default avatar). */
  getAvatarURL?: (user: APIResolvedUser, size: number) => string | null | undefined;
}

export const MessageResolversContext = createContext<MessageResolvers>({});

MessageResolversContext.displayName = 'MessageResolversContext';

export const useMessageResolvers = () => useContext(MessageResolversContext);

export const CDN_URL = 'https://cdn.discordapp.com';

// The CDN serves these sizes; the client rounds requests (times the device pixel ratio) up to one of them.
const IMAGE_SIZES = [
  16, 20, 22, 24, 28, 32, 40, 44, 48, 56, 60, 64, 80, 96, 100, 128, 160, 240, 256, 300, 320, 480, 512, 600, 640, 1024,
  1280, 1536, 2048, 3072, 4096,
];

export const getImageSize = (size: number) => {
  const ratio = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
  const wanted = size * ratio;
  return IMAGE_SIZES.find((value) => value >= wanted) ?? IMAGE_SIZES[IMAGE_SIZES.length - 1];
};

export const getDefaultEmojiURL = ({ id, animated = false, size }: EmojiURLOptions) =>
  id != null ? `${CDN_URL}/emojis/${id}.webp?size=${getImageSize(size)}${animated ? '&animated=true' : ''}` : null;

/** The default avatar index: the new username system uses the id, legacy accounts the discriminator. */
export const getDefaultAvatarIndex = (user: Pick<APIResolvedUser, 'id' | 'discriminator'>) => {
  const discriminator = Number(user.discriminator ?? 0);
  if (discriminator > 0) return discriminator % 5;
  return Number((BigInt(user.id) >> 22n) % 6n);
};

export const getDefaultAvatarURL = (user: APIResolvedUser, size: number) => {
  if (user.avatar_url != null) return user.avatar_url;
  if (user.avatar != null) {
    const animated = user.avatar.startsWith('a_');
    return `${CDN_URL}/avatars/${user.id}/${user.avatar}.${animated ? 'gif' : 'webp'}?size=${getImageSize(size)}`;
  }
  return `${CDN_URL}/embed/avatars/${getDefaultAvatarIndex(user)}.png`;
};

/** Looks up resolved data first in the resolvers, then in the message's or modal's `resolved` object. */
export const createResolver = (resolvers: MessageResolvers, resolved: APIResolvedData | null | undefined) => ({
  user: (id: string) => resolvers.resolveUser?.(id) ?? resolved?.users?.[id] ?? null,
  member: (id: string) => resolvers.resolveMember?.(id) ?? resolved?.members?.[id] ?? null,
  role: (id: string) => resolvers.resolveRole?.(id) ?? resolved?.roles?.[id] ?? null,
  channel: (id: string) => resolvers.resolveChannel?.(id) ?? resolved?.channels?.[id] ?? null,
  emojiURL: (emoji: EmojiURLOptions) =>
    resolvers.getEmojiURL != null ? resolvers.getEmojiURL(emoji) : getDefaultEmojiURL(emoji),
  avatarURL: (user: APIResolvedUser, size: number) =>
    resolvers.getAvatarURL?.(user, size) ?? getDefaultAvatarURL(user, size),
});

export type Resolver = ReturnType<typeof createResolver>;
