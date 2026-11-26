// The client's chat input configurations: every rich text area in the app is the same editor with one of these.

export const DraftType = {
  ChannelMessage: 0,
  ThreadSettings: 1,
  FirstThreadMessage: 2,
  ApplicationLauncherCommand: 3,
  Poll: 4,
  SlashCommand: 5,
  ForwardContextMessage: 6,
  InteractionModal: 7,
  ScheduledMessage: 8,
} as const;
export type DraftType = (typeof DraftType)[keyof typeof DraftType];

/** The formatting toolbar: a tooltip over selected text, a static bar, or none. */
export const ChatInputToolbarTypes = { TOOLTIP: 0, STATIC: 1, NONE: 2 } as const;
export type ChatInputToolbarType = (typeof ChatInputToolbarTypes)[keyof typeof ChatInputToolbarTypes];

/** DEFAULT is the chat bar; INLINE drops the bars above it; FLUSH also drops the background. */
export const ChatInputLayouts = { DEFAULT: 0, INLINE: 1, FLUSH: 2 } as const;
export type ChatInputLayout = (typeof ChatInputLayouts)[keyof typeof ChatInputLayouts];

export interface ChatInputType {
  analyticsName: string;
  attachments?: boolean;
  autocomplete?: {
    addReactionShortcut?: boolean;
    forceChatLayer?: boolean;
    reactions?: boolean;
    alwaysUseLayer?: boolean;
    small?: boolean;
  };
  commands?: { enabled: boolean };
  confetti?: { button: boolean };
  disableAutoFocus?: boolean;
  drafts: { type: DraftType; commandType?: DraftType; autoSave?: boolean };
  emojis?: { button?: boolean };
  expressionPicker?: { onlyEmojis?: boolean; emojiIntention?: string };
  gifs?: { button?: boolean; allowSending?: boolean };
  gifts?: { button?: boolean };
  hideAccessoryBar?: boolean;
  hideAttachmentArea?: boolean;
  layout?: ChatInputLayout;
  markdown?: {
    disableCodeBlocks?: boolean;
    disableBlockQuotes?: boolean;
    disableMentions?: boolean;
    disableLinks?: boolean;
    disableInlineCode?: boolean;
  };
  permissions: { requireSendMessages?: boolean; requireCreateTherads?: boolean };
  sedReplace?: boolean;
  showCharacterCount?: boolean;
  showSlowmodeIndicator?: boolean;
  showThreadPromptOnReply?: boolean;
  showTypingIndicator?: boolean;
  soundmoji?: { allowSending?: boolean };
  stickers?: { button?: boolean; allowSending?: boolean; autoSuggest?: boolean };
  submit?: {
    button?: boolean;
    ignorePreference?: boolean;
    disableEnterToSubmit?: boolean;
    clearOnSubmit?: boolean;
    useDisabledStylesOnSubmit?: boolean;
    allowEmptyMessage?: boolean;
  };
  toolbarType?: ChatInputToolbarType;
  uploadLongMessages?: boolean;
  upsellLongMessages?: { iconOnly: boolean };
  users?: { allowMentioning?: boolean };
  voiceMessages?: { button?: boolean };
}

// The web client on desktop (the client's `isMobile` flags are false here).
const IS_MOBILE = false;

const NORMAL: ChatInputType = {
  analyticsName: 'normal',
  attachments: true,
  autocomplete: { addReactionShortcut: true, forceChatLayer: true, reactions: true },
  commands: { enabled: true },
  confetti: { button: true },
  drafts: { type: DraftType.ChannelMessage, commandType: DraftType.SlashCommand, autoSave: true },
  emojis: { button: true },
  gifs: { button: true, allowSending: true },
  gifts: { button: true },
  permissions: { requireSendMessages: true },
  showThreadPromptOnReply: true,
  stickers: { button: true, allowSending: true, autoSuggest: true },
  soundmoji: { allowSending: true },
  voiceMessages: { button: !IS_MOBILE },
  users: { allowMentioning: true },
  submit: {
    button: true,
    ignorePreference: IS_MOBILE,
    disableEnterToSubmit: IS_MOBILE,
    clearOnSubmit: true,
    useDisabledStylesOnSubmit: true,
  },
  uploadLongMessages: true,
  upsellLongMessages: { iconOnly: false },
  showCharacterCount: true,
  sedReplace: true,
  showSlowmodeIndicator: true,
  showTypingIndicator: true,
};

