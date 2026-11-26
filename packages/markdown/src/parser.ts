/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import type { MessageResolvers } from '@discord-mana/messages';
import { flattenAST, limitAST } from './ast';
import { containsGameServerShareLink, containsQuestLink } from './links';
import { createReactRules, mentionReactRule, withStoppedPropagation, type ReactRuleOptions } from './reactRules';
import { RULE_SETS, RULES, mergeRules, type MarkdownRules } from './rules';
import { parserFor, reactFor, ruleOutput, type ASTNode, type Rules } from './simpleMarkdown';
import { DEFAULT_MARKDOWN_STRINGS, type MarkdownParseOptions, type MarkdownState, type MarkdownStrings } from './state';

// The client's parsers (`parse`, `parseInlineReply`, `parseEmbedTitle`…): a rule set, its React output, the
// parse state each context uses, and the message renderer's post-processing (jumbo emoji, inline replies).

const omit = (rules: MarkdownRules, names: string[]) => {
  const result: MarkdownRules = {};
  for (const name in rules) if (!names.includes(name)) result[name] = rules[name];
  return result;
};

const once = <T>(build: () => T) => {
  let value: T | undefined;
  return () => (value ??= build());
};

/** Adds the mention renderer, like the client's `combineAndInjectMentionRule`. */
const withMentions = (rules: MarkdownRules, reactRules: MarkdownRules[], options: ReactRuleOptions = {}) =>
  mergeRules([
    rules,
    ...reactRules,
    rules.mention != null
      ? {
          mention: options.shouldStopPropagation === true ? withStoppedPropagation(mentionReactRule) : mentionReactRule,
        }
      : {},
  ]);

/** Masked link text keeps its formatting even when the link rule itself is turned off. */
const withLinkFallback = (rules: MarkdownRules): MarkdownRules =>
  rules.link?.react != null
    ? rules
    : {
        ...rules,
        link: { ...rules.link, react: (node: ASTNode, output: any, state: any) => output(node.content, state) },
      };

const DEFAULT_REACT_OPTIONS: ReactRuleOptions = { enableEmojiClick: true };
const LINK_RULES = ['url', 'autolink', 'link', 'mailto', 'tel'];

const topicReactOptions: ReactRuleOptions = {
  ...DEFAULT_REACT_OPTIONS,
  emojiTooltipPosition: 'bottom',
  shouldStopPropagation: true,
};

const messageRules = once(() => withMentions(RULES, [createReactRules({ enableEmojiClick: true })]));
const embedTitleRules = once(() =>
  withMentions(RULE_SETS.EMBED_TITLE_RULES, [createReactRules(DEFAULT_REACT_OPTIONS)]),
);
const guildEventRules = once(() => {
  const options = { ...DEFAULT_REACT_OPTIONS, shouldStopPropagation: true };
  return withMentions(RULE_SETS.GUILD_EVENT_RULES, [createReactRules(options)], options);
});

/** The state message content is parsed with in the chat (the client's render options for the message list). */
// Game mentions (`<@$id>`) need the client's game data, so they stay text here.
export const MESSAGE_CONTENT_CONTEXT: MarkdownParseOptions = {
  allowLinks: true,
  allowDevLinks: false,
  allowGameMentions: false,
  allowTimeMentionInput: false,
  formatInline: false,
  noStyleAndInteraction: false,
  allowHeading: true,
  allowList: true,
  previewLinkTarget: true,
  disableAnimatedEmoji: false,
  allowEmojiLinks: false,
  disableAutoBlockNewlines: true,
  mentionChannels: [],
  unknownUserMentionPlaceholder: true,
};

