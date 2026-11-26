/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGuildIconURL } from '@discord-mana/components';
import type { APIResolvedChannel } from '@discord-mana/messages';
import {
  EMOJI_NAME_AND_DIVERSITY_RE,
  EMOJI_NAME_RE,
  convertNameToSurrogate,
  findInlineEmojisFromSurrogates,
} from './emoji/emojiUtils';
import { containsDiscordLinks, isSuspiciousURL, sanitizeLinkText, validateLinkTarget } from './links';
import {
  type ASTNode,
  type Capture,
  type Parser,
  type Rule,
  type Rules,
  anyScopeRegex,
  defaultRules,
  inlineRegex,
  parseInline,
  parserFor,
  unescapeUrl,
} from './simpleMarkdown';
import {
  CHANNEL_TYPES,
  type Lookup,
  type MarkdownState,
  getLookup,
  getUserDisplayName,
  isMentionableChannelType,
  isPrivateChannel,
} from './state';
import { TIMESTAMP_RE, parseTimestamp } from './timestamp';

// The client's markdown rules (parse side): simple-markdown's defaults with Discord's patches and its own rules
// for mentions, emoji, spoilers, timestamps, subtext, lists, headings and links.

export type MarkdownRule = Partial<Rule> & { [key: string]: any };
export type MarkdownRules = Record<string, MarkdownRule>;

/** Merges rule maps; a rule in a later map is merged into the earlier one of the same name. */
export const mergeRules = (maps: MarkdownRules[]): MarkdownRules => {
  const result: MarkdownRules = {};
  for (const map of maps)
    for (const name in map) result[name] = name in result ? { ...result[name], ...map[name] } : { ...map[name] };
  return result;
};

const omit = (rules: MarkdownRules, names: string[]) => {
  const result: MarkdownRules = {};
  for (const name in rules) if (!names.includes(name)) result[name] = rules[name];
  return result;
};

const pick = (rules: MarkdownRules, names: string[]) => {
  const result: MarkdownRules = {};
  for (const name of names) if (name in rules) result[name] = rules[name];
  return result;
};

const lookupOf = (state: MarkdownState) => getLookup(state);

const SNOWFLAKE_RE = /^\d{17,19}$/;
const SPOILER_RE = /^\|\|([\s\S]+?)\|\|/;
const STATIC_ROUTE_RE = /^<id:(home|browse|customize|guide|linked-roles)(?::(\d+))?>/;
const SOUNDBOARD_RE = /^<sound:(\d+):(\d+)>/;
const GAME_MENTION_RE = /^<@\$(\d+)>/;
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1B\[(\d+(?:[:;]\d+)*)m/g;

/** simple-markdown's text rule, stopping before numbered list markers too. */
export const textRule: MarkdownRule = {
  ...defaultRules.text,
  match: anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\xC0-\uFFFF]|\n\n| {2,}\n|\w+:\S|[0-9]+\.|$)/),
};

const TEXT_ORDER = textRule.order!;

/** The node types masked link text may contain. */
const NODE = {
  TEXT: 'text',
  STRIKETHROUGH: 's',
  UNDERLINE: 'u',
  STRONG: 'strong',
  ITALICS: 'em',
  EMOJI: 'emoji',
  CUSTOM_EMOJI: 'customEmoji',
  LINE_BREAK: 'br',
  SPOILER: 'spoiler',
  BLOCK_QUOTE: 'blockQuote',
  INLINE_CODE: 'inlineCode',
  TIMESTAMP: 'timestamp',
  LIST: 'list',
  HEADING: 'heading',
  SUBTEXT: 'subtext',
} as const;

const LINK_INLINE_TYPES = [
  NODE.TEXT,
  NODE.UNDERLINE,
  NODE.STRONG,
  NODE.ITALICS,
  NODE.STRIKETHROUGH,
  NODE.INLINE_CODE,
  NODE.SPOILER,
  NODE.LINE_BREAK,
  NODE.TIMESTAMP,
];
const LINK_INLINE_TYPES_WITH_EMOJI = [...LINK_INLINE_TYPES, NODE.EMOJI, NODE.CUSTOM_EMOJI];
const LINK_BLOCK_TYPES = [NODE.LIST, NODE.HEADING, NODE.BLOCK_QUOTE, NODE.SUBTEXT];
const LINK_TITLE_TYPES = [
  NODE.TEXT,
  NODE.UNDERLINE,
  NODE.STRONG,
  NODE.ITALICS,
  NODE.STRIKETHROUGH,
  NODE.INLINE_CODE,
  NODE.SPOILER,
  NODE.LINE_BREAK,
  NODE.TIMESTAMP,
  NODE.EMOJI,
  NODE.CUSTOM_EMOJI,
  NODE.LIST,
  NODE.HEADING,
  NODE.BLOCK_QUOTE,
  NODE.SUBTEXT,
];

const onlyContains = (ast: any, types: string[], inlineCodeTypes: string[] = []): ASTNode[] | null => {
  const nodes = Array.isArray(ast) ? ast : [ast];
  for (const node of nodes) {
    if (node === undefined || !types.includes(node.type)) return null;
    if (
      node.type === NODE.INLINE_CODE &&
      onlyContains(node.validationChildContent, [...types, ...inlineCodeTypes]) == null
    )
      return null;
    if (Array.isArray(node.content) && onlyContains(node.content, types) == null) return null;
  }
  return nodes;
};

const plainText = (nodes: ASTNode[]): string => {
  let text = '';
  for (const node of nodes) {
    switch (node.type) {
      case NODE.TEXT:
      case NODE.INLINE_CODE:
        text += node.content;
        break;
      case NODE.CUSTOM_EMOJI:
        text += node.name;
        break;
      case NODE.EMOJI:
        text += node.surrogate;
        break;
      case NODE.LINE_BREAK:
        text += '\n';
        break;
      case NODE.STRONG:
      case NODE.ITALICS:
      case NODE.UNDERLINE:
      case NODE.STRIKETHROUGH:
      case NODE.SPOILER:
        text += plainText(node.content);
        break;
      case NODE.TIMESTAMP:
        text += '<timestamp>';
        break;
      case NODE.BLOCK_QUOTE:
      case NODE.LIST:
      case NODE.HEADING:
      case NODE.SUBTEXT:
        text += `<${node.type}Content>`;
        break;
    }
  }
  return text;
};

