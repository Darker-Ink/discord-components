import type { APIResolvedChannel, APIResolvedGuild, APIResolvedRole, APIResolvedUser } from '@discord-mana/messages';
import type { EditorCustomEmoji, EditorResolvers, EditorUnicodeEmoji } from '@discord-mana/slate';

// Sample server for the editor stories (and scripts/fixtures/slate, which use the same shapes): the resolvers an
// app passes in place of the client's stores.

export interface EditorFixtureData {
  guild_id?: string;
  channel_id?: string;
  users?: APIResolvedUser[];
  members?: Record<string, { nick?: string | null }>;
  roles?: APIResolvedRole[];
  channels?: APIResolvedChannel[];
  guilds?: APIResolvedGuild[];
  emojis?: EditorCustomEmoji[];
  unicode_emojis?: EditorUnicodeEmoji[];
  /** Image URLs by custom emoji id or unicode emoji. */
  emoji_urls?: Record<string, string>;
}

const ASSETS = `${typeof window !== 'undefined' ? window.location.origin : ''}/messages`;

export const SAMPLE_EDITOR_DATA: EditorFixtureData = {
  guild_id: '1100000000000000000',
  channel_id: '1200000000000000000',
  users: [
    {
      id: '1000000000000000001',
      username: 'wumpus',
      global_name: 'Wumpus',
      discriminator: '0',
      avatar_url: `${ASSETS}/avatar.png`,
    },
    {
      id: '1000000000000000002',
      username: 'clyde',
      global_name: 'Clyde',
      discriminator: '0',
      avatar_url: `${ASSETS}/icon.png`,
    },
    {
      id: '1000000000000000003',
      username: 'nelly',
      global_name: null,
      discriminator: '0',
      avatar_url: `${ASSETS}/small.png`,
    },
  ],
  members: { '1000000000000000002': { nick: 'Clyde the Bot' } },
  roles: [
    { id: '1300000000000000001', name: 'Moderators', color: 0x3498db, position: 3 },
    { id: '1300000000000000002', name: 'Artists', color: 0xe91e63, position: 2 },
    { id: '1300000000000000003', name: 'Members', color: 0, position: 1 },
  ],
  channels: [
    { id: '1200000000000000000', name: 'general', type: 0, guild_id: '1100000000000000000' },
    { id: '1200000000000000001', name: 'announcements', type: 5, guild_id: '1100000000000000000' },
    { id: '1200000000000000002', name: 'Lounge', type: 2, guild_id: '1100000000000000000' },
    { id: '1200000000000000003', name: 'help-forum', type: 15, guild_id: '1100000000000000000' },
  ],
  guilds: [{ id: '1100000000000000000', name: 'Wumpus Club' }],
  emojis: [
    { id: '1400000000000000001', name: 'wumpus_wave', animated: false, require_colons: true, guildName: 'Wumpus Club' },
    { id: '1400000000000000002', name: 'party_blob', animated: true, require_colons: true, guildName: 'Wumpus Club' },
  ],
  unicode_emojis: [
    { names: ['joy'], surrogates: '😂' },
    { names: ['fire', 'flame'], surrogates: '🔥' },
    { names: ['tada'], surrogates: '🎉' },
    { names: ['sparkles'], surrogates: '✨' },
    { names: ['heart'], surrogates: '❤️' },
    { names: ['smile'], surrogates: '😄' },
  ],
  emoji_urls: {
    '1400000000000000001': `${ASSETS}/icon.png`,
    '1400000000000000002': `${ASSETS}/small.png`,
    '😂': `${ASSETS}/emoji/1f602.svg`,
    '🔥': `${ASSETS}/emoji/1f525.svg`,
    '🎉': `${ASSETS}/emoji/1f389.svg`,
    '✨': `${ASSETS}/emoji/2728.svg`,
    '❤️': `${ASSETS}/emoji/2764-fe0f.svg`,
    '😄': `${ASSETS}/emoji/1f604.svg`,
  },
};

const matches = (query: string, ...names: (string | null | undefined)[]) =>
  names.some((name) => name != null && name.toLowerCase().includes(query.toLowerCase()));

export const createEditorResolvers = (data: EditorFixtureData): EditorResolvers => ({
  resolveUser: (id) => data.users?.find((user) => user.id === id),
  resolveMember: (id) => data.members?.[id],
  resolveRole: (id) => data.roles?.find((role) => role.id === id),
  resolveChannel: (id) => data.channels?.find((channel) => channel.id === id),
  resolveGuild: (id) => data.guilds?.find((guild) => guild.id === id),
  resolveCustomEmoji: (name) => data.emojis?.find((emoji) => emoji.name === name),
  getEmojiURL: ({ id, name }) => {
    const key = id ?? name;
    return key != null ? (data.emoji_urls?.[key] ?? null) : null;
  },
  getRoles: () => [...(data.roles ?? [])].sort((a, b) => (b.position ?? 0) - (a.position ?? 0)),
  getMentionableUsers: () => data.users ?? [],
  getChannels: () => data.channels ?? [],
  searchUsers: (query) =>
    (data.users ?? []).filter((user) => matches(query, user.username, user.global_name, data.members?.[user.id]?.nick)),
  searchRoles: (query) => (data.roles ?? []).filter((role) => matches(query, role.name)),
  searchChannels: (query) => (data.channels ?? []).filter((channel) => matches(query, channel.name)),
  searchEmojis: (query) => ({
    custom: (data.emojis ?? []).filter((emoji) => matches(query, emoji.name)),
    unicode: (data.unicode_emojis ?? []).filter((emoji) => matches(query, ...emoji.names)),
  }),
});