/** How each context parses: the rule set and the parse state the client passes. */
export const MARKDOWN_PRESETS = {
  /** Message content (the chat's message list). */
  message: { rules: messageRules, post: 'message', state: MESSAGE_CONTENT_CONTEXT },
  /** The reply bar's one-line preview of the replied-to message. */
  reply: {
    rules: once(() => withMentions(RULE_SETS.INLINE_REPLY_RULES, [createReactRules(DEFAULT_REACT_OPTIONS)])),
    post: 'message',
    state: { ...MESSAGE_CONTENT_CONTEXT, formatInline: true, previewLinkTarget: false },
  },
  /** Components v2 Text Displays. */
  textDisplay: {
    rules: messageRules,
    post: null,
    state: MESSAGE_CONTENT_CONTEXT,
  },
  /** Rich embed titles, and field names, of embeds without a link. */
  embedTitle: { rules: embedTitleRules, post: null, state: {} },
  /** Rich embed titles and field names of embeds with a link (the title is the link). */
  embedTitleWithoutLinks: {
    rules: once(() => omit(embedTitleRules(), [...LINK_RULES, 'channelOrMessageUrl', 'mediaPostLink'])),
    post: null,
    state: {},
  },
  /** Rich embed descriptions. */
  embedDescription: {
    rules: messageRules,
    post: null,
    state: {
      allowLinks: true,
      allowEmojiLinks: true,
      allowList: true,
      allowHeading: true,
      previewLinkTarget: true,
    },
  },
  /** Rich embed field values (no headings). */
  embedFieldValue: {
    rules: messageRules,
    post: null,
    state: {
      allowLinks: true,
      allowEmojiLinks: true,
      allowList: true,
      allowHeading: false,
      previewLinkTarget: true,
    },
  },
  /** Channel topics in the channel header. */
  channelTopic: {
    rules: once(() =>
      withMentions(
        RULE_SETS.CHANNEL_TOPIC_RULES,
        [createReactRules(topicReactOptions), { codeBlock: { react: RULES.text.react } }],
        { shouldStopPropagation: true },
      ),
    ),
    post: null,
    state: { allowLinks: true },
  },
  /** Voice channel statuses. */
  voiceChannelStatus: {
    rules: once(() =>
      withMentions(RULE_SETS.VOICE_CHANNEL_STATUS_RULES, [
        createReactRules({ ...DEFAULT_REACT_OPTIONS, enableEmojiClick: false }),
      ]),
    ),
    post: null,
    state: {},
  },
  /** Membership screening rules. */
  guildVerificationFormRule: {
    rules: once(() => withMentions(RULE_SETS.GUILD_VERIFICATION_FORM_RULES, [createReactRules(DEFAULT_REACT_OPTIONS)])),
    post: null,
    state: {},
  },
  /** Scheduled event descriptions. */
  guildEvent: { rules: guildEventRules, post: null, state: {} },
  /** Scheduled event locations. */
  guildEventLocation: { rules: once(() => omit(guildEventRules(), ['subtext'])), post: null, state: {} },
  /** Profile bios. */
  profileBio: {
    rules: once(() => mergeRules([RULE_SETS.PROFILE_BIO_RULES, createReactRules({ mustConfirmExternalLink: true })])),
    post: null,
    state: {},
  },
  /** AutoMod alert messages (the flagged word is highlighted). */
  autoModerationMessage: {
    rules: once(() =>
      withMentions(RULE_SETS.AUTO_MODERATION_SYSTEM_MESSAGE_RULES, [createReactRules(DEFAULT_REACT_OPTIONS)]),
    ),
    post: null,
    state: {},
  },
  /** Forum post guidelines. */
  forumPostGuidelines: {
    rules: once(() => omit(messageRules(), ['paragraph', 'newline'])),
    post: null,
    state: {},
  },
  /** Poll questions and answers. */
  poll: {
    rules: once(() => mergeRules([RULE_SETS.POLL_RULES, createReactRules(DEFAULT_REACT_OPTIONS)])),
    post: null,
    state: {},
  },
} satisfies Record<string, { rules: () => MarkdownRules; post: 'message' | null; state: MarkdownParseOptions }>;

export type MarkdownPreset = keyof typeof MARKDOWN_PRESETS;

/** Every rule name (`RULES` plus the AutoMod highlight). */
export const MARKDOWN_RULE_NAMES = [...Object.keys(RULES), 'highlightWord'] as readonly MarkdownRuleName[];

