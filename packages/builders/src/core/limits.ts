// Discord's message limits, curated from the API docs (github.com/discord/discord-api-docs). Every value has
// an entry in `limitSources` naming the docs file and heading it comes from. Values the docs don't state, and
// that are inferred from how the API behaves, are marked `inferred: true` with a note.

export const MessageFlag = {
  SuppressEmbeds: 1 << 2,
  Ephemeral: 1 << 6,
  SuppressNotifications: 1 << 12,
  IsVoiceMessage: 1 << 13,
  IsComponentsV2: 1 << 15,
} as const;

export const limits = {
  message: {
    content: 2000,
    embeds: 10,
    /** Legacy (non-CV2) messages: top-level components, all action rows. */
    classicActionRows: 5,
    stickers: 3,
    nonce: 25,
    attachmentDescription: 1024,
    /** Bytes per request. */
    requestSize: 25 * 1024 * 1024,
    /** Bytes per file, without Nitro or boosts. */
    fileSize: 20 * 1024 * 1024,
  },
  flags: {
    webhook: MessageFlag.SuppressEmbeds | MessageFlag.SuppressNotifications | MessageFlag.IsComponentsV2,
    message:
      MessageFlag.SuppressEmbeds |
      MessageFlag.SuppressNotifications |
      MessageFlag.IsVoiceMessage |
      MessageFlag.IsComponentsV2,
    interaction:
      MessageFlag.SuppressEmbeds |
      MessageFlag.Ephemeral |
      MessageFlag.SuppressNotifications |
      MessageFlag.IsVoiceMessage |
      MessageFlag.IsComponentsV2,
  },
  embed: {
    title: 256,
    description: 4096,
    fields: 25,
    fieldName: 256,
    fieldValue: 1024,
    footerText: 2048,
    authorName: 256,
    /** title + description + field names and values + footer text + author name, across all embeds. */
    total: 6000,
    colorMax: 0xffffff,
  },
  components: {
    /** CV2 messages, counting nested components. */
    total: 40,
    customId: 100,
    /** `id`: a 32-bit integer. */
    idMax: 2 ** 31 - 1,
  },
  actionRow: {
    buttons: 5,
    selects: 1,
  },
  button: {
    label: 80,
    url: 512,
  },
  select: {
    options: 25,
    minOptions: 1,
    placeholder: 150,
    minValues: 0,
    maxValues: 25,
    optionLabel: 100,
    optionValue: 100,
    optionDescription: 100,
  },
  section: {
    minComponents: 1,
    maxComponents: 3,
  },
  textDisplay: {
    content: 4000,
    /** All text displays of a message together. */
    total: 4000,
  },
  thumbnail: {
    description: 1024,
  },
  mediaGallery: {
    minItems: 1,
    maxItems: 10,
    description: 1024,
  },
  separator: {
    spacing: [1, 2] as readonly number[],
  },
  container: {
    accentColorMax: 0xffffff,
    minComponents: 1,
  },
  webhook: {
    username: 80,
    threadName: 100,
    appliedTags: 5,
  },
  allowedMentions: {
    roles: 100,
    users: 100,
  },
  poll: {
    question: 300,
    answers: 10,
    answer: 55,
    /** Hours (32 days). */
    duration: 32 * 24,
  },
} as const;

export interface LimitSource {
  /** File in discord-api-docs, under `developers/`. */
  file: string;
  heading: string;
  /** Not stated by the docs; inferred from the API's behaviour or neighbouring rules. */
  inferred?: boolean;
  note?: string;
}

const MESSAGE = 'resources/message.mdx';
const WEBHOOK = 'resources/webhook.mdx';
const COMPONENTS = 'components/reference.mdx';
const CHANGELOG = 'change-log.mdx';

