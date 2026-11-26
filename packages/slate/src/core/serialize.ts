import { invariant } from './invariant';
import { Element, Text } from 'slate';
import type { Descendant, Point, Range } from 'slate';
import type { APIResolvedChannel, APIResolvedUser } from '@discord-mana/messages';
import { RangeUtils } from './slateUtils';
import type { BlockElement, RichValue } from './types';
import type { EditorResolvers } from './context';

// Rich value <-> message text. `raw` is what gets sent (`<@id>`, `<:name:id>`, `<#id>`); `plain` is what a person
// reads (`@username`, `:name:`, `#channel`), used for copying and for the plain text area.

export type SerializeMode = 'raw' | 'plain';

export interface SerializeOptions {
  mode?: SerializeMode;
  /** Only this range of the value. */
  range?: Range;
  ignoreTrailingEmptyNodes?: boolean;
  /** Unicode emoji as `:name:` instead of the character. */
  preventEmojiSurrogates?: boolean;
  /** For plain mode: names of mentioned users, roles and channels. */
  resolvers?: EditorResolvers;
}

interface ChildOptions extends Omit<SerializeOptions, 'range'> {
  start?: Point;
  end?: Point;
  separator?: string;
  ignoreEmptyNodes?: boolean;
  allowBlockQuotePrefix?: boolean;
}

const CHANNEL_TYPE = {
  DM: 1,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_TEXT: 0,
  GUILD_VOICE: 2,
  GUILD_ANNOUNCEMENT: 5,
  ANNOUNCEMENT_THREAD: 10,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
  GUILD_STAGE_VOICE: 13,
  GUILD_FORUM: 15,
  GUILD_MEDIA: 16,
} as const;

const quoteChannelName = (name: string) => name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** A channel's name as the chat input writes it: `#general`, `#"voice channel"` for names with spaces. */
export const formatChannelMention = (channel: APIResolvedChannel) => {
  const name = channel.name ?? '';
  switch (channel.type) {
    case CHANNEL_TYPE.GUILD_ANNOUNCEMENT:
    case CHANNEL_TYPE.GUILD_TEXT:
    case CHANNEL_TYPE.GUILD_FORUM:
    case CHANNEL_TYPE.GUILD_MEDIA:
      return `#${name}`;
    case CHANNEL_TYPE.GUILD_CATEGORY:
    case CHANNEL_TYPE.PUBLIC_THREAD:
    case CHANNEL_TYPE.PRIVATE_THREAD:
    case CHANNEL_TYPE.ANNOUNCEMENT_THREAD:
    case CHANNEL_TYPE.GUILD_VOICE:
    case CHANNEL_TYPE.GUILD_STAGE_VOICE:
      return `#"${quoteChannelName(name)}"`;
    case CHANNEL_TYPE.DM:
      return `@${name}`;
    default:
      return name;
  }
};

/** `username`, or `username#1234` for accounts that still have a discriminator. */
export const getUserTag = (user: APIResolvedUser) =>
  user.discriminator != null && user.discriminator !== '0' && user.discriminator !== ''
    ? `${user.username}#${user.discriminator}`
    : user.username;

const serializeChildren = (nodes: Descendant[], options: ChildOptions): string => {
  const { start, end, ignoreEmptyNodes, ignoreTrailingEmptyNodes } = options;
  let { separator } = options;
  const blocks = nodes.length > 0 && !Text.isText(nodes[0]);
  if (separator == null) separator = blocks ? '\n' : '';
  const first = start?.path[0] ?? 0;
  let last = end?.path[0] ?? nodes.length - 1;
  if (ignoreTrailingEmptyNodes)
    for (let i = last; i >= first; i--) {
      const node = nodes[i];
      if (Text.isText(node)) {
        if (node.text.length > 0) {
          last = i;
          break;
        }
      } else if (!isEmptyElement(node)) {
        last = i;
        break;
      }
      if (i === first) return '';
    }
  const afterQuote = first > 0 && isBlockQuote(nodes[first - 1]);
  const startsInQuote = isBlockQuote(nodes[first]);
  const endsInQuote = isBlockQuote(nodes[last]);
  const parts: string[] = [];
  for (let i = first; i <= last; i++) {
    const node = nodes[i];
    if (ignoreEmptyNodes && Text.isText(node) && node.text.length === 0) continue;
    const text = serializeNode(node, {
      ...options,
      start: start != null && i === first ? { path: start.path.slice(1), offset: start.offset } : undefined,
      end: end != null && i === last ? { path: end.path.slice(1), offset: end.offset } : undefined,
      allowBlockQuotePrefix: start == null || end == null || (!afterQuote && (!startsInQuote || endsInQuote)),
      separator: undefined,
      ignoreEmptyNodes: undefined,
      ignoreTrailingEmptyNodes: undefined,
    });
    if (!ignoreEmptyNodes || text.length > 0) parts.push(text);
  }
  return parts.join(separator);
};

