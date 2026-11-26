// Renders markdown cases with the client's own parser and React rules: message content goes through the
// message renderer (354777 Ay: 46054 parse plus jumbo emoji and the inline-reply handling) into the message
// content container (715628), other contexts through their 46054 parser. Stores the rules read are patched
// with the fixture's users, members, roles, channels and servers; unicode emoji images come from `emoji_urls`
// (no image otherwise, like our default), custom ones too.
// `window.__markdownReference.parseToAST(fixtureData, index)` returns the client's AST for the AST comparison.
async (ref, data) => {
  await ref.boot([
    '46054',
    '354777',
    '715628',
    '432005',
    '95701',
    '619019',
    '287809',
    '734057',
    '71393',
    '317525',
    '562153',
    '576705',
    '690521',
    '486020',
    '605275',
  ]);
  const h = ref.React.createElement;
  const req = ref.req;
  const { rh: createMessage } = req('432005');
  const { createChannelRecord } = req('95701');
  const User = req('619019').A;

  const users = new Map((data.users ?? []).map((user) => [user.id, new User(user)]));
  const rawChannels = new Map((data.channels ?? []).map((channel) => [channel.id, channel]));
  const channels = new Map(
    (data.channels ?? []).map((channel) => [
      channel.id,
      createChannelRecord({
        ...channel,
        parent_id: channel.parent_id ?? null,
        // The channel store records the parent's type on threads (forum posts are threads of forums).
        parentChannelThreadType: rawChannels.get(channel.parent_id)?.type,
      }),
    ]),
  );
  const guilds = new Map(
    (data.guilds ?? []).map((guild) => [
      guild.id,
      { ...guild, icon: guild.icon ?? null, features: new Set(guild.features ?? []), getIconURL: undefined },
    ]),
  );
  const hex = (color) => `#${color.toString(16).padStart(6, '0')}`;
  const roles = new Map(
    (data.roles ?? []).map((role) => [
      role.id,
      {
        ...role,
        colorString: role.color !== 0 ? hex(role.color) : null,
        colorStrings:
          role.colors != null
            ? {
                primaryColor: role.colors.primary_color === 0 ? '#99aab5' : hex(role.colors.primary_color),
                secondaryColor: role.colors.secondary_color == null ? null : hex(role.colors.secondary_color),
                tertiaryColor: role.colors.tertiary_color == null ? null : hex(role.colors.tertiary_color),
              }
            : null,
        tags: role.tags ?? {},
      },
    ]),
  );

  const patch = (store, name, impl) => {
    const original = store[name].bind(store);
    store[name] = (...args) => impl(original, ...args);
  };
  const UserStore = req('287809').default;
  patch(UserStore, 'getUser', (original, id) => users.get(id) ?? original(id));
  const ChannelStore = req('734057').A;
  patch(ChannelStore, 'getChannel', (original, id) => channels.get(id) ?? original(id));
  ChannelStore.getBasicChannel = ChannelStore.getChannel;
  const GuildStore = req('71393').A;
  patch(GuildStore, 'getGuild', (original, id) => guilds.get(id) ?? original(id));
  const RoleStore = req('317525').A;
  patch(RoleStore, 'getRole', (original, guildId, roleId) => roles.get(roleId) ?? original(guildId, roleId));
  const nicknames = req('562153').Ay;
  patch(nicknames, 'getNickname', (original, guildId, channelId, user) =>
    guildId != null && user != null ? (data.members?.[user.id]?.nick ?? null) : null,
  );
  // Channels the fixture lists are visible (and joinable) unless they say otherwise.
  const PermissionStore = req('576705').A;
  patch(PermissionStore, 'can', (original, permission, channel) => {
    const raw = channel?.id != null ? rawChannels.get(channel.id) : null;
    if (raw == null) return original(permission, channel);
    return permission === 1048576n ? raw.can_connect !== false : raw.can_view !== false;
  });
  const emojiUrls = data.emoji_urls ?? {};
  const unicodeEmoji = req('690521').Ay;
  unicodeEmoji.getURL = (surrogate) => emojiUrls[surrogate] ?? '';
  const emojiUtils = req('486020').Ay;
  const getEmojiURL = emojiUtils.getEmojiURL;
  emojiUtils.getEmojiURL = (options) => emojiUrls[options.id] ?? getEmojiURL(options);

  const parser = req('46054').A;
  const messageRenderer = req('354777');
  const channelId = '1200000000000000000';
  const messageFor = (content, index) =>
    createMessage({
      id: String(1300000000000000000n + BigInt(index)),
      channel_id: channelId,
      type: 0,
      content,
      timestamp: '2026-11-26T12:00:00.000Z',
      edited_timestamp: null,
      flags: 0,
      attachments: [],
      embeds: [],
      components: [],
      mentions: [],
      mention_roles: [],
      pinned: false,
      mention_everyone: false,
      tts: false,
      author: {
        id: '1000000000000000001',
        username: 'wumpus',
        global_name: 'Wumpus',
        avatar: null,
        discriminator: '0',
      },
    });
  // The chat's message list options, and the reply bar's.
  const MESSAGE_OPTIONS = {
    hideSimpleEmbedContent: true,
    allowList: true,
    allowHeading: true,
    allowLinks: true,
    previewLinkTarget: true,
    allowGameMentions: true,
  };
  const REPLY_OPTIONS = { formatInline: true, allowLinks: true, allowHeading: true, allowList: true };
  const TEXT_DISPLAY_OPTIONS = {
    allowList: true,
    allowHeading: true,
    allowLinks: true,
    allowGameMentions: true,
    previewLinkTarget: true,
  };
  const embedState = (heading) => ({
    channelId,
    allowLinks: true,
    allowEmojiLinks: true,
    allowList: true,
    allowHeading: heading,
    previewLinkTarget: true,
  });
  const preset = data.preset ?? 'message';
  const extra = data.context ?? {};
  const render = (content, index, toAST) => {
    const message = messageFor(content, index);
    const state = { channelId, messageId: message.id, ...extra };
    switch (preset) {
      case 'message':
        return (toAST ? messageRenderer.b6 : messageRenderer.Ay)(message, { ...MESSAGE_OPTIONS, ...extra }).content;
      case 'reply':
        return (toAST ? messageRenderer.b6 : messageRenderer.Ay)(message, { ...REPLY_OPTIONS, ...extra }).content;
      case 'textDisplay':
        return (toAST ? parser.parseToAST : parser.parse)(content, true, {
          ...messageRenderer.ko(message, TEXT_DISPLAY_OPTIONS),
          ...extra,
        });
      case 'embedTitle':
        return (toAST ? parser.parseEmbedTitleToAST : parser.parseEmbedTitle)(content, true, { channelId, ...extra });
      case 'embedTitleWithoutLinks':
        return (toAST ? parser.parseEmbedTitleWithoutLinksToAST : parser.parseEmbedTitleWithoutLinks)(content, true, {
          channelId,
          ...extra,
        });
      case 'embedDescription':
        return toAST
          ? parser.parseToAST(content, true, { allowGameMentions: true, ...embedState(true), ...extra })
          : parser.parseRichEmbedText(content, true, { ...embedState(true), ...extra });
      case 'embedFieldValue':
        return toAST
          ? parser.parseToAST(content, true, { allowGameMentions: true, ...embedState(false), ...extra })
          : parser.parseRichEmbedText(content, true, { ...embedState(false), ...extra });
      case 'channelTopic':
        return (toAST ? parser.parseTopicToAST : parser.parseTopic)(content, true, { ...state, allowLinks: true });
      case 'voiceChannelStatus':
        return parser.parseVoiceChannelStatus(content, true, state);
      case 'guildEvent':
        return parser.parseGuildEventDescription(content, true, state);
      case 'guildVerificationFormRule':
        return parser.parseGuildVerificationFormRule(content, true, state);
      case 'forumPostGuidelines':
        return parser.parseForumPostGuidelines(content, true, state);
      case 'autoModerationMessage':
        return (toAST ? parser.parseAutoModerationSystemMessageToAST : parser.parseAutoModerationSystemMessage)(
          content,
          true,
          state,
        );
      case 'poll':
        return (toAST ? parser.parsePollToAST : parser.parsePoll)(content, true, state);
      default:
        throw new Error(`unknown preset ${preset}`);
    }
  };
  window.__markdownReference = { parseToAST: (index) => render(data.cases[index], index, true) };
  const MessageContent = req('715628').A;
  const channel = channels.get(channelId);
  // Parsed while rendering, once the strings have loaded.
  const Case = ({ content, index }) =>
    MessageContent({ message: messageFor(content, index), channel, compact: false }, render(content, index, false));
  return h(
    'div',
    null,
    data.cases.map((content, index) =>
      h('div', { key: index, 'data-case': index, style: { marginBottom: 8 } }, h(Case, { content, index })),
    ),
  );
};
