// Renders a chat message the way the client's message list item does (module 730276): the API message
// becomes a message record (432005 rh, which also converts components with 257249 ZV), the channel a
// channel record (95701), and BaseMessage (491182) gets the cozy header (549587), the content (715628)
// and the message accessories (699352 A: attachments, embeds, components, reactions…), inside
// li.messageListItem with the list item's message classes (13673). The hover toolbar and popouts are left
// out; the reply bar (448368) and the "used /command" line (267508) are included without their popouts.
// Content renders as raw text (markdown is out of scope): the parsed content is replaced by the message's text,
// keeping the client's custom content ("is thinking…") and the hidden single-link rule, and Text Displays'
// parser returns the raw text.
// Stores that would be filled by the gateway are patched: the user store returns the author (so the avatar
// resolves), the channel store the fixture's channel. Fixtures may set `now` (the clock is frozen there).
async (ref, data) => {
  await ref.boot([
    '491182',
    '549587',
    '715628',
    '699352',
    '432005',
    '95701',
    '13673',
    '287809',
    '734057',
    '763754',
    '88484',
    '448767',
    '619019',
    '860227',
    '486020',
    '690521',
    '46054',
  ]);
  const h = ref.React.createElement;
  const req = ref.req;
  const { rh: createMessage } = req('432005');
  const { createChannelRecord } = req('95701');
  const channel = createChannelRecord(
    data.channel ?? { id: '1200000000000000000', type: 0, guild_id: '1100000000000000000', name: 'general' },
  );
  const ChannelStore = req('734057').A;
  const getChannel = ChannelStore.getChannel.bind(ChannelStore);
  ChannelStore.getChannel = (id) => (id === channel.id ? channel : getChannel(id));
  ChannelStore.getBasicChannel = ChannelStore.getChannel;
  const UserStore = req('287809').default;
  const User = req('619019').A;
  const users = new Map();
  const addUser = (apiUser) => {
    if (apiUser == null || users.has(apiUser.id)) return;
    const user = new User(apiUser);
    // Avatars come from the fixture's assets instead of the CDN.
    if (apiUser.avatar_url != null) user.getAvatarURL = () => apiUser.avatar_url;
    users.set(apiUser.id, user);
  };
  const getUser = UserStore.getUser.bind(UserStore);
  UserStore.getUser = (id) => users.get(id) ?? getUser(id);
  const apiMessage = {
    id: '1300000000000000000',
    channel_id: channel.id,
    type: 0,
    content: '',
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
    ...data.message,
  };
  addUser(apiMessage.author);
  addUser(apiMessage.referenced_message?.author);
  addUser(apiMessage.interaction_metadata?.user);
  const message = createMessage(apiMessage);
  if (message.interaction != null && users.has(message.interaction.user.id))
    message.interaction.user = users.get(message.interaction.user.id);
  for (const record of [message, message.messageSnapshots?.[0]?.message].filter(Boolean)) {
    const user = users.get(record.author?.id);
    if (user != null) record.author = user;
  }
  const { $J: customContent } = req('88484');
  const { k5: isSimpleEmbed } = req('448767');
  const rawContent = (m) => {
    const custom = customContent(m);
    if (custom != null) return custom.content;
    if (isSimpleEmbed(m.embeds) && /^\s*https?:\/\/\S+\s*$/.test(m.content)) return '';
    return m.content;
  };
  // Components v2 Text Displays go through the markdown parser too; show their raw text.
  // Embed titles and descriptions too (renderEmbedTitle/renderEmbedDescription of the accessories).
  const parser = req('46054').A;
  parser.parse =
    parser.parseEmbedTitle =
    parser.parseEmbedTitleWithoutLinks =
    parser.parseRichEmbedText =
      (text) => text;
  const BaseMessage = req('491182').A;
  const MessageHeader = req('549587').Ay;
  const content = req('715628').A;
  const accessories = req('699352').A;
  const listItem = req('13673');
  const getAuthor = req('763754').Ay;
  // Emoji images: fixtures map custom emoji ids and unicode emojis to URLs (the same on both sides).
  const emojiUrls = data.emoji_urls ?? {};
  const emojiUtils = req('486020').Ay;
  const getEmojiURL = emojiUtils.getEmojiURL;
  emojiUtils.getEmojiURL = (options) => emojiUrls[options.id] ?? getEmojiURL(options);
  const unicodeEmoji = req('690521').Ay;
  const getUnicodeURL = unicodeEmoji.getURL.bind(unicodeEmoji);
  unicodeEmoji.getURL = (name) => (name in emojiUrls ? emojiUrls[name] : getUnicodeURL(name));
  const props = data.props ?? {};
  const RepliedMessage = req('448368').A;
  const ExecutedCommand = req('267508').A;
  const { X4: getReplyAuthor } = req('763754');
  const referenced =
    apiMessage.referenced_message != null
      ? { state: 0, message: createMessage({ channel_id: channel.id, ...apiMessage.referenced_message }) }
      : apiMessage.message_reference != null
        ? { state: apiMessage.referenced_message === null ? 2 : 1 }
        : null;
  if (referenced?.message != null) {
    const user = users.get(referenced.message.author?.id);
    if (user != null) referenced.message.author = user;
  }
  // The chat's reply bar (730276 nF) without its popouts and click handlers.
  const Reply = () => {
    const repliedAuthor = getReplyAuthor(referenced.message);
    const baseAuthor = getReplyAuthor(message);
    const repliedContent = referenced.message != null ? rawContent(referenced.message) : null;
    return h(RepliedMessage, {
      repliedAuthor,
      baseMessage: message,
      channel,
      baseAuthor,
      referencedMessage: referenced,
      content: repliedContent != null && repliedContent !== '' ? repliedContent : null,
      compact: false,
      isReplyAuthorBlocked: false,
      isReplyAuthorIgnored: false,
      isReplySpineClickable: true,
      showReplySpine: true,
    });
  };
  const ChatMessage = () => {
    const author = getAuthor(message);
    const messageProps = { message, channel, compact: false };
    return h(
      'li',
      { id: `chat-messages-${channel.id}-${message.id}`, className: listItem.Nt, 'aria-setsize': -1 },
      h(BaseMessage, {
        'aria-setsize': -1,
        'aria-roledescription': 'Message',
        compact: false,
        className: [listItem.iU, listItem.HJ, message.hasFlag(64) ? listItem.M1 : null, listItem._A]
          .filter(Boolean)
          .join(' '),
        zalgo: true,
        childrenRepliedMessage: message.type === 19 && referenced != null ? h(Reply) : undefined,
        childrenExecutedCommand:
          message.interaction != null && message.interaction.displayName !== ''
            ? h(ExecutedCommand, { message, channel, compact: false })
            : undefined,
        // The chat's header (730276 nI) also gets the replied message, for the header's aria-describedby.
        childrenHeader: h(MessageHeader, {
          ...messageProps,
          author,
          guildId: channel.guild_id,
          repliedMessage: referenced ?? undefined,
        }),
        childrenAccessories: accessories({
          channelMessageProps: messageProps,
          hasSpoilerEmbeds: false,
          hasBailedAst: false,
          isInteracting: props.isInteracting ?? false,
          isAutomodBlockedMessage: false,
        }),
        childrenMessageContent: content(messageProps, rawContent(message)),
        hasReply: message.type === 19,
        'aria-labelledby': req('860227').fF(message),
        'aria-describedby': req('860227').ZD(message),
        author,
      }),
    );
  };
  return h('ol', { style: { listStyle: 'none', margin: 0, padding: 0 } }, h(ChatMessage));
};