const isBlockQuote = (node: Descendant | undefined) => Element.isElement(node) && node.type === 'blockQuote';

const isEmptyElement = (element: Element) => {
  if (element.children.length > 1) return false;
  if (element.children.length === 0) return true;
  const child = element.children[0];
  return Text.isText(child) && child.text.length === 0;
};

/** One node as text: a void as its message syntax (`raw`) or display text (`plain`). */
export const serializeNode = (node: Descendant, options: ChildOptions = {}): string => {
  const { mode, start, allowBlockQuotePrefix = false, preventEmojiSurrogates = false, resolvers } = options;
  if (Text.isText(node)) {
    invariant(start == null || start.path.length === 0, 'Invalid start provided to serializeText');
    invariant(options.end == null || options.end.path.length === 0, 'Invalid end provided to serializeText');
    return node.text.substring(start?.offset ?? 0, options.end?.offset ?? node.text.length);
  }
  switch (node.type) {
    case 'line':
      return serializeChildren(node.children, options);
    case 'blockQuote': {
      const text = serializeChildren(node.children, options);
      const fromStart = start != null && start.path.length === 1 && start.path[0] === 0 && start.offset === 0;
      return allowBlockQuotePrefix && (start == null || fromStart) ? `> ${text}` : text;
    }
    case 'emoji':
      return !preventEmojiSurrogates && node.emoji.surrogate != null ? node.emoji.surrogate : node.emoji.name;
    case 'customEmoji': {
      const { emoji } = node;
      if (mode === 'raw') {
        const name = emoji.name.replace(/:/g, '').split('~')[0];
        return `<${emoji.animated ? 'a' : ''}:${name}:${emoji.emojiId}>`;
      }
      return emoji.name;
    }
    case 'textMention':
      return node.name;
    case 'channelMention': {
      const raw = `<#${node.channelId}>`;
      if (mode === 'raw') return raw;
      const channel = resolvers?.resolveChannel?.(node.channelId);
      return channel == null ? raw : formatChannelMention(channel);
    }
    case 'soundboard':
      return `<sound:${node.guildId}:${node.soundId}>`;
    case 'staticRouteLink':
      return node.itemId != null ? `<id:${node.id}:${node.itemId}>` : `<id:${node.id}>`;
    case 'roleMention': {
      const raw = `<@&${node.roleId}>`;
      if (mode === 'raw') return raw;
      const role = resolvers?.resolveRole?.(node.roleId);
      return role == null ? raw : `@${role.name}`;
    }
    case 'userMention': {
      const raw = `<@${node.userId}>`;
      if (mode === 'raw') return raw;
      const user = resolvers?.resolveUser?.(node.userId);
      return user == null ? raw : `@${getUserTag(user)}`;
    }
    case 'commandMention':
      return `</${node.commandName}:${node.commandId}>`;
    case 'timestamp':
      return node.parsed.format != null
        ? `<t:${node.parsed.timestamp}:${node.parsed.format}>`
        : `<t:${node.parsed.timestamp}>`;
    case 'gameMention':
      return `<@$${node.gameId}>`;
    case 'hostInlineVoid':
      return node.raw;
  }
  return '';
};

/** The rich value as message text. */
export const toTextValue = (value: Descendant[], options: SerializeOptions = {}) => {
  const { range, ...rest } = options;
  const [start, end] = range != null ? RangeUtils.edges(range) : [undefined, undefined];
  return serializeChildren(value, { ...rest, start, end });
};

/** Message text as a rich value: one line block per line. Mentions and emoji become pills once in an editor. */
export const toRichValue = (text: string): RichValue =>
  text.split('\n').map((line): BlockElement => ({ type: 'line', children: [{ text: line }] }));