export type MarkdownRuleName =
  | 'newline'
  | 'paragraph'
  | 'escape'
  | 'blockQuote'
  | 'link'
  | 'autolink'
  | 'mailto'
  | 'tel'
  | 'url'
  | 'strong'
  | 'em'
  | 'u'
  | 'br'
  | 'text'
  | 'inlineCode'
  | 'emoticon'
  | 'codeBlock'
  | 'roleMention'
  | 'mention'
  | 'silentPrefix'
  | 'channelMention'
  | 'channelOrMessageUrl'
  | 'mediaPostLink'
  | 'attachmentLink'
  | 'commandMention'
  | 'timestampMentionInput'
  | 'gameMention'
  | 'emoji'
  | 'soundboard'
  | 'customEmoji'
  | 'timestamp'
  | 's'
  | 'spoiler'
  | 'staticRouteLink'
  | 'heading'
  | 'list'
  | 'subtext'
  | 'highlight'
  | 'looseEm'
  | 'highlightWord';

/**
 * Turns rules on or off by name: `{ codeBlock: false }` turns code blocks off, `{ codeBlock: true }` adds them to
 * a context that doesn't have them. An array keeps only the rules it names. Plain text always stays on, since
 * everything else falls back to it.
 */
export type MarkdownRuleToggles = Partial<Record<MarkdownRuleName, boolean>> | readonly MarkdownRuleName[];

const ruleCache = new Map<
  string,
  { rules: MarkdownRules; parse: ReturnType<typeof parserFor>; output: ReturnType<typeof reactFor> }
>();

const togglesKey = (toggles: MarkdownRuleToggles | undefined) =>
  toggles == null
    ? ''
    : Array.isArray(toggles)
      ? `[${[...toggles].sort().join(',')}]`
      : JSON.stringify(Object.entries(toggles).sort());

const allRules = once(() =>
  mergeRules([messageRules(), { highlightWord: MARKDOWN_PRESETS.autoModerationMessage.rules().highlightWord }]),
);

/** The rules a preset parses with, after the toggles. */
export const getMarkdownRules = (preset: MarkdownPreset, toggles?: MarkdownRuleToggles): MarkdownRules => {
  let rules = MARKDOWN_PRESETS[preset].rules();
  if (toggles != null) {
    if (Array.isArray(toggles)) {
      const keep = new Set<string>([...(toggles as readonly string[]), 'text']);
      rules = Object.fromEntries(Object.entries(rules).filter(([name]) => keep.has(name)));
    } else {
      rules = { ...rules };
      for (const [name, enabled] of Object.entries(toggles as Record<string, boolean | undefined>)) {
        if (enabled === false && name !== 'text') delete rules[name];
        else if (enabled === true && rules[name]?.match == null && allRules()[name] != null)
          rules[name] = allRules()[name];
      }
    }
  }
  return withLinkFallback(rules);
};

const compiled = (preset: MarkdownPreset, toggles?: MarkdownRuleToggles) => {
  const key = `${preset}:${togglesKey(toggles)}`;
  let entry = ruleCache.get(key);
  if (entry == null) {
    const rules = getMarkdownRules(preset, toggles);
    entry = {
      rules,
      parse: parserFor(rules as Rules),
      output: reactFor(ruleOutput(rules as Rules, 'react')),
    };
    if (ruleCache.size > 64) ruleCache.delete(ruleCache.keys().next().value!);
    ruleCache.set(key, entry);
  }
  return entry;
};

export interface MarkdownOptions {
  /** Which of Discord's contexts to parse like (default: message content). */
  preset?: MarkdownPreset;
  /** Rules to turn on or off. */
  rules?: MarkdownRuleToggles;
  /** The parse state (ids of the message and channel, `allowLinks`, `allowHeading`…), over the preset's. */
  context?: MarkdownParseOptions;
  /** Users, roles, channels… mentions resolve against; `<Markdown>` reads them from `MessageResolversContext`. */
  resolvers?: MessageResolvers;
  strings?: MarkdownStrings;
  /** Parse as one block of inline text (default true, like every client context). */
  inline?: boolean;
  /** Emoji-only messages get big emoji (message content only; default true). */
  allowJumboEmoji?: boolean;
}