/** Masked links (`[text](url "title")`), with the client's checks against misleading text and targets. */
export const linkRule: MarkdownRule = {
  ...defaultRules.link,
  match: (source: string, state: MarkdownState, prevCapture: string) => {
    if (!state.allowLinks || source.indexOf('](') === -1) return null;
    // Bail out of pathological bracket nesting before running the regex.
    let brackets = 0;
    let parens = 0;
    let nested = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (brackets >= 2) {
        if (++nested > 100) return null;
      } else nested = 0;
      if (char === ')') {
        parens = 0;
        continue;
      }
      if (char === '[') {
        if (++brackets > 10) return null;
      } else if (char === ']') {
        if (brackets > 0) brackets--;
      } else if (char !== '(') continue;
      if (++parens > 200) return null;
    }
    return defaultRules.link.match(source, state, prevCapture);
  },
  parse: (capture: Capture, parse: Parser, state: MarkdownState) => {
    const [whole, text, target, title] = capture;
    const asText = () => ({ type: NODE.TEXT, content: whole });
    if (state.maskedLinkValidation != null) {
      state.maskedLinkValidation.foundNestedMaskedLink = true;
      return asText();
    }
    if (isSuspiciousURL(target)) return asText();
    const sanitizedTarget = sanitizeLinkText(target);
    const sanitizedText = sanitizeLinkText(text);
    const sanitizedTitle = sanitizeLinkText(title ?? '');
    const targetText = sanitizedTarget.whitespaceSanitized;
    const linkText = sanitizedText.fullySanitized;
    const titleText = sanitizedTitle.fullySanitized;
    if (targetText.trim().length === 0 || linkText.trim().length === 0) return asText();
    const validated = validateLinkTarget(unescapeUrl(target));
    if (validated == null || containsDiscordLinks(title)) return asText();
    const innerState = { ...state, allowEscape: false, parseInlineCodeChildContent: true };
    const validation = { foundNestedMaskedLink: false };
    const validationState = { ...innerState, maskedLinkValidation: validation };
    const inlineTypes = state.allowEmojiLinks ? LINK_INLINE_TYPES_WITH_EMOJI : LINK_INLINE_TYPES;
    const textTypes = [...inlineTypes, ...LINK_BLOCK_TYPES];
    const parsedText = parse(linkText, validationState);
    if (validation.foundNestedMaskedLink) return asText();
    const textNodes = onlyContains(parsedText, textTypes, [NODE.EMOJI]);
    const parsedTitle = parse(titleText, validationState);
    if (validation.foundNestedMaskedLink) return asText();
    const titleNodes = onlyContains(parsedTitle, LINK_TITLE_TYPES);
    if (textNodes == null || titleNodes == null) return asText();
    const shown = plainText(textNodes);
    if (shown.trim().length === 0 || containsDiscordLinks(shown)) return asText();
    if (shown !== linkText) {
      if (containsDiscordLinks(linkText)) return asText();
      const reparsed = parse(shown, validationState);
      if (validation.foundNestedMaskedLink || onlyContains(reparsed, [...textTypes, NODE.EMOJI]) == null)
        return asText();
    }
    const content = parserFor(pick(parse.rules as MarkdownRules, inlineTypes) as Rules)(
      sanitizedText.whitespaceSanitized,
      innerState,
    );
    return { content, target: validated.target, title: sanitizedTitle.whitespaceSanitized };
  },
};

const autolinkParse = (capture: Capture) => {
  const validated = validateLinkTarget(capture[1]);
  if (validated == null) return { type: 'text', content: capture[1] };
  return {
    type: 'link',
    content: [{ type: 'text', content: validated.displayTarget }],
    target: validated.target,
    title: undefined,
  };
};

const linkNode = (url: string) => ({
  type: 'link',
  content: [{ type: 'text', content: url }],
  target: url,
  title: undefined,
});
const textNode = (content: string) => ({ type: 'text', content });

// Channel mentions and channel/message links.

interface ChannelInfo {
  type: number;
  id: string;
  guildId: string | null | undefined;
  name: string;
  isDm: boolean;
  isForumPost: boolean;
  isMentionable: boolean;
  canViewChannel: boolean;
  roleSubscriptionGated: boolean;
  iconType: string;
  parentId?: string | null;
}

const guildNode = (guild: { id: string; name: string; icon?: string | null }) => ({
  type: 'guild',
  guildId: guild.id,
  content: truncate(guild.name, 32),
  icon: getGuildIconURL({ id: guild.id, icon: guild.icon, size: 40 }) ?? undefined,
});

const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

/** Cuts text to a length with an ellipsis (whole code points when it has surrogate pairs). */
const truncate = (text: string, length: number, ellipsis = '\u2026') => {
  if (text.length <= length) return text;
  const cut = SURROGATE_PAIR_RE.test(text)
    ? [...text].slice(0, length - ellipsis.length).join('')
    : text.substring(0, length - ellipsis.length);
  return `${cut.replace(/[\s.]+$/, '')}${ellipsis}`;
};

const channelNode = (channel: { name: string; type: number; iconType?: string }, style?: 'italics'): ASTNode => {
  const name = textNode(truncate(channel.name, 32));
  return {
    type: 'channel',
    content: [style === 'italics' ? { type: 'em', content: [name] } : name],
    channelType: channel.type,
    iconType: channel.iconType,
  };
};

const messageNode = (isForumPost: boolean): ASTNode => ({
  type: 'channel',
  content: [textNode('')],
  iconType: isForumPost ? 'post' : 'message',
});