export const ChatInputTypes = {
  NORMAL,
  OVERLAY: {
    analyticsName: 'overlay',
    attachments: true,
    autocomplete: { addReactionShortcut: true, forceChatLayer: true },
    confetti: { button: true },
    drafts: { type: DraftType.ChannelMessage, autoSave: true },
    emojis: { button: true },
    gifs: { button: true, allowSending: true },
    gifts: undefined,
    permissions: { requireSendMessages: true },
    showThreadPromptOnReply: true,
    stickers: { button: true, allowSending: true },
    users: { allowMentioning: true },
    submit: {
      button: true,
      ignorePreference: IS_MOBILE,
      disableEnterToSubmit: IS_MOBILE,
      clearOnSubmit: true,
      useDisabledStylesOnSubmit: true,
    },
    upsellLongMessages: { iconOnly: false },
    showCharacterCount: true,
    showSlowmodeIndicator: true,
    showTypingIndicator: true,
  },
  OVERLAY_INLINE_REPLY: {
    analyticsName: 'overlay_inline_reply',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: true },
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    submit: { useDisabledStylesOnSubmit: false, clearOnSubmit: true },
    toolbarType: ChatInputToolbarTypes.NONE,
    hideAccessoryBar: true,
    layout: ChatInputLayouts.INLINE,
  },
  SIDEBAR: {
    analyticsName: 'sidebar',
    attachments: true,
    autocomplete: { addReactionShortcut: true },
    commands: { enabled: true },
    confetti: { button: true },
    disableAutoFocus: true,
    drafts: { type: DraftType.ChannelMessage, commandType: DraftType.SlashCommand },
    emojis: { button: true },
    gifs: { allowSending: true },
    permissions: { requireSendMessages: true },
    stickers: { allowSending: true, autoSuggest: true },
    soundmoji: { allowSending: true },
    voiceMessages: { button: !IS_MOBILE },
    users: { allowMentioning: true },
    submit: {
      button: true,
      ignorePreference: IS_MOBILE,
      disableEnterToSubmit: IS_MOBILE,
      clearOnSubmit: true,
      useDisabledStylesOnSubmit: true,
    },
    uploadLongMessages: true,
    showCharacterCount: true,
    upsellLongMessages: { iconOnly: true },
    showSlowmodeIndicator: true,
    showTypingIndicator: true,
  },
  EDIT: {
    analyticsName: 'edit',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    soundmoji: { allowSending: true },
    users: { allowMentioning: true },
    expressionPicker: { onlyEmojis: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    showCharacterCount: true,
  },
  FORM: {
    analyticsName: 'forum',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    gifs: { allowSending: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true, allowEmptyMessage: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    showCharacterCount: true,
    showSlowmodeIndicator: true,
    showTypingIndicator: true,
  },
  VOICE_CHANNEL_STATUS: {
    analyticsName: 'voice_channel_status',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    expressionPicker: { onlyEmojis: true },
    permissions: { requireSendMessages: false },
    submit: { useDisabledStylesOnSubmit: true, allowEmptyMessage: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    markdown: { disableCodeBlocks: true, disableBlockQuotes: true, disableMentions: true, disableLinks: true },
    showCharacterCount: true,
    layout: ChatInputLayouts.INLINE,
  },
  THREAD_CREATION: {
    analyticsName: 'thread_creation',
    attachments: true,
    drafts: { type: DraftType.FirstThreadMessage },
    emojis: { button: true },
    gifs: { allowSending: true },
    stickers: { allowSending: true },
    soundmoji: { allowSending: true },
    users: { allowMentioning: true },
    permissions: { requireCreateTherads: true },
    submit: { useDisabledStylesOnSubmit: true, button: true },
    disableAutoFocus: true,
    showCharacterCount: true,
    hideAttachmentArea: true,
    upsellLongMessages: { iconOnly: true },
  },
  USER_PROFILE: {
    analyticsName: 'user_profile',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    permissions: { requireSendMessages: false },
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    submit: { useDisabledStylesOnSubmit: true, clearOnSubmit: true },
    toolbarType: ChatInputToolbarTypes.NONE,
    layout: ChatInputLayouts.INLINE,
  },
  USER_PROFILE_REPLY: {
    analyticsName: 'user_profile_reply',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    permissions: { requireSendMessages: false },
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    submit: { useDisabledStylesOnSubmit: true, clearOnSubmit: true },
    toolbarType: ChatInputToolbarTypes.NONE,
  },
  PROFILE_BIO_INPUT: {
    analyticsName: 'profile_bio_input',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    disableAutoFocus: true,
    showCharacterCount: true,
  },
  GENERIC_RICH_TEXTAREA: {
    analyticsName: 'generic_rich_textarea',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: false },
    submit: { disableEnterToSubmit: true },
  },
  CUSTOM_GIFT: {
    analyticsName: 'custom_gift_type',
    drafts: { type: DraftType.ChannelMessage },
    emojis: {},
    permissions: { requireSendMessages: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    disableAutoFocus: true,
    showCharacterCount: true,
  },
  RULES_INPUT: {
    analyticsName: 'rules_input',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: false },
    autocomplete: { alwaysUseLayer: true, small: true },
    showCharacterCount: false,
    disableAutoFocus: true,
    hideAccessoryBar: true,
  },
  CREATE_FORUM_POST: {
    analyticsName: 'create_forum_post',
    attachments: true,
    drafts: { type: DraftType.FirstThreadMessage },
    gifs: { allowSending: true },
    stickers: { allowSending: true },
    soundmoji: { allowSending: true },
    users: { allowMentioning: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    disableAutoFocus: true,
    hideAttachmentArea: true,
    uploadLongMessages: true,
    showSlowmodeIndicator: true,
    layout: ChatInputLayouts.FLUSH,
  },
  CREATE_GAME_INVITE_POST_DESCRIPTION: {
    analyticsName: 'create_game_invite_post_description',
    autocomplete: { alwaysUseLayer: true, small: true },
    drafts: { type: DraftType.FirstThreadMessage },
    users: { allowMentioning: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    disableAutoFocus: true,
    uploadLongMessages: true,
    showSlowmodeIndicator: true,
    showCharacterCount: true,
    layout: ChatInputLayouts.INLINE,
  },
  CREATE_ANNOUNCEMENT_POST: {
    ...NORMAL,
    analyticsName: 'create_announcement_post',
    stickers: { allowSending: false },
    gifts: {},
    commands: { enabled: false },
    submit: { disableEnterToSubmit: true },
    disableAutoFocus: true,
    permissions: { requireSendMessages: true },
  },
  CREATE_POLL: {
    analyticsName: 'create_poll',
    attachments: true,
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    gifs: { allowSending: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
  },
  FORUM_CHANNEL_GUIDELINES: {
    analyticsName: 'forum_channel_guidelines',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: false },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    showCharacterCount: true,
    toolbarType: ChatInputToolbarTypes.STATIC,
  },
  CHANNEL_TOPIC: {
    analyticsName: 'channel_topic',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: false },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    showCharacterCount: true,
    toolbarType: ChatInputToolbarTypes.STATIC,
    markdown: { disableCodeBlocks: true, disableBlockQuotes: true, disableInlineCode: true },
    expressionPicker: { onlyEmojis: true, emojiIntention: 'NO_CUSTOM_EMOJI' },
  },
  ATOMIC_REACTOR_REPLY_INPUT: {
    analyticsName: 'atomic_reator_reply_input',
    drafts: { type: DraftType.ChannelMessage },
    permissions: { requireSendMessages: true },
    users: { allowMentioning: true },
    submit: { useDisabledStylesOnSubmit: true, disableEnterToSubmit: true },
    disableAutoFocus: true,
    showCharacterCount: true,
    layout: ChatInputLayouts.INLINE,
  },
  FORWARD_MESSAGE_INPUT: {
    analyticsName: 'forward_message_input',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    soundmoji: { allowSending: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true },
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    disableAutoFocus: true,
    showCharacterCount: true,
    layout: ChatInputLayouts.INLINE,
    expressionPicker: { onlyEmojis: true },
  },
  SHARE_CUSTOM_CLIENT_THEME_INPUT: {
    analyticsName: 'share_custom_client_theme_input',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    soundmoji: { allowSending: true },
    permissions: { requireSendMessages: true },
    submit: { useDisabledStylesOnSubmit: true },
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    disableAutoFocus: true,
    showCharacterCount: true,
    layout: ChatInputLayouts.INLINE,
  },
  GUILD_ROOM: {
    analyticsName: 'guild_room',
    drafts: { type: DraftType.ChannelMessage },
    emojis: { button: true },
    permissions: { requireSendMessages: false },
    layout: ChatInputLayouts.INLINE,
    users: { allowMentioning: true },
    autocomplete: { alwaysUseLayer: true, small: true },
    submit: { useDisabledStylesOnSubmit: true, clearOnSubmit: true },
    toolbarType: ChatInputToolbarTypes.NONE,
    showCharacterCount: true,
  },
} satisfies Record<string, ChatInputType>;

export type ChatInputTypeName = keyof typeof ChatInputTypes;
