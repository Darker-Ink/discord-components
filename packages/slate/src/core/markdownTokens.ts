import { invariant } from './invariant';
import {
  RULES,
  flattenAST,
  limitAST,
  mergeRules,
  simpleMarkdown,
  textRule,
  validateLinkTarget,
  type MarkdownRules,
} from '@discord-mana/markdown/internal';
import type { EditorContextValue } from './context';

// How the chat input styles text while typing: each line runs through the same markdown rules messages use, and
// the parse tree is flattened back onto the source text as entries (a span of text plus the rule names it is
// inside, and `syntaxBefore`/`syntaxAfter` for the markup characters around it). The decorations and the
// mention-to-pill conversion both read these entries.

export interface MarkdownEntry {
  text: string;
  start: number;
  attributes: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

type RuleType =
  | { type: 'skip' }
  | { type: 'verbatim' }
  | { type: 'inlineObject' }
  | { type: 'inlineStyle'; before: string; after: string };

const RULE_TYPES: Record<string, RuleType> = {
  link: { type: 'skip' },
  highlight: { type: 'skip' },
  blockQuote: { type: 'skip' },
  codeBlock: { type: 'skip' },
  list: { type: 'skip' },
  heading: { type: 'skip' },
  channelOrMessageUrl: { type: 'skip' },
  mediaPostLink: { type: 'skip' },
  attachmentLink: { type: 'skip' },
  newline: { type: 'verbatim' },
  br: { type: 'verbatim' },
  paragraph: { type: 'verbatim' },
  text: { type: 'verbatim' },
  emoticon: { type: 'verbatim' },
  mention: { type: 'inlineObject' },
  roleMention: { type: 'inlineObject' },
  commandMention: { type: 'inlineObject' },
  channelMention: { type: 'inlineObject' },
  gameMention: { type: 'inlineObject' },
  silentPrefix: { type: 'inlineStyle', before: '@silent', after: ' ' },
  emoji: { type: 'inlineObject' },
  customEmoji: { type: 'inlineObject' },
  looseEm: { type: 'inlineStyle', before: '*', after: ' *' },
  autolink: { type: 'inlineStyle', before: '<', after: '>' },
  mailto: { type: 'inlineStyle', before: '<', after: '>' },
  tel: { type: 'inlineStyle', before: '<', after: '>' },
  strong: { type: 'inlineStyle', before: '**', after: '**' },
  u: { type: 'inlineStyle', before: '__', after: '__' },
  s: { type: 'inlineStyle', before: '~~', after: '~~' },
  escape: { type: 'inlineStyle', before: '\\', after: '' },
  staticRouteLink: { type: 'inlineStyle', before: '<id:', after: '>' },
  soundboard: { type: 'inlineStyle', before: '<sound:', after: '>' },
  spoiler: { type: 'inlineStyle', before: '||', after: '||' },
  url: { type: 'inlineStyle', before: '', after: '' },
  codeBlockText: { type: 'inlineStyle', before: '', after: '' },
  codeBlockSyntax: { type: 'inlineStyle', before: '', after: '' },
  codeBlockLang: { type: 'inlineStyle', before: '', after: '' },
  timestamp: { type: 'inlineObject' },
  timestampMentionInput: { type: 'inlineObject' },
  em: { type: 'inlineStyle', before: '*', after: '*' },
  inlineCode: { type: 'inlineStyle', before: '`', after: '`' },
  subtext: { type: 'inlineStyle', before: '-# ', after: '' },
};

const EDGE = new Set(['start', 'end']);
// Rules whose markup characters take the rule's own styling at these edges (the strikethrough runs through the
// `~~`, the code background covers the backticks), also when nested content starts or ends with one.
const STYLED_SYNTAX_EDGES = new Map<string, Set<string>>([
  ['inlineCode', EDGE],
  ['spoiler', EDGE],
  ['s', EDGE],
  ['subtext', new Set(['start'])],
  ['u', EDGE],
]);
const ESCAPABLE = new Set(['*', '_', '~', '|', '\\']);
const LANGUAGE_RE = /^[a-z0-9_+\-.#]+$/i;
const SUBTEXT_RE = /(-# +)/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRule = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = Record<string, any>;

const withOriginalMatch = (rule: AnyRule): AnyRule => {
  invariant(rule.parse != null, 'Slate: rule must have a parse function');
  const parse = rule.parse;
  return {
    ...rule,
    parse(this: unknown, capture: unknown, nestedParse: unknown, state: unknown) {
      const node = parse.call(this, capture, nestedParse, state);
      if (!(node instanceof Array)) node.originalMatch = capture;
      return node;
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autolinkNode = (capture: any) => ({ type: 'autolink', content: capture[1], originalMatch: capture });

const OVERRIDES: MarkdownRules = {
  url: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse: (capture: any) =>
      validateLinkTarget(capture[1]) == null
        ? { type: 'text', content: capture[0], originalMatch: capture }
        : { type: 'link', content: capture[1], originalMatch: capture },
  },
  autolink: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse: (capture: any) =>
      validateLinkTarget(capture[1]) == null
        ? { type: 'text', content: capture[0], originalMatch: capture }
        : autolinkNode(capture),
  },
  mailto: { parse: autolinkNode },
  tel: { parse: autolinkNode },
  codeBlockSyntax: {
    order: simpleMarkdown.defaultRules.inlineCode.order - 0.1,
    match: (source: string) => /^(```)([a-z0-9_+\-.#]+$)?/.exec(source),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse: (capture: any) =>
      capture[2] != null && capture[2] !== '' && LANGUAGE_RE.test(capture[2])
        ? [
            { type: 'codeBlockSyntax', content: capture[1], originalMatch: capture },
            { type: 'codeBlockLang', content: capture[2], originalMatch: capture },
          ]
        : { type: 'codeBlockSyntax', content: capture[0], originalMatch: capture },
  },
};

interface Parsers {
  /** With mentions and emoji as objects (the mention plugin). */
  full: (source: string, inline: boolean, state: object) => ASTNode[];
  /** Without inline objects (decorations; pills are already voids). */
  styles: (source: string, inline: boolean, state: object) => ASTNode[];
  fullCache: LRU<MarkdownEntry[]>;
  stylesCache: LRU<MarkdownEntry[]>;
}

class LRU<T> {
  private map = new Map<string, { value: T; at: number }>();
  constructor(
    private max: number,
    private maxAge: number,
  ) {}
  get(key: string) {
    const hit = this.map.get(key);
    if (hit == null) return undefined;
    this.map.delete(key);
    if (Date.now() - hit.at > this.maxAge) return undefined;
    hit.at = Date.now();
    this.map.set(key, hit);
    return hit.value;
  }
  set(key: string, value: T) {
    this.map.delete(key);
    this.map.set(key, { value, at: Date.now() });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
}

// The client's `astParserFor`: simple-markdown's parser plus its AST flattening and node limit.
const astParserFor = (rules: MarkdownRules) => {
  const parse = simpleMarkdown.parserFor(rules as simpleMarkdown.Rules);
  return (source: string, inline: boolean, state: object): ASTNode[] => {
    if (!inline) source += '\n\n';
    const ast = flattenAST(state, parse(source, { inline, ...state }));
    return limitAST(ast).ast;
  };
};

const parserCache = new WeakMap<MarkdownRules, Parsers>();

const getParsers = (rules: MarkdownRules): Parsers => {
  const cached = parserCache.get(rules);
  if (cached != null) return cached;
  const full: MarkdownRules = {};
  const styles: MarkdownRules = {};
  for (const name in rules) {
    if (!(name in RULE_TYPES))
      throw Error(
        `Slate: Unknown markdown rule: ${name}.  If you have just added a new markdown rule then you probably need to add it to this file so that the rich chat box understands it.`,
      );
    const { type } = RULE_TYPES[name];
    if (type !== 'skip') full[name] = withOriginalMatch(rules[name]);
    if (type !== 'skip' && type !== 'inlineObject')
      styles[name] = withOriginalMatch(name === 'text' ? textRule : rules[name]);
  }
  const parsers: Parsers = {
    full: astParserFor(mergeRules([full, OVERRIDES])),
    styles: astParserFor(mergeRules([styles, OVERRIDES])),
    fullCache: new LRU(250, 60_000),
    stylesCache: new LRU(250, 60_000),
  };
  parserCache.set(rules, parsers);
  return parsers;
};

const skipSpaces = (source: string, position: number) => {
  while (source.charAt(position) === '\n' || source.charAt(position) === ' ') position++;
  return position;
};

const recoverOrThrow = (message: string, text: string, position: number) => {
  if (text.split('').some((char) => ESCAPABLE.has(char))) {
    console.error(message);
    return position;
  }
  throw Error(message);
};

const pushSyntax = (
  result: MarkdownEntry[],
  source: string,
  syntax: string,
  position: number,
  attributes: string[],
): number => {
  if (syntax.length > 0) {
    const index = source.indexOf(syntax, position);
    if (index === -1)
      return recoverOrThrow(
        `Slate: Unable to find syntax characters "${syntax}" at position ${position}`,
        syntax,
        position,
      );
    const text = source.substring(position, index + syntax.length);
    result.push({ text, attributes: [...attributes], start: position, data: null });
    position = index + syntax.length;
  }
  return position;
};

// Escapes and stray markup characters before content the parser consumed become plain syntax entries.
const skipStraySyntax = (result: MarkdownEntry[], source: string, position: number, until: number) => {
  while (position < until) {
    if (ESCAPABLE.has(source[position])) {
      position = pushSyntax(result, source, source[position], position, ['syntaxBefore']);
      position = skipSpaces(source, position);
    } else break;
  }
  return position;
};

const pushText = (
  result: MarkdownEntry[],
  source: string,
  text: string,
  originalStart: number,
  attributes: string[],
  data: unknown,
) => {
  let start = skipSpaces(source, originalStart);
  while (text.charAt(0) === '\n' || text.charAt(0) === ' ') text = text.substring(1);
  let index = source.indexOf(text, start);
  if (index !== start) start = originalStart = skipStraySyntax(result, source, start, index);
  else if (text === '\\' && source.charAt(index + 1) === '\\') {
    index++;
    originalStart = ++start;
  }
  if (index !== start)
    return recoverOrThrow(
      `Slate: Unable to find content in source text at start position ${start} for text position ${index}`,
      text,
      originalStart,
    );
  const end = start + text.length;
  result.push({
    text: source.substring(originalStart, end),
    attributes: attributes.slice(),
    start: originalStart,
    data,
  });
  return end;
};

const isBlank = (node: ASTNode) =>
  node.type === 'text' && typeof node.content === 'string' && node.content.trim() === '';

const hasStyledSyntax = (type: string, edge: string) => STYLED_SYNTAX_EDGES.get(type)?.has(edge) ?? false;

const startsOrEndsWithStyledSyntax = (content: unknown, edge: string, depth: number) => {
  let node = content;
  for (let i = 0; i < depth && node != null && typeof node !== 'string'; i++) {
    const nodes = (node instanceof Array ? node : [node]) as ASTNode[];
    let found: ASTNode | undefined;
    if (edge === 'start') found = nodes.find((n) => !isBlank(n));
    else for (let j = nodes.length - 1; j >= 0 && found == null; j--) if (!isBlank(nodes[j])) found = nodes[j];
    if (found == null) break;
    if (hasStyledSyntax(found.type, edge)) return true;
    node = found.content;
  }
  return false;
};

const syntaxAttributes = (
  attribute: 'syntaxBefore' | 'syntaxAfter',
  content: unknown,
  current: string[],
  sourceLength: number,
  type: string,
) => {
  const prefix = attribute === 'syntaxBefore' ? 'before' : 'after';
  const edge = attribute === 'syntaxBefore' ? 'start' : 'end';
  return hasStyledSyntax(type, edge) || startsOrEndsWithStyledSyntax(content, edge, sourceLength)
    ? [attribute, ...[...current, type].map((name) => `${prefix}_${name}`)]
    : [attribute];
};

const syntaxFor = (type: string, capture: ASTNode) => {
  if (type === 'inlineCode') return { before: capture[1], after: capture[1] };
  if (type === 'em' && capture[0].startsWith('_')) return { before: '_', after: '_' };
  if (type === 'subtext') return { before: SUBTEXT_RE.exec(capture.input)![1], after: '' };
  const rule = RULE_TYPES[type === 'link' ? 'url' : type];
  if (rule.type === 'inlineStyle') return rule;
  throw Error('Slate: rule must be an inlineStyle');
};

const visitContent = (
  result: MarkdownEntry[],
  source: string,
  content: unknown,
  position: number,
  attributes: string[],
): number => {
  if (typeof content === 'string') position = pushText(result, source, content, position, attributes, null);
  else {
    const nodes = (content instanceof Array ? content : [content]) as ASTNode[];
    for (const node of nodes) position = visitNode(result, source, node, position, attributes);
  }
  return skipSpaces(source, position);
};

const visitNode = (
  result: MarkdownEntry[],
  source: string,
  node: ASTNode,
  position: number,
  attributes: string[],
): number => {
  const { content, type } = node;
  const bailedOut = node.originalMatch == null && type === 'text' && typeof content === 'string';
  if (bailedOut)
    console.warn(`Slate: parser bailed out past MAX_PARSE_DEPTH, rendering ${content.length} chars as plain text`);
  const capture = bailedOut ? [content] : node.originalMatch;
  invariant(capture != null, 'Slate: originalMatch must be set ' + JSON.stringify(node, undefined, 2));
  switch (type) {
    case 'newline':
    case 'br':
    case 'paragraph':
    case 'text':
    case 'emoticon':
      return visitContent(result, source, content || '', position, attributes);
    case 'emoji':
    case 'customEmoji':
      if (!source.startsWith(capture[0], position)) position = skipStraySyntax(result, source, position, source.length);
      if (source.startsWith(capture[0], position)) return pushText(result, source, capture[0], position, [type], node);
      throw Error(`Slate: Unable to find emoji: ${capture[0]} in ${source} at ${position}`);
    case 'soundboard':
      return pushText(result, source, capture[0], position, [type], { guildId: node.guildId, soundId: node.soundId });
    case 'mention':
    case 'roleMention':
    case 'channelMention':
    case 'commandMention':
    case 'silentPrefix':
    case 'channel': {
      const { text, id } = node;
      if (text != null) {
        invariant(text === capture[0], 'Slate: text mentions must exactly match the regex match');
        return pushText(result, source, text, position, ['textMention'], { text });
      }
      return pushText(result, source, capture[0], position, [type], { id });
    }
    case 'staticRouteLink':
      return pushText(result, source, capture[0], position, [type], { id: node.id, itemId: node.itemId });
    case 'gameMention':
      return pushText(result, source, capture[0], position, [type], { id: node.gameId });
    case 'timestamp':
    case 'timestampMentionInput':
      return pushText(result, source, capture[0], position, [type], node);
    case 'em':
    case 'autolink':
    case 'mailto':
    case 'tel':
    case 'strong':
    case 'u':
    case 's':
    case 'escape':
    case 'inlineCode':
    case 'codeBlockSyntax':
    case 'codeBlockLang':
    case 'spoiler':
    case 'url':
    case 'link':
    case 'subtext': {
      position = skipSpaces(source, position);
      const { before, after } = syntaxFor(type, capture);
      const beforeAttributes = syntaxAttributes('syntaxBefore', content, attributes, source.length, type);
      const afterAttributes = syntaxAttributes('syntaxAfter', content, attributes, source.length, type);
      position = pushSyntax(result, source, before, position, beforeAttributes);
      attributes.push(type);
      position = visitContent(result, source, content ?? '', position, attributes);
      attributes.pop();
      position = pushSyntax(result, source, after, position, afterAttributes);
      return skipSpaces(source, position);
    }
    default:
      throw Error(`Slate: Unknown rule type: ${type}`);
  }
};

const mergeAdjacent = (entries: MarkdownEntry[]) => {
  entries = entries.filter((entry) => entry.text.length > 0);
  if (entries.length === 0) return entries;
  const merged = [entries[0]];
  for (let i = 1; i < entries.length; i++) {
    const previous = merged[merged.length - 1];
    const entry = entries[i];
    if (
      entry.start === previous.start + previous.text.length &&
      previous.data == null &&
      entry.data == null &&
      previous.attributes.join('-') === entry.attributes.join('-')
    )
      previous.text += entry.text;
    else merged.push(entry);
  }
  return merged;
};

const tokenize = (context: EditorContextValue, text: string, forDecorations: boolean): MarkdownEntry[] => {
  const parsers = getParsers(context.rules ?? RULES);
  const cache = forDecorations ? parsers.stylesCache : parsers.fullCache;
  const cached = cache.get(text);
  if (cached != null) return cached;
  const result: MarkdownEntry[] = [];
  const source =
    text
      .replace(/\r\n/g, ' \n')
      .replace(/[\r\f]/g, ' ')
      .replace(/\t/g, ' ') + '\n\n';
  const root = {
    originalMatch: { index: 0, 0: '' },
    type: 'paragraph',
    content: (forDecorations ? parsers.styles : parsers.full)(source, true, {
      returnMentionIds: true,
      disableAutoBlockNewlines: true,
      guildId: context.guildId ?? null,
      channelId: context.channelId ?? null,
      isSlate: true,
      allowGameMentions: true,
      allowTimeMentionInput: true,
      resolvers: context.resolvers,
    }),
  };
  visitNode(result, source, root, 0, []);
  const entries = mergeAdjacent(result);
  cache.set(text, entries);
  return entries;
};

/**
 * Entries for one block's text. Code fences split the text: what is between an opening and closing fence is
 * `codeBlockText`, the rest goes through the markdown rules.
 */
export const markdownEntries = (
  context: EditorContextValue,
  text: string,
  wasInCodeBlock: boolean,
  forDecorations: boolean,
): MarkdownEntry[] => {
  const fences: number[] = [];
  const fenceRe = /\\|```/g;
  let match;
  while ((match = fenceRe.exec(text)) != null) {
    if (match[0] === '\\') {
      fenceRe.lastIndex += 1;
      continue;
    }
    fences.push(match.index);
  }
  fences.push(text.length);
  if (fences.length === 1 && wasInCodeBlock) return [];
  let start = 0;
  let inCode = wasInCodeBlock;
  const entries: MarkdownEntry[] = [];
  for (let end of fences) {
    if (inCode)
      entries.push({ text: text.substring(start, end), start, attributes: ['codeBlockText'], data: undefined });
    else {
      const rest = end === fences[fences.length - 2] ? text.substring(end + 3) : '';
      end += 3 + (rest.match(LANGUAGE_RE) != null ? rest : '').length;
      const chunk = text.substring(start, end);
      if (chunk !== '')
        for (const entry of tokenize(context, chunk, forDecorations))
          entries.push({ ...entry, start: entry.start + start });
    }
    inCode = !inCode;
    start = end;
  }
  return entries;
};