const createState = (options: MarkdownOptions, presetState: MarkdownParseOptions): MarkdownState => ({
  ...presetState,
  ...options.context,
  resolvers: options.resolvers,
  strings: options.strings ?? DEFAULT_MARKDOWN_STRINGS,
});

const JUMBO_TYPES = new Set(['emoji', 'customEmoji', 'soundboard']);
const MAX_JUMBO_EMOJI = 30;

/** Emoji-only content (at most 30, whitespace aside) is shown big. */
export const markJumboEmoji = (nodes: ASTNode[]) => {
  if (
    nodes.some(
      (node) => !JUMBO_TYPES.has(node.type) && (typeof node.content !== 'string' || node.content.trim() !== ''),
    )
  )
    return nodes;
  let count = 0;
  nodes.forEach((node) => {
    if (JUMBO_TYPES.has(node.type)) count += 1;
  });
  if (count <= MAX_JUMBO_EMOJI)
    nodes.forEach((node) => {
      node.jumboable = true;
    });
  return nodes;
};

const INLINE_TEXT_TYPES = new Set(['strong', 'em', 'u', 'text', 'inlineCode', 's', 'spoiler']);

const joinLines = (nodes: ASTNode[]): ASTNode[] => {
  nodes.forEach((node) => {
    if (INLINE_TEXT_TYPES.has(node.type) && node.content != null) {
      if (Array.isArray(node.content)) joinLines(node.content);
      else if (typeof node.content === 'string') node.content = node.content.replace(/\n/g, ' ');
    }
  });
  return nodes;
};

const isLinkNode = (node: ASTNode) => node.type === 'link' || node.type === 'attachmentLink';

/** The message renderer's post-processing of the AST. */
const postProcessMessage = (
  ast: ASTNode[],
  inline: boolean,
  hasBailedAst: boolean,
  text: string,
  state: MarkdownState,
  allowJumboEmoji: boolean,
) => {
  let nodes = hasBailedAst ? [{ type: 'text', content: text, originalMatch: { index: 0, 0: text } }] : ast;
  if (!state.formatInline && allowJumboEmoji) {
    if (inline) nodes = markJumboEmoji(nodes);
    else if (nodes[0]?.type === 'paragraph' && Array.isArray(nodes[0].content))
      nodes[0].content = markJumboEmoji(nodes[0].content);
  }
  const onlyLinkContent = nodes.every(isLinkNode);
  nodes = nodes.filter((node) => {
    const target = node.type === 'link' ? (node.target ?? null) : null;
    return target == null || !((onlyLinkContent && containsQuestLink(target)) || containsGameServerShareLink(target));
  });
  if (state.formatInline) nodes = joinLines(nodes);
  return nodes;
};

/** Parses markdown like the client: returns the AST (after the client's post-processing). */
export const parse = (text: string, options: MarkdownOptions = {}): ASTNode[] => {
  const presetName = options.preset ?? 'message';
  const preset = MARKDOWN_PRESETS[presetName];
  const { parse: parser } = compiled(presetName, options.rules);
  const inline = options.inline ?? true;
  const state = createState(options, preset.state);
  const source = inline ? text : text + '\n\n';
  let ast: any = parser(source, { inline, ...state });
  ast = flattenAST(state, ast);
  const limited = limitAST(ast);
  ast = limited.ast;
  if (preset.post === 'message')
    ast = postProcessMessage(
      Array.isArray(ast) ? ast : [ast],
      inline,
      limited.hasBailedAst,
      text,
      state,
      options.allowJumboEmoji ?? true,
    );
  return Array.isArray(ast) ? ast : [ast];
};

/** Renders an AST from `parse` with the same options. */
export const renderAST = (ast: ASTNode[], options: MarkdownOptions = {}): ReactNode => {
  const presetName = options.preset ?? 'message';
  const { output } = compiled(presetName, options.rules);
  return output(ast, createState(options, MARKDOWN_PRESETS[presetName].state));
};

/** Parses and renders markdown to React elements. */
export const toReact = (text: string, options: MarkdownOptions = {}): ReactNode =>
  renderAST(parse(text, options), options);
