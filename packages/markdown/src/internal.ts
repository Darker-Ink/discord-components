// The parser internals the chat input's live markdown decorations reuse (Slate): the rule maps and
// simple-markdown itself. Not a stable public API.
export * as simpleMarkdown from './simpleMarkdown';
export { RULES, RULE_SETS, linkRule, mergeRules, textRule, type MarkdownRule, type MarkdownRules } from './rules';
export { validateLinkTarget, sanitizeLinkText, containsDiscordLinks } from './links';
export { flattenAST, limitAST } from './ast';
export { createReactRules, mentionReactRule, withStoppedPropagation, type ReactRuleOptions } from './reactRules';
export * from './emoji/emojiUtils';
export { getLookup, CHANNEL_TYPES } from './state';
export { parseAnsi, ansiStyle, createAnsiPalette, ANSI_COLORS, type AnsiSegment, type AnsiColor } from './ansi';
export { highlightCode, loadCodeGrammar, isHighlightable } from './highlight';
export { default as codeHighlightStyles } from './components/CodeHighlight.module.css';
