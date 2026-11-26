import type { BaseEditor, BaseRange, BaseSelection, BaseText, Descendant } from 'slate';
import type { ReactEditor } from '../slate-react';
import type { ChatInputType } from '../chatInputTypes';
import type { EditorContextValue } from './context';

// The node shapes of the client's rich chat input: lines and block quotes hold text and inline elements; mentions,
// emoji and timestamps are inline voids that serialise back to their message syntax.

export interface CodeBlockState {
  lang: string | null;
  wasInCodeBlock: boolean;
  isInCodeBlock: boolean;
  isStyledCodeBlockLine: boolean;
  hljsTypes: CodeHighlightSpan[] | null;
}

/** A highlighted span of a code block line: `types` are class names, `style` an inline style (ANSI colours). */
export interface CodeHighlightSpan {
  types: string[];
  start: number;
  end: number;
  style?: Record<string, string>;
}

export interface LineElement {
  type: 'line';
  codeBlockState?: CodeBlockState | null;
  children: Descendant[];
}

export interface BlockQuoteElement {
  type: 'blockQuote';
  children: Descendant[];
}

type VoidChildren = [{ text: '' }] | BaseText[];

export interface EmojiElement {
  type: 'emoji';
  emoji: { name: string; src?: string; surrogate: string; jumboable: boolean };
  children: VoidChildren;
}

export interface CustomEmojiElement {
  type: 'customEmoji';
  emoji: { emojiId: string; name: string; animated: boolean; jumboable: boolean };
  children: VoidChildren;
}

export interface TextMentionElement {
  type: 'textMention';
  name: string;
  children: VoidChildren;
}

export interface UserMentionElement {
  type: 'userMention';
  userId: string;
  children: VoidChildren;
}

export interface RoleMentionElement {
  type: 'roleMention';
  roleId: string;
  children: VoidChildren;
}

export interface ChannelMentionElement {
  type: 'channelMention';
  channelId: string;
  children: VoidChildren;
}

export interface StaticRouteLinkElement {
  type: 'staticRouteLink';
  id: string;
  itemId?: string | null;
  children: VoidChildren;
}

export interface SoundboardElement {
  type: 'soundboard';
  guildId: string;
  soundId: string;
  children: VoidChildren;
}

export interface CommandMentionElement {
  type: 'commandMention';
  commandName: string;
  commandId: string;
  children: VoidChildren;
}

export interface ParsedTimestampData {
  timestamp: string;
  format?: string;
  parsed?: unknown;
  full?: string;
  formatted?: string;
  [key: string]: unknown;
}

export interface TimestampElement {
  type: 'timestamp';
  parsed: ParsedTimestampData;
  children: VoidChildren;
}

export interface GameMentionElement {
  type: 'gameMention';
  gameId: string;
  children: VoidChildren;
}

/** A void the host app inserted that serialises to `raw` verbatim. */
export interface HostInlineVoidElement {
  type: 'hostInlineVoid';
  raw: string;
  children: VoidChildren;
}

export type InlineVoidElement =
  | EmojiElement
  | CustomEmojiElement
  | TextMentionElement
  | UserMentionElement
  | RoleMentionElement
  | ChannelMentionElement
  | StaticRouteLinkElement
  | SoundboardElement
  | CommandMentionElement
  | TimestampElement
  | GameMentionElement
  | HostInlineVoidElement;

export type BlockElement = LineElement | BlockQuoteElement;

export type RichElement = BlockElement | InlineVoidElement;

export type RichElementType = RichElement['type'];

/** The editor's value: one block per line. */
export type RichValue = BlockElement[];

export interface Composition {
  insertedPrefix: boolean;
  startedInsideInline: boolean;
}

export interface HistoryEntry {
  type: 'insert' | 'delete' | 'other';
  mergeable: boolean;
  createdAt: number;
  value: Descendant[];
  selection: BaseSelection;
}

type Listener = () => void;

export interface EditorEvents {
  addListener: (event: 'onChange', listener: Listener) => void;
  removeListener: (event: 'onChange', listener: Listener) => void;
  emit: (event: 'onChange') => void;
}

export interface DiscordEditorExtras {
  chatInputType: ChatInputType;
  /** Live markdown styling while typing (the client's "preview markdown" setting). */
  previewMarkdown: boolean;
  composition: Composition | null;
  events: EditorEvents;
  isMac: boolean;
  history: { index: number; stack: HistoryEntry[] };
  undo: () => void;
  redo: () => void;
  lastGoodSelection?: BaseSelection;
  /** Formatting shortcuts and editing keys; returns true when it handled the event. */
  onKeyDown?: (event: KeyboardEvent | React.KeyboardEvent) => boolean;
  /** Resolvers, ids and markdown rules the plugins read in place of the client's stores. */
  context: EditorContextValue;
}

export type DiscordEditor = BaseEditor & ReactEditor & DiscordEditorExtras;

/** Decoration flags the markdown tokenizer adds to ranges (`strong`, `syntaxBefore`, `before_em`, `hljsTypes`…). */
export type DecorationRange = BaseRange & { [flag: string]: unknown };

declare module 'slate' {
  interface CustomTypes {
    Editor: DiscordEditor;
    Element: RichElement;
    Text: BaseText & { placeholder?: string; [flag: string]: unknown };
    Range: BaseRange & { placeholder?: string; [flag: string]: unknown };
  }
}

export type TextUnit = 'character' | 'word' | 'line' | 'block';