/** Where each value of `limits` comes from, keyed by its dotted path (`embed.title`). */
export const limitSources: Record<string, LimitSource> = {
  'message.content': { file: MESSAGE, heading: 'Create Message > JSON/Form Params (content)' },
  'message.embeds': { file: MESSAGE, heading: 'Create Message > JSON/Form Params (embeds)' },
  'message.classicActionRows': {
    file: COMPONENTS,
    heading: 'Legacy Message Component Behavior',
    note: 'Also change-log.mdx "Raised Component Limits": legacy messages still allow up to 5 action rows.',
  },
  'message.stickers': { file: MESSAGE, heading: 'Create Message > JSON/Form Params (sticker_ids)' },
  'message.nonce': { file: MESSAGE, heading: 'Create Message > JSON/Form Params (nonce)' },
  'message.attachmentDescription': { file: MESSAGE, heading: 'Attachment Request Structure (description)' },
  'message.requestSize': { file: MESSAGE, heading: 'Create Message > Limitations' },
  'message.fileSize': { file: 'reference.mdx', heading: 'Uploading Files' },
  'flags.webhook': { file: WEBHOOK, heading: 'Execute Webhook > JSON/Form Params (flags)' },
  'flags.message': { file: MESSAGE, heading: 'Create Message > JSON/Form Params (flags)' },
  'flags.interaction': {
    file: 'interactions/receiving-and-responding.mdx',
    heading: 'Interaction Callback Data Structure > Messages (flags)',
  },
  'embed.title': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.description': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.fields': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.fieldName': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.fieldValue': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.footerText': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.authorName': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.total': { file: MESSAGE, heading: 'Embed Limits' },
  'embed.colorMax': {
    file: COMPONENTS,
    heading: 'Container Structure (accent_color)',
    inferred: true,
    note: 'The embed docs only say "color code"; the RGB range is the one documented for containers.',
  },
  'components.total': {
    file: COMPONENTS,
    heading: 'Component Reference (introduction)',
    note: 'Also change-log.mdx "Raised Component Limits". Nested components count.',
  },
  'components.customId': { file: COMPONENTS, heading: 'Anatomy of a Component > Custom ID' },
  'components.idMax': {
    file: COMPONENTS,
    heading: 'Anatomy of a Component',
    inferred: true,
    note: 'Documented as a "32 bit integer"; the signed maximum is assumed.',
  },
  'actionRow.buttons': { file: COMPONENTS, heading: 'Action Row' },
  'actionRow.selects': { file: COMPONENTS, heading: 'Action Row' },
  'button.label': { file: COMPONENTS, heading: 'Button Structure (label)' },
  'button.url': { file: COMPONENTS, heading: 'Button Structure (url)' },
  'select.options': { file: COMPONENTS, heading: 'String Select Structure (options)' },
  'select.minOptions': {
    file: COMPONENTS,
    heading: 'String Select Structure (options)',
    inferred: true,
    note: 'The docs give only the maximum; the API rejects a string select without options.',
  },
  'select.placeholder': { file: COMPONENTS, heading: 'String Select Structure (placeholder)' },
  'select.minValues': { file: COMPONENTS, heading: 'String Select Structure (min_values)' },
  'select.maxValues': { file: COMPONENTS, heading: 'String Select Structure (max_values)' },
  'select.optionLabel': { file: COMPONENTS, heading: 'Select Option Structure' },
  'select.optionValue': { file: COMPONENTS, heading: 'Select Option Structure' },
  'select.optionDescription': { file: COMPONENTS, heading: 'Select Option Structure' },
  'section.minComponents': { file: COMPONENTS, heading: 'Section Structure (components)' },
  'section.maxComponents': { file: COMPONENTS, heading: 'Section Structure (components)' },
  'textDisplay.content': { file: COMPONENTS, heading: 'Text Display Structure (content)' },
  'textDisplay.total': { file: COMPONENTS, heading: 'Text Display' },
  'thumbnail.description': { file: COMPONENTS, heading: 'Thumbnail Structure (description)' },
  'mediaGallery.minItems': { file: COMPONENTS, heading: 'Media Gallery Structure (items)' },
  'mediaGallery.maxItems': { file: COMPONENTS, heading: 'Media Gallery Structure (items)' },
  'mediaGallery.description': { file: COMPONENTS, heading: 'Media Gallery Item Structure (description)' },
  'separator.spacing': { file: COMPONENTS, heading: 'Separator Structure (spacing)' },
  'container.accentColorMax': { file: COMPONENTS, heading: 'Container Structure (accent_color)' },
  'container.minComponents': {
    file: COMPONENTS,
    heading: 'Container Structure (components)',
    inferred: true,
    note: 'Not documented; the API rejects an empty container.',
  },
  'webhook.username': {
    file: WEBHOOK,
    heading: 'Create Webhook',
    inferred: true,
    note: 'Documented for webhook names (1-80, no "clyde"/"discord"); applied to the `username` override.',
  },
  'webhook.threadName': {
    file: 'resources/channel.mdx',
    heading: 'Start Thread in Forum or Media Channel (name)',
    inferred: true,
    note: '`thread_name` creates a forum/media thread, whose name is 1-100 characters.',
  },
  'webhook.appliedTags': {
    file: 'resources/channel.mdx',
    heading: 'Start Thread in Forum or Media Channel (applied_tags)',
  },
  'allowedMentions.roles': { file: MESSAGE, heading: 'Allowed Mentions Object' },
  'allowedMentions.users': { file: MESSAGE, heading: 'Allowed Mentions Object' },
  'poll.question': { file: 'resources/poll.mdx', heading: 'Poll Media Object' },
  'poll.answers': { file: 'resources/poll.mdx', heading: 'Poll Create Request Object Structure' },
  'poll.answer': { file: 'resources/poll.mdx', heading: 'Poll Media Object' },
  'poll.duration': { file: 'resources/poll.mdx', heading: 'Poll Create Request Object Structure' },
};