const getChannelInfo = (lookup: Lookup, id: string, mentionChannels?: MarkdownState['mentionChannels'] | null) => {
  const channel = lookup.channel(id);
  const iconType = lookup.iconType(channel) ?? 'text';
  if (mentionChannels != null) {
    const mentioned = mentionChannels.find((c) => c.id === id);
    if (mentioned != null)
      return {
        type: mentioned.type,
        id: mentioned.id,
        guildId: mentioned.guild_id,
        name: mentioned.name,
        isDm: channel != null && isPrivateChannel(channel),
        isForumPost: channel != null && lookup.isForumPost(channel),
        isMentionable: true,
        canViewChannel: true,
        roleSubscriptionGated: false,
        iconType,
        parentId: channel?.parent_id,
      } satisfies ChannelInfo;
  }
  return channel != null
    ? ({
        type: channel.type,
        id: channel.id,
        guildId: channel.guild_id,
        name: lookup.channelName(channel),
        isDm: isPrivateChannel(channel),
        isForumPost: lookup.isForumPost(channel),
        isMentionable: isMentionableChannelType(channel.type),
        canViewChannel: isPrivateChannel(channel) || channel.can_view !== false,
        roleSubscriptionGated: false,
        iconType,
        parentId: channel.parent_id,
      } satisfies ChannelInfo)
    : null;
};

const unknownChannelMention = (
  lookup: Lookup,
  guildId: string | null,
  channelId: string,
  messageId: string | null | undefined,
  currentGuildId: string | null | undefined,
  originalLink?: string,
) => {
  const guild = lookup.guild(guildId);
  const sameGuild = guild?.id === currentGuildId;
  return {
    type: 'channelMention',
    guildId,
    channelId,
    messageId,
    originalLink,
    inContent: guild == null || sameGuild ? null : [guildNode(guild)],
    content: [
      channelNode(
        { name: lookup.strings.UNKNOWN.toLowerCase(), type: CHANNEL_TYPES.UNKNOWN, iconType: 'text' },
        'italics',
      ),
    ],
  };
};

const channelMention = (
  lookup: Lookup,
  info: ChannelInfo,
  messageId: string | null | undefined,
  currentGuildId: string | null | undefined,
  originalLink?: string,
): ASTNode => {
  if (!info.canViewChannel) {
    return {
      type: 'channelMention',
      guildId: info.guildId,
      channelId: info.id,
      messageId,
      inContent: null,
      content: [
        {
          type: 'channel',
          content: [textNode(info.roleSubscriptionGated ? info.name : lookup.strings.NO_ACCESS)],
          channelType: info.roleSubscriptionGated ? info.type : CHANNEL_TYPES.UNKNOWN,
          iconType: 'locked',
        },
      ],
    };
  }
  if (!info.isMentionable) return textNode(`#${info.name}`);
  const base = { type: 'channelMention', channelId: info.id, guildId: info.guildId, messageId, originalLink };
  const guild = lookup.guild(info.guildId);
  if (guild == null) {
    if (info.isDm) return { ...base, guildId: '@me', inContent: [channelNode(info)], content: [messageNode(false)] };
    return originalLink != null ? linkNode(originalLink) : textNode(`#${lookup.strings.UNKNOWN_CHANNEL}`);
  }
  const sameGuild = info.guildId === currentGuildId;
  const isMessage = messageId != null;
  const guildPart = guildNode(guild);
  const channelPart = channelNode(info);
  const messagePart = messageNode(info.isForumPost);
  let parts: { inContent: ASTNode[] | null; content: ASTNode[] } | undefined;
  if (sameGuild && isMessage) {
    const parent = info.isForumPost ? lookup.channel(info.parentId) : null;
    parts =
      parent != null
        ? {
            inContent: [
              channelNode({
                name: lookup.channelName(parent),
                type: parent.type,
                iconType: lookup.iconType(parent) ?? 'forum',
              }),
            ],
            content: [channelPart],
          }
        : { inContent: [channelPart], content: [messagePart] };
  } else if (sameGuild && !isMessage) parts = { inContent: null, content: [channelPart] };
  else if (!sameGuild && isMessage)
    parts = { inContent: [guildPart], content: [info.isForumPost ? channelPart : messagePart] };
  else parts = { inContent: [guildPart], content: [channelPart] };
  return { ...base, ...parts };
};

const DISCORD_HOSTS = '(?:(?:canary\\.|ptb\\.)?discord(?:app)?.com|staging\\.discord\\.co)';
const STATIC_CHANNEL_ROUTES = [
  'conjuring',
  'conjure',
  'role-subscriptions',
  'server-monetization-onboarding',
  'game-shop',
  'shop',
  'member-applications',
  '@home',
  'channel-browser',
  'onboarding',
  'customize-community',
  'member-safety',
  'boosts',
  'game-servers',
  'report-to-mod',
  'official-messages',
  'guild-space',
];
void STATIC_CHANNEL_ROUTES;
const CHANNEL_URL_BASE = `^https://${DISCORD_HOSTS}/channels/(\\d+|@me)(?:/(\\d+|[a-zA-Z-]+))?(?:/(\\d+|[a-zA-Z-]+))?`;
const CHANNEL_URL_RE = new RegExp(`${CHANNEL_URL_BASE}(?:\\?([\\w%=&+-]+))?`);
const THREAD_MESSAGE_URL_RE = new RegExp(
  `^https://${DISCORD_HOSTS}/channels/(\\d+)(?:/)(\\d+)(?:/threads/)(\\d+)(?:/)(\\d+)`,
);

const conversationIdOf = (query: string | undefined) => {
  if (query == null) return undefined;
  const id = new URLSearchParams(query).get('conversation_id');
  return id != null && SNOWFLAKE_RE.test(id) ? id : undefined;
};

const channelMentionRule: MarkdownRule = {
  order: TEXT_ORDER,
  requiredFirstCharacters: ['<'],
  match: (source: string) => /^<#(\d+)>/.exec(source),
  parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
    const id = capture[1];
    if (state.returnMentionIds) return { type: 'channelMention', id };
    const lookup = lookupOf(state);
    const current = lookup.guildIdOf(state.channelId);
    const info = getChannelInfo(lookup, id, state.mentionChannels);
    return info == null
      ? unknownChannelMention(lookup, null, id, null, current)
      : channelMention(lookup, info, null, current);
  },
};

