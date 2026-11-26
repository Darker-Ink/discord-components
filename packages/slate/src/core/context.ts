import { createContext, useContext } from 'react';
import type { MarkdownRules } from '@discord-mana/markdown/internal';
import type { CodeHighlightSpan } from './types';
import type { APIResolvedChannel, APIResolvedRole, APIResolvedUser, MessageResolvers } from '@discord-mana/messages';

/** A custom emoji the editor can insert or convert `:name:` into. */
export interface EditorCustomEmoji {
  id: string;
  name: string;
  animated?: boolean;
  /** Emojis that must be typed with colons keep them in their name (`:name:`), like the client. */
  require_colons?: boolean;
  /** Server name, shown next to the emoji in autocomplete. */
  guildName?: string;
  /** Whether the emoji can be used here (autocomplete greys out ones that can't). */
  available?: boolean;
}

/** A unicode emoji for autocomplete: `names[0]` is its shortcode (`thumbsup`). */
export interface EditorUnicodeEmoji {
  names: string[];
  surrogates: string;
}

export interface EditorCommand {
  id: string;
  name: string;
  description?: string;
}

/**
 * Everything the client's editor reads from its stores: users, members, roles and channels for pills and
 * autocomplete, emoji for `:name:` and the emoji autocomplete. The `MessageResolvers` shapes (users, roles,
 * channels, emoji URLs) are shared with message rendering, so one object can feed both.
 */
export interface EditorResolvers extends MessageResolvers {
  /** Custom emoji by name, for turning a typed `:name:` into an emoji. */
  resolveCustomEmoji?: (name: string) => EditorCustomEmoji | null | undefined;
  /** Emoji autocomplete results for a query (the text after `:`). */
  searchEmojis?: (query: string) => { custom: EditorCustomEmoji[]; unicode: EditorUnicodeEmoji[] };
  /** Server roles by position, for turning a typed `@Role name` into a role mention. */
  getRoles?: () => APIResolvedRole[];
  /** Members who can be mentioned here (server members or DM recipients) for typed `@username`. */
  getMentionableUsers?: () => APIResolvedUser[];
  /** Channels for typed `#channel-name` and the `#` autocomplete. */
  getChannels?: () => APIResolvedChannel[];
  /** Clicking a user or role pill (the client opens the user's or role's popout). */
  onMentionClick?: (mention: { type: 'user' | 'role'; id: string }, event: React.MouseEvent<HTMLElement>) => void;
}

export interface EditorContextValue {
  guildId?: string | null;
  channelId?: string | null;
  resolvers: EditorResolvers;
  /** Markdown rules the text is styled with; defaults to the chat's full rule set. */
  rules?: MarkdownRules;
  /**
   * Syntax highlighting for code blocks: spans per line (class names from `codeHighlightClasses`), or null to
   * leave the code plain. The client highlights with a tree-sitter WebAssembly build that isn't bundled here.
   */
  highlightCode?: (code: string, lang: string) => CodeHighlightSpan[][] | null;
}

export const EditorResolversContext = createContext<EditorContextValue>({ resolvers: {} });

EditorResolversContext.displayName = 'EditorResolversContext';

export const useEditorContext = () => useContext(EditorResolversContext);