/** Rules that aren't a single number, with their sources. Used by the validators and listed in the README. */
export const ruleSources = {
  embedTrim: { file: MESSAGE, heading: 'Embed Limits', note: 'Leading and trailing whitespace is not counted.' },
  embedUrlSchemes: {
    file: MESSAGE,
    heading: 'Embed Image/Author/Footer Structure',
    note: 'image/thumbnail url and author/footer icon_url: http(s) and attachment://; author.url: http(s).',
  },
  embedUrl: {
    file: MESSAGE,
    heading: 'Embed Structure (url)',
    inferred: true,
    note: 'No scheme documented for embed.url; http(s) assumed.',
  },
  embedIgnoredFields: {
    file: WEBHOOK,
    heading: 'Execute Webhook (embeds)',
    note: 'type (always rich), provider, video, and height/width/proxy_url of images are ignored.',
  },
  timestamp: { file: 'reference.mdx', heading: 'ISO8601 Date/Time' },
  cv2ForbiddenFields: {
    file: MESSAGE,
    heading: 'Create Message > JSON/Form Params (footnote **)',
    note: 'IS_COMPONENTS_V2 forbids content, embeds, sticker_ids, poll (and shared_client_theme).',
  },
  cv2Files: {
    file: WEBHOOK,
    heading: 'Execute Webhook > JSON/Form Params (footnote ***)',
    note:
      'The webhook docs also list files[n] as forbidden with IS_COMPONENTS_V2, while components/reference.mdx ' +
      'says attachments must be exposed through components. Files referenced by File/Thumbnail/Media Gallery ' +
      'components are accepted (inferred from the API); unreferenced files are reported as a warning.',
  },
  cv2Attachments: { file: COMPONENTS, heading: 'Component Reference (introduction)' },
  componentsFlagRequired: {
    file: COMPONENTS,
    heading: 'Section / Text Display / Thumbnail / Media Gallery / File / Separator / Container',
    note: 'All of these need IS_COMPONENTS_V2.',
  },
  topLevelComponents: { file: COMPONENTS, heading: 'Component Types; each component\'s "top-level" note' },
  containerChildren: { file: COMPONENTS, heading: 'Container Child Components' },
  sectionChildren: { file: COMPONENTS, heading: 'Section Child Components / Section Accessory Components' },
  actionRowChildren: { file: COMPONENTS, heading: 'Action Row Child Components' },
  componentId: {
    file: COMPONENTS,
    heading: 'Anatomy of a Component',
    note:
      'id is optional, unique within the message, generated sequentially when left empty, skipping ids in ' +
      'use; 0 counts as empty.',
  },
  customIdUnique: { file: COMPONENTS, heading: 'Anatomy of a Component > Custom ID' },
  buttonStyles: { file: COMPONENTS, heading: 'Button Structure (style rules) / Button Styles' },
  buttonLabelOrEmoji: {
    file: COMPONENTS,
    heading: 'Button Structure',
    inferred: true,
    note: 'Not documented; the API rejects non-premium buttons with neither label nor emoji.',
  },
  buttonUrlSchemes: {
    file: COMPONENTS,
    heading: 'Button Structure (url)',
    inferred: true,
    note: 'Only the length is documented; http(s) and discord:// are accepted.',
  },
  selectValues: {
    file: COMPONENTS,
    heading: 'String/User/Role/Mentionable/Channel Select Structure (min_values, max_values, default_values)',
    note: 'default_values must fit in [min_values, max_values]. min_values <= max_values is inferred.',
  },
  selectDefaultValueTypes: { file: COMPONENTS, heading: 'Select Default Value Structure' },
  stringSelectDefaults: {
    file: COMPONENTS,
    heading: 'Select Option Structure (default)',
    inferred: true,
    note: 'More default options than max_values, or max_values above the option count, is rejected.',
  },
  emptyComponents: {
    file: COMPONENTS,
    heading: 'Action Row / Text Display',
    inferred: true,
    note: 'Empty action rows and empty text displays are rejected.',
  },
  unfurledMediaUrl: { file: COMPONENTS, heading: 'Unfurled Media Item Structure (url)' },
  fileAttachmentOnly: { file: COMPONENTS, heading: 'File Structure (file)' },
  thumbnailImagesOnly: { file: COMPONENTS, heading: 'Thumbnail', note: 'Videos are not supported.' },
  webhookComponents: {
    file: WEBHOOK,
    heading: 'Execute Webhook > Query String Params (with_components) and footnote *',
    note:
      'Components are ignored without ?with_components=true. Non-application-owned webhooks can only send ' +
      'non-interactive components (link buttons, layout and content components).',
  },
  webhookRequired: {
    file: WEBHOOK,
    heading: 'Execute Webhook',
    note: 'At least one of content, embeds, components, files or poll.',
  },
  webhookThread: {
    file: WEBHOOK,
    heading: 'Execute Webhook',
    note: 'Forum/media channels need thread_id or thread_name. Using both is rejected (inferred).',
  },
  webhookUsername: {
    file: WEBHOOK,
    heading: 'Create Webhook',
    inferred: true,
    note: 'The name rules (no "clyde"/"discord") are applied to the username override.',
  },
  pollExclusive: {
    file: 'resources/poll.mdx',
    heading: 'Poll Create Request Object',
    inferred: true,
    note:
      "Observed, not documented: a message with a poll can't also have content, embeds, components, files or " +
      'stickers (Execute Webhook and Create Message list poll as one of content/embeds/files/poll). Polls are ' +
      'listed as an Execute Webhook param; whether every webhook can send one is not checked here.',
  },
  allowedMentionsExclusive: {
    file: MESSAGE,
    heading: 'Allowed Mentions Examples',
    note: 'parse "users"/"roles" can\'t be combined with a users/roles list.',
  },
  rateLimits: { file: 'topics/rate-limits.mdx', heading: 'Exceeding A Rate Limit' },
  errorFormat: { file: 'reference.mdx', heading: 'Error Messages' },
  webhookUrl: {
    file: WEBHOOK,
    heading: 'Execute Webhook (route)',
    inferred: true,
    note: 'Hosts discord.com, discordapp.com, canary./ptb. subdomains; optional /v{n} after /api.',
  },
  changelogLimits: { file: CHANGELOG, heading: 'Raised Component Limits' },
  characterCounting: {
    file: MESSAGE,
    heading: 'Embed Limits',
    inferred: true,
    note: 'Lengths are counted in Unicode code points (an emoji is one character), as Discord does.',
  },
} satisfies Record<string, LimitSource>;