const channelOrMessageUrlRule: MarkdownRule = {
  order: defaultRules.url.order - 0.5,
  requiredFirstCharacters: ['h'],
  match: (source: string) => {
    const match = CHANNEL_URL_RE.exec(source);
    return match != null && ((match[2] != null && /\D/.test(match[2])) || (match[3] != null && /\D/.test(match[3])))
      ? null
      : match;
  },
  parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
    const [url, guildId, channelId, messageId, query] = capture;
    const conversationId = conversationIdOf(query);
    if (channelId == null) return linkNode(url);
    const lookup = lookupOf(state);
    const current = lookup.guildIdOf(state.channelId);
    const info = getChannelInfo(lookup, channelId, null);
    const node =
      info == null
        ? unknownChannelMention(lookup, guildId, channelId, messageId, current, url)
        : channelMention(lookup, info, messageId, current, url);
    return node.type === 'channelMention' ? { ...node, conversationId } : node;
  },
};

const mediaPostLinkRule: MarkdownRule = {
  order: defaultRules.url.order - 0.5,
  requiredFirstCharacters: ['h'],
  match: (source: string) => THREAD_MESSAGE_URL_RE.exec(source),
  parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
    const [url, guildId, parentId, threadId, messageId] = capture;
    if (parentId == null || threadId == null) return linkNode(url);
    const lookup = lookupOf(state);
    const current = lookup.guildIdOf(state.channelId);
    const thread = getChannelInfo(lookup, threadId, null);
    if (thread != null) return channelMention(lookup, thread, messageId, current, url);
    const parent = getChannelInfo(lookup, parentId, null);
    return parent != null
      ? channelMention(lookup, parent, messageId, current, url)
      : unknownChannelMention(lookup, guildId, parentId, messageId, current, url);
  },
};

const ATTACHMENT_LINK_RE =
  /^https:\/\/(?:[A-Za-z0-9-]+\.)*(?:(?:media|images)(?:-[A-Za-z0-9]+)?\.discordapp\.net|(?:cdn(?:-[A-Za-z0-9]+)?\.discordapp\.com))\/(?:attachments|ephemeral-attachments)\/\d+\/\d+\/([A-Za-z0-9._-]*[A-Za-z0-9_-])(?:[?][a-zA-Z0-9?&=_-]*)?/;

const attachmentLinkRule: MarkdownRule = {
  order: defaultRules.url.order - 0.5,
  requiredFirstCharacters: ['h'],
  match: (source: string) => ATTACHMENT_LINK_RE.exec(source),
  parse: (capture: Capture) => ({
    type: 'attachmentLink',
    content: [{ type: 'text', content: capture[1] }],
    attachmentUrl: capture[0],
    attachmentName: capture[1],
  }),
};

// Headings, subtext and lists only start at the beginning of a line.

const LINE_START_RE = /\n$/;

