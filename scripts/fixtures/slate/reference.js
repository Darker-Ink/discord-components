// Renders Discord's chat input (ChannelTextAreaContainer, module 989161 Ay) the way the channel chat does: it
// keeps the text and rich value in state (as the draft store would) and passes them back in. Stores the
// gateway would fill are patched from the fixture: users (287809), roles (317525), channels (734057), the
// server (71393), custom emoji (121681), permissions (576705, everything allowed), and emoji image URLs.
async (ref, data) => {
  await ref.boot([
    '989161',
    '316576',
    '355622',
    '95701',
    '734057',
    '287809',
    '619019',
    '317525',
    '71393',
    '576705',
    '486020',
    '690521',
    '121681',
  ]);
  const h = ref.React.createElement;
  const req = ref.req;
  const { createChannelRecord } = req('95701');
  const channel = createChannelRecord(
    data.channel ?? {
      id: data.channel_id ?? '1200000000000000000',
      type: 0,
      guild_id: data.guild_id ?? '1100000000000000000',
      name: 'general',
    },
  );
  const ChannelStore = req('734057').A;
  const channels = new Map([[channel.id, channel]]);
  for (const c of data.channels ?? [])
    if (!channels.has(c.id)) channels.set(c.id, createChannelRecord({ guild_id: data.guild_id, ...c }));
  const getChannel = ChannelStore.getChannel.bind(ChannelStore);
  ChannelStore.getChannel = (id) => channels.get(id) ?? getChannel(id);
  ChannelStore.getBasicChannel = ChannelStore.getChannel;
  const UserStore = req('287809').default;
  const User = req('619019').A;
  const users = new Map();
  for (const apiUser of data.users ?? []) {
    const user = new User(apiUser);
    if (apiUser.avatar_url != null) user.getAvatarURL = () => apiUser.avatar_url;
    users.set(apiUser.id, user);
  }
  const getUser = UserStore.getUser.bind(UserStore);
  UserStore.getUser = (id) => users.get(id) ?? getUser(id);
  const RoleStore = req('317525').A;
  const roles = (data.roles ?? []).map((role) => ({
    ...role,
    colorString: role.color ? '#' + role.color.toString(16).padStart(6, '0') : null,
    colorStrings: role.color
      ? { primaryColor: '#' + role.color.toString(16).padStart(6, '0'), secondaryColor: null, tertiaryColor: null }
      : null,
    permissions: 0n,
    mentionable: true,
  }));
  RoleStore.getRole = (guildId, id) => roles.find((role) => role.id === id);
  RoleStore.getSortedRoles = () => [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  RoleStore.getRolesSnapshot = () => Object.fromEntries(roles.map((role) => [role.id, role]));
  const PermissionStore = req('576705').A;
  PermissionStore.can = () => true;
  PermissionStore.computePermissions = () => -1n;
  const emojiUrls = data.emoji_urls ?? {};
  const emojiUtils = req('486020').Ay;
  const getEmojiURL = emojiUtils.getEmojiURL;
  emojiUtils.getEmojiURL = (options) => emojiUrls[options.id] ?? getEmojiURL(options);
  const unicodeEmoji = req('690521').Ay;
  const getUnicodeURL = unicodeEmoji.getURL.bind(unicodeEmoji);
  unicodeEmoji.getURL = (name) => (name in emojiUrls ? emojiUrls[name] : getUnicodeURL(name));
  // Custom emoji the server has, for typed `:name:` and the emoji autocomplete.
  const EmojiStore = req('121681').Ay;
  const customEmoji = new Map(
    (data.emojis ?? []).map((emoji) => [
      emoji.name,
      {
        id: emoji.id,
        name: emoji.name,
        allNamesString: `:${emoji.name}:`,
        animated: emoji.animated ?? false,
        require_colons: emoji.require_colons ?? true,
        available: true,
        managed: false,
        guildId: data.guild_id,
        type: 1,
      },
    ]),
  );
  const getContext = EmojiStore.getDisambiguatedEmojiContext.bind(EmojiStore);
  EmojiStore.getDisambiguatedEmojiContext = (guildId) => {
    const context = getContext(guildId);
    return new Proxy(context, {
      get: (target, key) =>
        key === 'getCustomEmoji'
          ? () => customEmoji
          : key === 'getById'
            ? (id) => [...customEmoji.values()].find((emoji) => emoji.id === id) ?? target.getById(id)
            : typeof target[key] === 'function'
              ? target[key].bind(target)
              : target[key],
    });
  };
  const ChannelTextAreaContainer = req('989161').Ay;
  const AttachButton = req('316576').A;
  const types = req('355622').oU;
  const { x7: toRichValue } = req('408018');
  const type = types[data.type ?? 'NORMAL'];
  const Chat = () => {
    const [state, setState] = ref.React.useState(() => ({
      textValue: data.value ?? '',
      richValue: toRichValue(data.value ?? ''),
    }));
    window.__slateValue = state.textValue;
    return h(ChannelTextAreaContainer, {
      textValue: state.textValue,
      richValue: state.richValue,
      channel,
      type,
      focused: true,
      placeholder: data.placeholder ?? 'Message #general',
      accessibilityLabel: data.placeholder ?? 'Message #general',
      disabled: data.disabled ?? false,
      onChange: (_event, textValue, richValue) => setState({ textValue, richValue }),
      onSubmit: () => Promise.resolve({ shouldClear: true, shouldRefocus: true }),
      maxCharacterCount: data.maxCharacterCount,
      // The channel chat's "+" button (5206 renderAttachButton).
      renderAttachButton: (canOnlyUseTextCommands, className) =>
        h(AttachButton, {
          className,
          channel,
          draftType: 0,
          editorTextContent: state.textValue,
          setValue: () => {},
          canOnlyUseTextCommands,
          chatInputType: type,
        }),
    });
  };
  return h('div', { style: { width: 640 } }, h(Chat));
};
