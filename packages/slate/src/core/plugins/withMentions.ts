import { invariant } from '../invariant';
import type { Editor, Element, NodeEntry } from 'slate';
import type { APIResolvedUser } from '@discord-mana/messages';
import { HistoryUtils } from '../history';
import { serializeNode } from '../serialize';
import { EditorUtils, ElementUtils, PathUtils, TextUtils, type MarkdownResult } from '../slateUtils';
import { SlateTransforms } from '../transforms';
import { pointAtSerializedOffset } from '../offsets';
import type { BlockElement, InlineVoidElement, RichElement } from '../types';
import type { EditorContextValue } from '../context';

// Mentions, emoji and timestamps become inline voids ("pills") as soon as their message syntax is complete
// (`<@id>`, `<:name:id>`, a unicode emoji), and so do typed names that match exactly one user, role, channel or
// custom emoji (`@username`, `@Role`, `#channel`, `:name:`). A pill that no longer parses turns back into text.

const RAW_MENTION_RE =
  /(@[^@#]+(?:#0|#\d{4}))|(@[^\s\t@#:]+)(?=[\s\t@:])|(:[a-zA-Z0-9_~]+:)|(#"(?:\\\\|\\"|(?!")[^\\])+")|(#[^\s\t@#:]+(?=[\s\t@#:]))/g;
const EMOJI_NAME_RE = /^:([^\s:]+?(?:::skin-tone-\d)?):/;

export const INLINE_VOID_TYPES = new Set([
  'emoji',
  'customEmoji',
  'textMention',
  'userMention',
  'roleMention',
  'channelMention',
  'staticRouteLink',
  'soundboard',
  'timestamp',
  'gameMention',
  'hostInlineVoid',
]);
const MENTION_TYPES = new Set(['textMention', 'userMention', 'roleMention', 'channelMention']);
export const INLINE_INPUT_TYPES = new Set(['gameMentionInput', 'timestampMentionInput']);
const TEXT_BLOCK_TYPES = new Set(['line', 'blockQuote']);

const unescapeChannelName = (name: string) => name.replace(/\\(["\\])/g, '$1');

const matchesUser = (name: string, discriminator: string | undefined, user: APIResolvedUser, exact = false) =>
  (exact ? user.username === name : user.username.startsWith(name)) &&
  (user.discriminator ?? '0') === (discriminator ?? '0');

const textChannelName = (channel: { name?: string | null }) => channel.name ?? '';

/** The pill a typed `@name`, `:name:` or `#channel` stands for, if it names exactly one thing. */
export const resolveRawMention = (
  text: string,
  context: EditorContextValue,
  { allowUsers = true, allowRoles = true }: { allowUsers?: boolean; allowRoles?: boolean } = {},
): InlineVoidElement | null => {
  const { resolvers, guildId } = context;
  switch (text[0]) {
    case '@': {
      const [name, discriminator] = text.slice(1).split('#', 2);
      if (allowRoles && discriminator == null && guildId != null)
        for (const role of resolvers.getRoles?.() ?? [])
          if (name === role.name) return { type: 'roleMention', roleId: role.id, children: [{ text: '' }] };
      if (allowUsers) {
        const users = (resolvers.getMentionableUsers?.() ?? []).filter((user) =>
          matchesUser(name, discriminator, user),
        );
        if (users.length === 1 && matchesUser(name, discriminator, users[0], true))
          return { type: 'userMention', userId: users[0].id, children: [{ text: '' }] };
      }
      return null;
    }
    case ':': {
      const match = EMOJI_NAME_RE.exec(text);
      if (match == null) return null;
      const emoji = resolvers.resolveCustomEmoji?.(match[1]);
      if (emoji == null) return null;
      return {
        type: 'customEmoji',
        emoji: {
          emojiId: emoji.id,
          name: emoji.require_colons ? `:${emoji.name}:` : emoji.name,
          animated: emoji.animated === true,
          jumboable: false,
        },
        children: [{ text: '' }],
      };
    }
    case '#': {
      if (guildId == null) break;
      const name =
        text.length > 3 && text[1] === '"' && text[text.length - 1] === '"'
          ? unescapeChannelName(text.slice(2, text.length - 1))
          : text.slice(1);
      for (const channel of resolvers.getChannels?.() ?? [])
        if (textChannelName(channel) === name && channel.can_view !== false)
          return { type: 'channelMention', channelId: channel.id, children: [{ text: '' }] };
      break;
    }
  }
  return null;
};

const canInsert = (editor: Editor, node: RichElement) =>
  !(editor.chatInputType.markdown?.disableMentions === true && MENTION_TYPES.has(node.type));

// Maps each text node to its offset in the block's serialized text (voids count as one character), to tell
// whether a point is inside inline code or a code block.
const offsetsOf = (editor: Editor, path: number[]) => {
  const offsets = new Map<string, number>();
  let offset = 0;
  for (const [node, nodePath] of EditorUtils.nodes(editor, {
    at: { anchor: EditorUtils.start(editor, path), focus: EditorUtils.end(editor, path) },
    mode: 'lowest',
  })) {
    offsets.set(nodePath.join(','), offset);
    offset += TextUtils.isText(node) ? node.text.length : 1;
  }
  return offsets;
};

const isInCode = (
  offsets: Map<string, number> | null,
  point: { path: number[]; offset: number },
  markdown: MarkdownResult,
) => {
  if (offsets == null) return false;
  let index = offsets.get(point.path.join(','));
  if (index != null) index += point.offset;
  else {
    const parent = offsets.get(PathUtils.parent(point.path).join(','));
    if (parent == null) return false;
    index = parent + 1;
  }
  for (const entry of markdown.entries) {
    if (!entry.attributes.includes('codeBlockText') && !entry.attributes.includes('inlineCode')) continue;
    if (entry.start <= index && entry.start + entry.text.length >= index) return true;
  }
  return false;
};

// Pills that should be text again: in code, or escaped by a backslash right before them.
const voidsToText = (
  editor: Editor,
  [block, path]: NodeEntry<Element>,
  all: boolean,
  markdown: MarkdownResult | null,
) => {
  let changed = false;
  const offsets = all || markdown == null ? null : offsetsOf(editor, path);
  for (let i = block.children.length - 1; i >= 0; i--) {
    const child = block.children[i];
    if (TextUtils.isText(child) && !all) {
      const next = i < block.children.length - 1 ? block.children[i + 1] : null;
      if (next == null || !ElementUtils.isElement(next) || !editor.isVoid(next)) continue;
      let escaped = false;
      let from = 0;
      for (;;) {
        const index = child.text.indexOf('\\', from);
        if (index === -1) break;
        if (index === child.text.length - 1) {
          escaped = true;
          break;
        }
        from = index + 2;
      }
      if (escaped) {
        SlateTransforms.voidToText(
          editor,
          serializeNode(next, { mode: 'plain', preventEmojiSurrogates: true, resolvers: editor.context.resolvers }),
          PathUtils.child(path, i + 1),
        );
        changed = true;
      }
    } else if (ElementUtils.isElement(child) && editor.isVoid(child)) {
      const childPath = PathUtils.child(path, i);
      const start = { path: PathUtils.child(childPath, 0), offset: 0 };
      if (all || (markdown != null && isInCode(offsets, start, markdown))) {
        SlateTransforms.voidToText(
          editor,
          serializeNode(child, { mode: 'plain', preventEmojiSurrogates: true, resolvers: editor.context.resolvers }),
          childPath,
        );
        changed = true;
      }
    }
  }
  return changed;
};

const rawMentionsToVoids = (editor: Editor, [block, path]: NodeEntry<Element>, markdown: MarkdownResult) => {
  let changed = false;
  const offsets = offsetsOf(editor, path);
  for (let i = block.children.length - 1; i >= 0; i--) {
    const child = block.children[i];
    if (!TextUtils.isText(child)) continue;
    const textPath = PathUtils.child(path, i);
    const found: { index: number; length: number; node: InlineVoidElement }[] = [];
    RAW_MENTION_RE.lastIndex = 0;
    let match;
    while ((match = RAW_MENTION_RE.exec(child.text)) != null) {
      if (match.index !== 0 && child.text.charAt(match.index - 1).match(/(\t|\s)/) == null) {
        RAW_MENTION_RE.lastIndex = match.index + 1;
        continue;
      }
      if (isInCode(offsets, { path: textPath, offset: match.index }, markdown)) continue;
      const node = resolveRawMention(match[0], editor.context);
      if (node != null && canInsert(editor, node)) found.push({ index: match.index, length: match[0].length, node });
      else RAW_MENTION_RE.lastIndex = match.index + 1;
    }
    for (const { index, length, node } of found.reverse()) {
      const anchor = { path: textPath, offset: index };
      const focus = { path: textPath, offset: index + length };
      invariant(
        anchor.offset >= 0 && anchor.offset <= child.text.length,
        'Failed to find valid start position for raw mention replace',
      );
      invariant(
        focus.offset >= 0 && focus.offset <= child.text.length,
        'Failed to find valid end position for raw mention replace',
      );
      SlateTransforms.textToVoid(editor, node, { anchor, focus });
      changed = true;
    }
  }
  return changed;
};

// Whether the text before `offset` is inside an unterminated `#"quoted channel name`.
const isInsideQuotedChannel = (text: string, offset: number) => {
  const before = text.substring(0, offset);
  const open = before.lastIndexOf('#"');
  if (open === -1) return false;
  const rest = before.substring(open + 2);
  for (let i = 0; i < rest.length; i++)
    if (rest[i] === '\\') i++;
    else if (rest[i] === '"') return false;
  return true;
};

const entriesToVoids = (editor: Editor, [, path]: NodeEntry<Element>, markdown: MarkdownResult) => {
  let changed = false;
  const entries = [...markdown.entries].reverse();
  const text = markdown.serializedChildren.join('');
  const hasQuotedChannel = text.includes('#"');
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const previous = entries[i + 1];
    if (previous != null && previous.text.endsWith('\\') && entry.start === previous.start + previous.text.length)
      continue;
    let node: RichElement;
    const { data } = entry;
    switch (entry.attributes[0]) {
      case 'emoji':
        if (hasQuotedChannel && isInsideQuotedChannel(text, entry.start)) continue;
        node = {
          type: 'emoji',
          emoji: { name: data.name, src: data.src, surrogate: data.surrogate, jumboable: data.jumboable === true },
          children: [{ text: '' }],
        };
        break;
      case 'customEmoji':
        node = {
          type: 'customEmoji',
          emoji: {
            emojiId: data.emojiId,
            name: data.name,
            animated: data.animated,
            jumboable: data.jumboable === true,
          },
          children: [{ text: '' }],
        };
        break;
      case 'textMention':
        node = { type: 'textMention', name: data.text, children: [{ text: '' }] };
        break;
      case 'mention':
        node = { type: 'userMention', userId: data.id, children: [{ text: '' }] };
        break;
      case 'roleMention':
        node = { type: 'roleMention', roleId: data.id, children: [{ text: '' }] };
        break;
      case 'channelMention':
        node = { type: 'channelMention', channelId: data.id, children: [{ text: '' }] };
        break;
      case 'staticRouteLink':
        node = { type: 'staticRouteLink', id: data.id, itemId: data.itemId, children: [{ text: '' }] };
        break;
      case 'soundboard':
        node = { type: 'soundboard', guildId: data.guildId, soundId: data.soundId, children: [{ text: '' }] };
        break;
      case 'timestamp':
        node = { type: 'timestamp', parsed: data, children: [{ text: '' }] };
        break;
      case 'gameMention':
        node = { type: 'gameMention', gameId: data.id, children: [{ text: '' }] };
        break;
      default:
        continue;
    }
    if (!canInsert(editor, node)) continue;
    const anchor = pointAtSerializedOffset(editor, path, markdown.serializedChildren, entry.start);
    const focus = pointAtSerializedOffset(editor, path, markdown.serializedChildren, entry.start + entry.text.length);
    SlateTransforms.textToVoid(editor, node, { anchor, focus });
    changed = true;
  }
  return changed;
};

const updateBlock = (editor: Editor, entry: NodeEntry<BlockElement>) => {
  const inCodeBlock = entry[0].type === 'line' && entry[0].codeBlockState?.isInCodeBlock === true;
  let markdown = ElementUtils.markdown(editor, entry[0]);
  if (voidsToText(editor, entry, inCodeBlock, markdown)) {
    entry = ElementUtils.updateElement(editor, entry);
    markdown = ElementUtils.markdown(editor, entry[0]);
  }
  if (inCodeBlock) return;
  if (rawMentionsToVoids(editor, entry, markdown)) {
    entry = ElementUtils.updateElement(editor, entry);
    markdown = ElementUtils.markdown(editor, entry[0]);
  }
  entriesToVoids(editor, entry, markdown);
};

/** Converts text to pills (and back) across the whole value. */
export const updateMentions = (editor: Editor) => {
  const stylesDisabled = EditorUtils.areStylesDisabled(editor);
  for (const entry of EditorUtils.blocks(editor))
    if (TEXT_BLOCK_TYPES.has(entry[0].type)) {
      if (stylesDisabled) voidsToText(editor, entry, true, null);
      else updateBlock(editor, entry);
    }
};

export const withMentions = (editor: Editor) => {
  const { isInline, isVoid, onChange } = editor;
  editor.isVoid = (element) => INLINE_VOID_TYPES.has(element.type) || isVoid(element);
  editor.isInline = (element) =>
    INLINE_VOID_TYPES.has(element.type) || INLINE_INPUT_TYPES.has(element.type) || isInline(element);
  let lastValue: unknown = null;
  let lastPreview = true;
  editor.onChange = () => {
    const value = EditorUtils.richValue(editor);
    if (value !== lastValue || editor.previewMarkdown !== lastPreview) {
      HistoryUtils.withMergedEntry(editor, () => {
        EditorUtils.withoutNormalizing(editor, () => updateMentions(editor));
      });
      lastValue = value;
      lastPreview = editor.previewMarkdown;
    }
    onChange();
  };
  return editor;
};