const headingRule: MarkdownRule = {
  ...defaultRules.heading,
  requiredFirstCharacters: [' ', '#'],
  match: (source: string, state: MarkdownState, prevCapture: string) =>
    state.allowHeading && (prevCapture == null || prevCapture === '' || prevCapture.match(LINE_START_RE) != null)
      ? anyScopeRegex(/^ *(#{1,3})(?:\s+)((?!\s*#{1,3}\s)[^\n]+?)#*\s*(?:\n|$)/)(source, state, prevCapture)
      : null,
};

const SUBTEXT_RE = /^ *-# +((?!-#)[^\n]+)(?:\n|$)/;

const subtextRule: MarkdownRule = {
  order: defaultRules.heading.order,
  requiredFirstCharacters: ['-'],
  match: (source: string, state: MarkdownState, prevCapture: string) =>
    state.allowSubtext === false
      ? null
      : prevCapture == null || prevCapture === '' || prevCapture.match(LINE_START_RE) != null
        ? anyScopeRegex(SUBTEXT_RE)(source, state, prevCapture)
        : null,
  parse: (capture: Capture, parse: Parser, state: MarkdownState) => ({
    content: parseInline(parse, capture[1].trim(), { ...state, allowSubtext: false }),
  }),
};

const LIST_BLOCK_END_RE = /\n{2,}$/;
const LIST_LOOKBEHIND_RE = /(?:^|\n)( *)$/;
const LIST_BULLET = '(?:[*-]|\\d+\\.)';
const LIST_ITEM_PREFIX = '(%INDENT_CAPTURE_PATTERN%)(' + LIST_BULLET + ') +';
const LIST_ITEM_PREFIX_RE = new RegExp('^' + LIST_ITEM_PREFIX.replace('%INDENT_CAPTURE_PATTERN%', ' *'));
const LIST_ITEM = LIST_ITEM_PREFIX + '[^\\n]*(?:\\n(?!%INDENT_CAPTURE_PATTERN%' + LIST_BULLET + ' )[^\\n]*)*(\n|$)';
const LIST_ITEM_END_RE = / *\n$/;
const LIST = '^( *)(' + LIST_BULLET + ') [\\s\\S]+?(?:\\n(?! )(?!\\1' + LIST_BULLET + ' )|$)';
const LIST_RE = new RegExp(LIST);
const LIST_AFTER_NEWLINE_RE = new RegExp('^\\n' + LIST.slice(1));
const LEADING_NEWLINE_RE = /^\n/;
const TRAILING_NEWLINE_RE = /\n *$/;
const WHITESPACE_ONLY_RE = /^[ \t\v\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+$/;

const listRule: MarkdownRule = {
  ...defaultRules.list,
  requiredFirstCharacters: '\n *-0123456789'.split(''),
  match: (source: string, state: MarkdownState) => {
    if (!state.allowList || state._listLevel >= 11) return null;
    if (source.charCodeAt(0) === 10) {
      const prev = state.prevCapture == null ? '' : state.prevCapture[0];
      return prev === '' || TRAILING_NEWLINE_RE.test(prev) ? null : LIST_AFTER_NEWLINE_RE.exec(source);
    }
    const prev = state.prevCapture == null ? '' : state.prevCapture[0];
    const lineStart = LIST_LOOKBEHIND_RE.exec(prev);
    return lineStart == null || WHITESPACE_ONLY_RE.test(lineStart[0]) ? null : LIST_RE.exec(source);
  },
  parse: (capture: Capture, parse: Parser, state: MarkdownState) => {
    const bullet = capture[2];
    const ordered = bullet.length > 1;
    const start = ordered ? Math.min(1e9, Math.max(1, +bullet)) : undefined;
    const consumedLeadingNewline = LEADING_NEWLINE_RE.test(capture[0]);
    const source = capture[0].replace(LEADING_NEWLINE_RE, '').replace(LIST_BLOCK_END_RE, '\n');
    const prefix = LIST_ITEM_PREFIX_RE.exec(source);
    const prefixLength = prefix != null ? prefix[0].length : 0;
    const indent = prefix != null ? prefix[1].length : 0;
    const indentPattern = ` {${indent},${indent + 1}}`;
    const itemRe = new RegExp(LIST_ITEM.replaceAll('%INDENT_CAPTURE_PATTERN%', indentPattern), 'gm');
    const spaceRe = new RegExp('^ {1,' + prefixLength + '}', 'gm');
    const items = source.match(itemRe);
    if (items == null) throw new Error('markup list items can not be parsed.');
    let lastItemWasAParagraph = false;
    return {
      ordered,
      start,
      items: items.map((item, i) => {
        const content = item.replace(LIST_ITEM_PREFIX_RE, '').replace(spaceRe, '');
        const isLastItem = i === items.length - 1;
        const isParagraph = content.indexOf('\n\n') !== -1 || (isLastItem && lastItemWasAParagraph);
        lastItemWasAParagraph = isParagraph;
        const oldInline = state.inline;
        const oldList = state._list;
        const oldLevel = state._listLevel;
        state._list = true;
        state._listLevel = (oldLevel ?? 0) + 1;
        let adjusted: string;
        if (isParagraph) {
          state.inline = false;
          adjusted = content.replace(LIST_ITEM_END_RE, '\n\n');
        } else {
          state.inline = true;
          adjusted = content.replace(LIST_ITEM_END_RE, '');
        }
        const result = parse(adjusted, { ...state, allowHeading: false }).map((node) => {
          if (node.type === 'text' && node.content != null) node.content = node.content.replace(/\n+\s*$/, '');
          return node;
        });
        state.inline = oldInline;
        state._list = oldList;
        state._listLevel = oldLevel;
        return result;
      }),
      consumedLeadingNewline,
    };
  },
};

// Block quotes: `> ` quotes a line, `>>> ` everything after it.
const BLOCK_QUOTE_RE = /^( *>>> +([\s\S]*))|^( *>(?!>>) +[^\n]*(\n *>(?!>>) +[^\n]*)*\n?)/;
const BLOCK_QUOTE_START_RE = /^$|\n *$/;
const MULTILINE_QUOTE_RE = /^ *>>> ?/;
const QUOTE_LINE_RE = /^ *> ?/gm;
const URL_RE = /^((?:https?|steam):\/\/[^\s<]+[^<.,:;"'\]\s])/;

const userMentionParse = (
  { fullMatch, id, everyoneOrHere }: { fullMatch: string; id?: string; everyoneOrHere?: string },
  state: MarkdownState,
) => {
  const lookup = lookupOf(state);
  const user = lookup.user(id);
  const channel = lookup.channel(state.channelId);
  let name: string | undefined;
  let userId: string | undefined;
  if (user != null) {
    userId = user.id;
    name = user.username !== '' ? user.username : '???';
    if (channel != null) name = getUserDisplayName(user, lookup.member(user.id)?.nick);
  }
  const isSnowflake = id != null && SNOWFLAKE_RE.test(id.trim());
  const fallback = isSnowflake && state.unknownUserMentionPlaceholder ? `@${lookup.strings.UNKNOWN_USER}` : fullMatch;
  return {
    type: 'mention',
    userId,
    channelId: state.channelId,
    viewingChannelId: state.viewingChannelId,
    guildId: channel?.guild_id ?? undefined,
    parsedUserId: isSnowflake ? id : null,
    roleName: everyoneOrHere,
    content: [{ type: 'text', content: name != null ? `@${name}` : fallback }],
  };
};

const isDefaultRoleColor = (role: {
  color: number;
  colors?: { primary_color: number; secondary_color?: number | null; tertiary_color?: number | null } | null;
}) =>
  role.color === 0 ||
  (role.colors != null &&
    role.colors.primary_color === 0 &&
    role.colors.secondary_color == null &&
    role.colors.tertiary_color == null);

export const hasEnhancedRoleColors = (lookup: Lookup, guildId: string | null | undefined) =>
  lookup.guild(guildId)?.features?.includes('ENHANCED_ROLE_COLORS') === true;

const intToHex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** Discord's markdown rules, before the client adds its React output (`RULES` in the client). */
const baseRules: MarkdownRules = {
  newline: defaultRules.newline,
  paragraph: defaultRules.paragraph,
  escape: {
    ...defaultRules.escape,
    match: (source: string, state: MarkdownState, prevCapture: string) =>
      state.allowEscape === false ? null : defaultRules.escape.match(source, state, prevCapture),
  },
  blockQuote: {
    ...defaultRules.blockQuote,
    requiredFirstCharacters: [' ', '>'],
    match: (source: string, state: MarkdownState) => {
      const { prevCapture, inQuote, nested } = state;
      if (inQuote || nested) return null;
      if (prevCapture == null) return BLOCK_QUOTE_RE.exec(source);
      return BLOCK_QUOTE_START_RE.test(prevCapture[0]) ? BLOCK_QUOTE_RE.exec(source) : null;
    },
    parse: (capture: Capture, parse: Parser, state: MarkdownState) => {
      const whole = capture[0];
      const multiline = !!MULTILINE_QUOTE_RE.exec(whole);
      const content = whole.replace(multiline ? MULTILINE_QUOTE_RE : QUOTE_LINE_RE, '');
      const oldInQuote = state.inQuote || false;
      const oldInline = state.inline || false;
      state.inQuote = true;
      if (!multiline) state.inline = true;
      const nodes = parse(content, state);
      state.inQuote = oldInQuote;
      state.inline = oldInline;
      if (nodes.length === 0) nodes.push({ type: 'text', content: ' ' });
      return { content: nodes, type: 'blockQuote' };
    },
  },
  link: linkRule,
  autolink: { ...defaultRules.autolink, parse: autolinkParse },
  mailto: {
    ...defaultRules.mailto,
    match: inlineRegex(/^<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/),
    requiredFirstCharacters: ['<'],
    parse: (capture: Capture) => {
      const address = capture[1];
      let target = capture[1];
      if (!target.startsWith('mailto:')) target = 'mailto:' + target;
      return { type: 'link', content: [{ type: 'text', content: address }], target };
    },
  },
  tel: {
    ...defaultRules.mailto,
    requiredFirstCharacters: ['<'],
    match: inlineRegex(/^<((?:(?:tel|sms):\+?|\+)(?:(?:[0-9]|\([0-9]+\)))(?:[- ./]?(?:[0-9]|\([0-9]+\)))+)>/),
    parse: (capture: Capture) => {
      const number = capture[1];
      let target = capture[1].replaceAll(/[ /]+/g, '-');
      if (!target.startsWith('tel:') && !target.startsWith('sms:')) target = 'tel:' + target;
      return { type: 'link', content: [{ type: 'text', content: number }], target };
    },
  },
  url: {
    ...defaultRules.url,
    requiredFirstCharacters: ['h', 's'],
    match: (source: string, state: MarkdownState) => {
      if (!state.inline) return null;
      const match = URL_RE.exec(source);
      if (match != null) {
        // Trailing parentheses only belong to the URL when they close one opened in it.
        let from = 0;
        let url = match[0];
        for (let i = url.length - 1; i >= 0 && url[i] === ')'; i--) {
          const open = url.indexOf('(', from);
          if (open === -1) {
            url = url.slice(0, url.length - 1);
            break;
          }
          from = open + 1;
        }
        match[0] = match[1] = url;
      }
      return match;
    },
    parse: autolinkParse,
  },
  strong: defaultRules.strong,
  em: defaultRules.em,
  u: defaultRules.u,
  br: defaultRules.br,
  text: textRule,
  inlineCode: {
    ...defaultRules.inlineCode,
    parse: (capture: Capture, parse: Parser, state: MarkdownState) => {
      const node = defaultRules.inlineCode.parse(capture);
      return state.parseInlineCodeChildContent === true
        ? { ...node, validationChildContent: parse(node.content, state) }
        : node;
    },
  },
  emoticon: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['\xaf'],
    match: (source: string) => /^(\xaf\\_\(\u30C4\)_\/\xaf)/.exec(source),
    parse: (capture: Capture) => ({ type: 'text', content: capture[1] }),
  },
  codeBlock: {
    order: defaultRules.codeBlock.order,
    requiredFirstCharacters: ['`'],
    match: (source: string) => /^```(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*```/i.exec(source),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => ({
      lang: capture[1] ?? '',
      content: capture[2] ?? '',
      inQuote: state.inQuote || state.formatInline || false,
    }),
  },
  roleMention: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['<'],
    match: (source: string) => /^<@&(\d+)>/.exec(source),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      const [, roleId] = capture;
      if (state.returnMentionIds) return { type: 'roleMention', id: roleId };
      const lookup = lookupOf(state);
      const hasContext = state.guildId != null || state.channelId != null;
      const guildId = state.guildId ?? lookup.guildIdOf(state.channelId);
      const guild = hasContext ? lookup.guild(guildId) : { id: guildId ?? null };
      const role = guild != null ? lookup.role(roleId) : null;
      if (role == null) return { type: 'text', content: `@${lookup.strings.UNKNOWN_ROLE}` };
      const gradient = hasEnhancedRoleColors(lookup, guild?.id) && !isDefaultRoleColor(role);
      return {
        type: 'mention',
        channelId: state.channelId,
        guildId: guild?.id ?? null,
        roleId,
        roleColor: role.color,
        roleColors: gradient
          ? {
              primaryColor: role.colors?.primary_color,
              secondaryColor: role.colors?.secondary_color,
              tertiaryColor: role.colors?.tertiary_color,
            }
          : null,
        roleName: `@${role.name}`,
        color: role.color,
        colorString: role.color != null && role.color !== 0 ? intToHex(role.color) : null,
        content: [{ type: 'text', content: `@${role.name}` }],
      };
    },
  },
  mention: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['<', '@'],
    match: (source: string) => /^<@!?(\d+)>|^(@(?:everyone|here))/.exec(source),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) =>
      state.returnMentionIds
        ? capture[1] == null
          ? { type: 'mention', text: capture[0] }
          : { type: 'mention', id: capture[1] }
        : userMentionParse({ fullMatch: capture[0], id: capture[1], everyoneOrHere: capture[2] }, state),
  },
  silentPrefix: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['@'],
    match: (source: string, _state: MarkdownState, prevCapture: string) =>
      prevCapture == null || prevCapture === '' ? /^(@silent(?![^\s]))/.exec(source) : null,
    parse: (capture: Capture) => ({ type: 'silentPrefix', content: capture[0] }),
  },
  channelMention: channelMentionRule,
  channelOrMessageUrl: channelOrMessageUrlRule,
  mediaPostLink: mediaPostLinkRule,
  attachmentLink: attachmentLinkRule,
  commandMention: {
    order: defaultRules.text.order,
    requiredFirstCharacters: ['<'],
    match: (source: string) =>
      /^<\/((?:[-_\p{Letter}\p{Number}\p{sc=Deva}\p{sc=Thai}]{1,32})(?: [-_\p{Letter}\p{Number}\p{sc=Deva}\p{sc=Thai}]{1,32})?(?: [-_\p{Letter}\p{Number}\p{sc=Deva}\p{sc=Thai}]{1,32})?):(\d+)>/u.exec(
        source,
      ),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      if (state.returnMentionIds) return { type: 'commandMention', id: capture[2] };
      const commandName = capture[1];
      const commandId = capture[2];
      const [, ...subcommands] = commandName.split(' ');
      return {
        type: 'commandMention',
        channelId: state.channelId,
        commandId,
        commandName,
        commandKey: `${commandId}${subcommands.map((part) => `\0${part}`).join('')}`,
        content: [{ type: 'text', content: `${commandName}` }],
      };
    },
  },
  timestampMentionInput: {
    order: defaultRules.text.order,
    requiredFirstCharacters: ['<'],
    match: (source: string, state: MarkdownState) =>
      state.allowTimeMentionInput ? /^<@time:([^>]*)>/.exec(source) : null,
    parse: (capture: Capture) => ({ type: 'timestampMentionInput', content: capture[1] }),
  },
  gameMention: {
    order: defaultRules.text.order,
    requiredFirstCharacters: ['<'],
    match: (source: string, state: MarkdownState) => (state.allowGameMentions ? GAME_MENTION_RE.exec(source) : null),
    parse: (capture: Capture) => ({ type: 'gameMention', gameId: capture[1] }),
  },
  emoji: {
    order: TEXT_ORDER,
    requiredFirstCharacters: [':'],
    match: (source: string) => {
      const match = EMOJI_NAME_RE.exec(source);
      return match != null && convertNameToSurrogate(match[1]) !== '' ? match : null;
    },
    parse: (capture: Capture) => {
      const surrogate = convertNameToSurrogate(capture[1]);
      return { type: 'text', content: surrogate == null || surrogate === '' ? `:${capture[1]}:` : surrogate };
    },
  },
  soundboard: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['<'],
    match: (source: string) => SOUNDBOARD_RE.exec(source),
    // Soundmojis need the server's soundboard; unknown sounds stay as their markdown, like in the client.
    parse: (capture: Capture) => ({ type: 'text', content: `<sound:${capture[1]}:${capture[2]}>` }),
  },
  customEmoji: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['<'],
    match: (source: string) => /^<a?:(\w+):(\d+)>/.exec(source),
    parse: (capture: Capture) => ({ type: 'text', content: `:${capture[1]}:` }),
  },
  timestamp: {
    order: TEXT_ORDER - 1,
    requiredFirstCharacters: ['<'],
    match: (source: string) => TIMESTAMP_RE.exec(source),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      const [whole, timestamp, format] = capture;
      const parsed = parseTimestamp(timestamp, format, state.locale);
      return parsed == null ? { type: 'text', content: whole } : { ...parsed, type: 'timestamp' };
    },
  },
  s: {
    order: defaultRules.u.order,
    requiredFirstCharacters: ['~'],
    match: inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
    parse: defaultRules.u.parse,
  },
  spoiler: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['|'],
    match: (source: string) => SPOILER_RE.exec(source),
    parse: (capture: Capture, parse: Parser, state: MarkdownState) => ({
      content: parse(capture[1], state),
      channelId: state.channelId,
    }),
  },
  staticRouteLink: {
    order: TEXT_ORDER,
    requiredFirstCharacters: ['<'],
    match: (source: string) => STATIC_ROUTE_RE.exec(source),
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      const [, id, itemId] = capture;
      const lookup = lookupOf(state);
      const guildId = state.guildId ?? lookup.guildIdOf(state.channelId) ?? undefined;
      const s = lookup.strings;
      const main =
        id === 'home' || id === 'guide'
          ? s.SERVER_GUIDE
          : id === 'browse'
            ? s.BROWSE_CHANNELS
            : id === 'customize'
              ? s.CHANNELS_AND_ROLES
              : id === 'linked-roles'
                ? s.LINKED_ROLES
                : null;
      let item: string | null = null;
      if (id === 'linked-roles' && guildId != null && itemId != null) {
        const role = lookup.role(itemId) as
          (ReturnType<Lookup['role']> & { tags?: { guild_connections?: null } }) | null;
        item = role == null || role.tags?.guild_connections !== null ? null : role.name;
      }
      const content = (text: string | null) => (text == null ? null : [{ type: 'text', content: text }]);
      return {
        type: 'staticRouteLink',
        content: content(main + (item != null ? ` \u{203A} ${item}` : '')),
        mainContent: content(main),
        itemContent: content(item),
        itemId,
        id,
        guildId,
        channelId: id,
      };
    },
  },
  heading: headingRule,
  list: listRule,
  subtext: subtextRule,
};

/** The client's emoji, text and strikethrough patches merged into the rules above. */
const emojiRules: MarkdownRules = {
  s: { requiredFirstCharacters: ['~'], match: inlineRegex(/^~~([\s\S]+?)~~(?!_)/) },
  highlight: { order: TEXT_ORDER, match: () => null },
  emoji: {
    order: TEXT_ORDER,
    requiredFirstCharacters: [':'],
    match: (source: string) => {
      const match = EMOJI_NAME_AND_DIVERSITY_RE.exec(source);
      return match != null && convertNameToSurrogate(match[1]) !== '' ? match : null;
    },
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      const [whole, name] = capture;
      const surrogate = convertNameToSurrogate(name);
      return surrogate == null || surrogate === ''
        ? { type: 'text', content: whole }
        : { name: `:${name}:`, surrogate, src: unicodeEmojiURL(state, surrogate) };
    },
  },
  customEmoji: {
    order: defaultRules.codeBlock.order,
    requiredFirstCharacters: ['<'],
    match: (source: string) => /^<(a)?:(\w+):(\d+)>/.exec(source),
    parse: (capture: Capture) => {
      const [, animated, name, emojiId] = capture;
      return { emojiId, name: `:${name}:`, animated: animated === 'a' };
    },
  },
  text: {
    parse: (capture: Capture, _parse: Parser, state: MarkdownState) => {
      let index = 0;
      return findInlineEmojisFromSurrogates(capture[0]).map((part) => {
        if (part.type === 'text') {
          const originalMatch = { index, 0: part.text };
          index += part.text.length;
          return { type: 'text', content: part.text, originalMatch };
        }
        const originalMatch = { index, 0: part.surrogate };
        index += part.surrogate.length;
        return {
          type: 'emoji',
          name: part.emojiName,
          surrogate: part.surrogate,
          src: unicodeEmojiURL(state, part.surrogate),
          originalMatch,
        };
      });
    },
  },
  looseEm: {
    ...defaultRules.em,
    match: inlineRegex(
      new RegExp(
        '^\\*(?=\\S)((?:\\*\\*|\\\\[\\s\\S]|\\s+(?:\\\\[\\s\\S]|[^\\s\\*\\\\]|\\*\\*)|[^\\s\\*\\\\])+?) {1,2}\\*(?!\\*)',
      ),
    ),
    parse: (capture: Capture, parse: Parser, state: MarkdownState) => ({
      type: 'em',
      content: parse(capture[1], state),
      originalMatch: capture,
    }),
  },
};

/** The image URL for a unicode emoji (the client bundles them; apps provide them through `getEmojiURL`). */
const unicodeEmojiURL = (state: MarkdownState, surrogate: string) =>
  state.resolvers?.getEmojiURL?.({ name: surrogate, size: 48 }) ?? '';

/** Every rule the chat renders message content with, by name (`RULES` in the client). */
export const RULES: MarkdownRules = mergeRules([baseRules, emojiRules]);

const isWordBoundaryBefore = (text: string, index: number) =>
  text.length === 0 || index === 0 || text.charAt(index - 1).trim() === '';
const isWordBoundaryAfter = (text: string, index: number, length: number) => {
  const end = index + length;
  return end === text.length || text.charAt(end).trim() === '';
};

/** Rule sets of the client's other contexts (`CHANNEL_TOPIC_RULES`, `EMBED_TITLE_RULES`…). */
export const RULE_SETS = {
  RULES,
  CHANNEL_TOPIC_RULES: omit(RULES, ['inlineCode', 'codeBlock', 'br', 'blockQuote', 'subtext', 'soundboard']),
  VOICE_CHANNEL_STATUS_RULES: omit(RULES, [
    'inlineCode',
    'codeBlock',
    'br',
    'blockQuote',
    'autolink',
    'url',
    'attachmentLink',
    'mention',
    'roleMention',
    'channelMention',
    'channelOrMessageUrl',
    'mediaPostLink',
    'subtext',
    'soundboard',
    'gameMention',
  ]),
  EMBED_TITLE_RULES: omit(RULES, [
    'codeBlock',
    'br',
    'mention',
    'channel',
    'roleMention',
    'attachmentLink',
    'subtext',
    'soundboard',
    'gameMention',
  ]),
  INLINE_REPLY_RULES: omit(
    mergeRules([
      RULES,
      {
        inlineCode: {
          match: (source: string, state: MarkdownState, prevCapture: string) => {
            const block = RULES.codeBlock.match!(source, state, prevCapture);
            if (block != null) {
              if (block[1]?.toLowerCase() === 'ansi') block[2] = block[2].replaceAll(ANSI_ESCAPE_RE, '');
              return block;
            }
            const inline = RULES.inlineCode.match!(source, state, prevCapture);
            if (inline != null) return inline;
            return undefined;
          },
        },
      },
    ]),
    ['blockQuote', 'codeBlock', 'br'],
  ),
  GUILD_VERIFICATION_FORM_RULES: omit(RULES, ['codeBlock', 'br', 'blockQuote']),
  GUILD_EVENT_RULES: omit(RULES, ['codeBlock', 'blockQuote', 'br']),
  PROFILE_BIO_RULES: omit(RULES, [
    'codeBlock',
    'br',
    'attachmentLink',
    'mention',
    'roleMention',
    'channel',
    'paragraph',
    'newline',
    'soundboard',
  ]),
  AUTO_MODERATION_SYSTEM_MESSAGE_RULES: mergeRules([
    {
      highlightWord: {
        order: -1,
        match: (source: string, state: MarkdownState) => {
          if (
            (state.parseDepth != null && state.parseDepth > 10) ||
            state.highlightWord == null ||
            state.highlightWord.length === 0
          )
            return null;
          const word = state.highlightWord;
          let index = source.indexOf(word);
          if (index === -1) return null;
          let inWord = !isWordBoundaryBefore(source, index) || !isWordBoundaryAfter(source, index, word.length);
          if (inWord)
            do {
              index = source.indexOf(word, index + 1);
              inWord = !isWordBoundaryBefore(source, index) || !isWordBoundaryAfter(source, index, word.length);
            } while (inWord && index !== -1);
          if (index === -1) return null;
          return [
            source,
            word,
            source.substring(0, index),
            source.substring(index + word.length),
          ] as unknown as Capture;
        },
        parse: (capture: Capture, parse: Parser, state: MarkdownState) => {
          const depth = state.parseDepth ?? 0;
          const nested = { ...state, parseDepth: depth + 1 };
          return [
            ...parse(capture[2], nested),
            { type: 'highlight', content: capture[1] },
            ...parse(capture[3], nested),
          ];
        },
      },
    },
    omit(RULES, ['url']),
  ]),
  NATIVE_SEARCH_RESULT_LINK_RULES: omit(RULES, ['codeBlock', 'br', 'inlineCode']),
  POLL_RULES: pick(RULES, ['escape', 'emoticon', 'text', 'strong', 'em', 'u', 's', 'inlineCode', 'timestamp']),
} satisfies Record<string, MarkdownRules>;

export type RuleSetName = keyof typeof RULE_SETS;

export type { APIResolvedChannel };
