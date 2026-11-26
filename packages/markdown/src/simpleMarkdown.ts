/* eslint-disable @typescript-eslint/no-explicit-any */
import { createElement, type ReactNode } from 'react';

// Discord's fork of simple-markdown: upstream 0.7 with the client's patches (rules may declare the characters
// they can start with, which the parser uses to skip rules that can't match; a recursion limit; lookbehind
// regexes turned off for `em`). Only the React output is kept.

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export type AST = ASTNode | ASTNode[];

export interface ParseState {
  inline?: boolean;
  prevCapture?: RegExpExecArray | Capture | null;
  _parseDepth?: number;
  _list?: boolean;
  _defs?: Record<string, { target: string; title?: string }>;
  _refs?: Record<string, ASTNode[]>;
  disableAutoBlockNewlines?: boolean;
  key?: string | number;
  [key: string]: any;
}

/** A regex match, or a match-like array a rule builds itself. */
export type Capture = (RegExpExecArray | (string[] & { index?: number; input?: string })) & Record<string, any>;

export type Parser = ((source: string, state: ParseState) => ASTNode[]) & { rules?: Rules };

export type MatchFunction = ((source: string, state: ParseState, prevCapture: string) => Capture | null | undefined) & {
  regex?: RegExp;
};

export type ParseFunction = (capture: Capture, parse: Parser, state: ParseState) => any;

export type ReactOutput = (node: AST, state: ParseState) => ReactNode;

export type ReactNodeOutput = (node: ASTNode, output: ReactOutput, state: ParseState) => ReactNode;

export interface Rule {
  order: number;
  match: MatchFunction;
  parse: ParseFunction;
  quality?: (capture: Capture, state: ParseState, prevCapture: string) => number;
  requiredFirstCharacters?: string[];
  react?: ReactNodeOutput | null;
}

export type Rules = Record<string, Partial<Rule> & { [key: string]: any }>;

const CR_NEWLINE_R = /\r\n?/g;
const TAB_R = /\t/g;
const FORMFEED_R = /\f/g;

export const preprocess = (source: string) =>
  source.replace(CR_NEWLINE_R, '\n').replace(FORMFEED_R, '').replace(TAB_R, '    ');

const populateInitialState = (given: ParseState | undefined, defaults: ParseState | undefined) => {
  const state = given || {};
  if (defaults != null) {
    for (const key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) state[key] = defaults[key];
    }
  }
  return state;
};

export const parserFor = (rules: Rules, defaultState?: ParseState) => {
  const ruleList = Object.keys(rules).filter((type) => {
    const rule = rules[type];
    if (rule == null || rule.match == null) return false;
    const order = rule.order;
    if ((typeof order !== 'number' || !isFinite(order)) && typeof console !== 'undefined') {
      console.warn('simple-markdown: Invalid order for rule `' + type + '`: ' + String(order));
    }
    return true;
  });

  ruleList.sort((typeA, typeB) => {
    const ruleA = rules[typeA];
    const ruleB = rules[typeB];
    const orderA = ruleA.order!;
    const orderB = ruleB.order!;
    if (orderA !== orderB) return orderA - orderB;
    const secondaryOrderA = ruleA.quality ? 0 : 1;
    const secondaryOrderB = ruleB.quality ? 0 : 1;
    if (secondaryOrderA !== secondaryOrderB) return secondaryOrderA - secondaryOrderB;
    return typeA < typeB ? -1 : typeA > typeB ? 1 : 0;
  });

  // Rules that declare their first characters are only tried when the source starts with one of them.
  const rulesByFirstChar = new Map<number, string[]>();
  const anyCharRules: string[] = [];
  for (const type of ruleList) {
    const chars = rules[type].requiredFirstCharacters;
    if (chars == null) anyCharRules.push(type);
    else
      chars.forEach((char) => {
        const code = char.charCodeAt(0);
        if (!rulesByFirstChar.has(code)) rulesByFirstChar.set(code, []);
        rulesByFirstChar.get(code)!.push(type);
      });
  }

  let latestState: ParseState;

  const nestedParse: Parser = (source: string, state?: ParseState) => {
    const result: ASTNode[] = [];
    state = state || latestState;
    latestState = state;
    const depth = (state._parseDepth ?? 0) + 1;
    if (depth > 1000) {
      if (source) result.push({ type: 'text', content: source });
      return result;
    }
    state = Object.assign({}, state, { _parseDepth: depth });
    latestState = state;
    while (source) {
      let ruleType: string | null = null;
      let rule: Partial<Rule> | null = null;
      let capture: Capture | null = null;
      let quality = -100000;
      let currOrder = 100000;
      const candidates = [rulesByFirstChar.get(source.charCodeAt(0)), anyCharRules];
      for (const list of candidates) {
        if (list == null) continue;
        for (const currRuleType of list) {
          const currRule = rules[currRuleType];
          const currRuleOrder = currRule.order!;
          if (currRuleOrder > currOrder) break;
          const prevCaptureStr = state.prevCapture == null ? '' : state.prevCapture[0];
          const currCapture = currRule.match!(source, state, prevCaptureStr);
          if (currCapture) {
            const currQuality = currRule.quality ? currRule.quality(currCapture, state, prevCaptureStr) : 0;
            if (currRuleOrder < currOrder || currQuality > quality) {
              ruleType = currRuleType;
              rule = currRule;
              capture = currCapture;
              quality = currQuality;
              currOrder = currRuleOrder;
            }
          }
        }
      }
      if (rule == null || capture == null) {
        throw new Error(
          'Could not find a matching rule for the below content. The rule with highest `order` should always match ' +
            "content provided to it. Check the definition of `match` for '" +
            ruleList[ruleList.length - 1] +
            "'. It seems to not match the following source:\n" +
            source,
        );
      }
      if (capture.index) {
        throw new Error(
          '`match` must return a capture starting at index 0 (the current parse index). Did you forget a ^ at the ' +
            'start of the RegExp?',
        );
      }
      const parsed = rule.parse!(capture, nestedParse, state);
      if (Array.isArray(parsed)) Array.prototype.push.apply(result, parsed);
      else {
        if (parsed.type == null) parsed.type = ruleType;
        result.push(parsed);
      }
      state.prevCapture = capture;
      source = source.substring(state.prevCapture[0].length);
    }
    return result;
  };

  const outerParse = (source: string, state?: ParseState) => {
    latestState = populateInitialState(state, defaultState);
    if (!latestState.inline && !latestState.disableAutoBlockNewlines) source = source + '\n\n';
    latestState.prevCapture = null;
    return nestedParse(preprocess(source), latestState);
  };

  nestedParse.rules = rules;
  outerParse.rules = rules;
  return outerParse as Parser;
};

export const inlineRegex = (regex: RegExp): MatchFunction => {
  const match: MatchFunction = (source, state) => (state.inline ? regex.exec(source) : null);
  match.regex = regex;
  return match;
};

export const blockRegex = (regex: RegExp): MatchFunction => {
  const match: MatchFunction = (source, state) => (state.inline ? null : regex.exec(source));
  match.regex = regex;
  return match;
};

export const anyScopeRegex = (regex: RegExp): MatchFunction => {
  const match: MatchFunction = (source) => regex.exec(source);
  match.regex = regex;
  return match;
};

// simple-markdown builds elements by hand; createElement produces the same elements.
export const reactElement = (type: string, key: string | number | null | undefined, props: Record<string, any>) => {
  const { children, ...rest } = props;
  return createElement(type, { ...rest, key: key == null ? undefined : key }, children);
};

const EMPTY_PROPS = {};

export const sanitizeUrl = (url: string | null | undefined) => {
  if (url == null) return null;
  try {
    const protocol = new URL(url, 'https://localhost').protocol;
    if (protocol.indexOf('javascript:') === 0 || protocol.indexOf('vbscript:') === 0 || protocol.indexOf('data:') === 0)
      return null;
  } catch {
    return null;
  }
  return url;
};

const SANITIZE_TEXT_R = /[<>&"']/g;
const SANITIZE_TEXT_CODES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

export const sanitizeText = (text: unknown) => String(text).replace(SANITIZE_TEXT_R, (chr) => SANITIZE_TEXT_CODES[chr]);

const UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;

export const unescapeUrl = (rawUrlString: string) => rawUrlString.replace(UNESCAPE_URL_R, '$1');

export const parseInline = (parse: Parser, content: string, state: ParseState) => {
  const isCurrentlyInline = state.inline || false;
  state.inline = true;
  const result = parse(content, state);
  state.inline = isCurrentlyInline;
  return result;
};

export const parseBlock = (parse: Parser, content: string, state: ParseState) => {
  const isCurrentlyInline = state.inline || false;
  state.inline = false;
  const result = parse(content + '\n\n', state);
  state.inline = isCurrentlyInline;
  return result;
};

const parseCaptureInline: ParseFunction = (capture, parse, state) => ({
  content: parseInline(parse, capture[1], state),
});

const ignoreCapture = () => ({});

const LIST_BULLET = '(?:[*+-]|\\d+\\.)';
const LIST_ITEM_PREFIX = '( *)(' + LIST_BULLET + ') +';
const LIST_ITEM_PREFIX_R = new RegExp('^' + LIST_ITEM_PREFIX);
const LIST_ITEM_R = new RegExp(LIST_ITEM_PREFIX + '[^\\n]*(?:\\n(?!\\1' + LIST_BULLET + ' )[^\\n]*)*(\n|$)', 'gm');
const BLOCK_END_R = /\n{2,}$/;
const INLINE_CODE_ESCAPE_BACKTICKS_R = /^ (?= *`)|(` *) $/g;
const LIST_BLOCK_END_R = BLOCK_END_R;
const LIST_ITEM_END_R = / *\n+$/;
const LIST_R = new RegExp(
  '^( *)(' + LIST_BULLET + ') [\\s\\S]+?(?:\n{2,}(?! )(?!\\1' + LIST_BULLET + ' )\\n*|\\s*\n*$)',
);
const LIST_LOOKBEHIND_R = /(?:^|\n)( *)$/;

const TABLES = (() => {
  const TABLE_ROW_SEPARATOR_TRIM = /^ *\| *| *\| *$/g;
  const TABLE_CELL_END_TRIM = / *$/;
  const TABLE_RIGHT_ALIGN = /^ *-+: *$/;
  const TABLE_CENTER_ALIGN = /^ *:-+: *$/;
  const TABLE_LEFT_ALIGN = /^ *:-+ *$/;
  const parseTableAlignCapture = (alignCapture: string) =>
    TABLE_RIGHT_ALIGN.test(alignCapture)
      ? 'right'
      : TABLE_CENTER_ALIGN.test(alignCapture)
        ? 'center'
        : TABLE_LEFT_ALIGN.test(alignCapture)
          ? 'left'
          : null;
  const parseTableAlign = (source: string, trimEndSeparators: boolean) => {
    if (trimEndSeparators) source = source.replace(TABLE_ROW_SEPARATOR_TRIM, '');
    return source.trim().split('|').map(parseTableAlignCapture);
  };
  const parseTableRow = (source: string, parse: Parser, state: ParseState, trimEndSeparators: boolean) => {
    const prevInTable = state.inTable;
    state.inTable = true;
    const tableRow = parse(source.trim(), state);
    state.inTable = prevInTable;
    const cells: ASTNode[][] = [[]];
    tableRow.forEach((node, i) => {
      if (node.type === 'tableSeparator') {
        if (!trimEndSeparators || (i !== 0 && i !== tableRow.length - 1)) cells.push([]);
      } else {
        if (node.type === 'text' && (tableRow[i + 1] == null || tableRow[i + 1].type === 'tableSeparator'))
          node.content = node.content.replace(TABLE_CELL_END_TRIM, '');
        cells[cells.length - 1].push(node);
      }
    });
    return cells;
  };
  const parseTableCells = (source: string, parse: Parser, state: ParseState, trimEndSeparators: boolean) =>
    source
      .trim()
      .split('\n')
      .map((rowText) => parseTableRow(rowText, parse, state, trimEndSeparators));
  const parseTable =
    (trimEndSeparators: boolean): ParseFunction =>
    (capture, parse, state) => {
      state.inline = true;
      const header = parseTableRow(capture[1], parse, state, trimEndSeparators);
      const align = parseTableAlign(capture[2], trimEndSeparators);
      const cells = parseTableCells(capture[3], parse, state, trimEndSeparators);
      state.inline = false;
      return { type: 'table', header, align, cells };
    };
  return {
    parseTable: parseTable(true),
    parseNpTable: parseTable(false),
    TABLE_REGEX: /^ *(\|.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/,
    NPTABLE_REGEX: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  };
})();

const LINK_INSIDE = '(?:\\[[^\\]]*\\]|[^\\[\\]]|\\](?=[^\\[]*\\]))*';
const LINK_HREF_AND_TITLE = '\\s*<?((?:\\([^)]*\\)|[^\\s\\\\()]|\\\\.)*?)>?(?:\\s+[\'"]([\\s\\S]*?)[\'"])?\\s*';
const AUTOLINK_MAILTO_CHECK_R = /mailto:/i;

const parseRef = (capture: Capture, state: ParseState, refNode: ASTNode) => {
  const ref = (capture[2] || capture[1]).replace(/\s+/g, ' ').toLowerCase();
  if (state._defs && state._defs[ref]) {
    const def = state._defs[ref];
    refNode.target = def.target;
    refNode.title = def.title;
  }
  state._refs = state._refs || {};
  state._refs[ref] = state._refs[ref] || [];
  state._refs[ref].push(refNode);
  return refNode;
};

// The client turns lookbehind support off, so `em` always uses the regex without it.
const SUPPORTS_LOOKBEHIND = false;

let currOrder = 0;

export const defaultRules = {
  Array: {
    react: (arr: ASTNode[], output: ReactOutput, state: ParseState) => {
      const oldKey = state.key;
      const result: ReactNode[] = [];
      for (let i = 0; i < arr.length; i++) {
        state.key = '' + i;
        let node = arr[i];
        if (node.type === 'text') {
          node = { type: 'text', content: node.content };
          for (; i + 1 < arr.length && arr[i + 1].type === 'text'; i++) node.content += arr[i + 1].content;
        }
        result.push(output(node, state));
      }
      state.key = oldKey;
      return result;
    },
  },
  heading: {
    order: currOrder++,
    match: blockRegex(/^ *(#{1,6})([^\n]+?)#* *(?:\n *)+\n/),
    parse: (capture: Capture, parse: Parser, state: ParseState) => ({
      level: capture[1].length,
      content: parseInline(parse, capture[2].trim(), state),
    }),
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('h' + node.level, state.key, { children: output(node.content, state) }),
  },
  nptable: { order: currOrder++, match: blockRegex(TABLES.NPTABLE_REGEX), parse: TABLES.parseNpTable, react: null },
  lheading: {
    order: currOrder++,
    match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
    parse: (capture: Capture, parse: Parser, state: ParseState) => ({
      type: 'heading',
      level: capture[2] === '=' ? 1 : 2,
      content: parseInline(parse, capture[1], state),
    }),
    react: null,
  },
  hr: {
    order: currOrder++,
    match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
    parse: ignoreCapture,
    react: (_node: ASTNode, _output: ReactOutput, state: ParseState) => reactElement('hr', state.key, EMPTY_PROPS),
  },
  codeBlock: {
    order: currOrder++,
    match: blockRegex(/^(?: {4}[^\n]+\n*)+(?:\n *)+\n/),
    parse: (capture: Capture) => ({
      lang: undefined,
      content: capture[0].replace(/^ {4}/gm, '').replace(/\n+$/, ''),
    }),
    react: (node: ASTNode, _output: ReactOutput, state: ParseState) => {
      const className = node.lang ? 'markdown-code-' + node.lang : undefined;
      return reactElement('pre', state.key, {
        children: reactElement('code', null, { className, children: node.content }),
      });
    },
  },
  fence: {
    order: currOrder++,
    match: blockRegex(/^ *(`{3,}|~{3,}) *(?:(\S+) *)?\n([\s\S]+?)\n?\1 *(?:\n *)+\n/),
    parse: (capture: Capture) => ({ type: 'codeBlock', lang: capture[2] || undefined, content: capture[3] }),
    react: null,
  },
  blockQuote: {
    order: currOrder++,
    match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
    parse: (capture: Capture, parse: Parser, state: ParseState) => ({
      content: parse(capture[0].replace(/^ *> ?/gm, ''), state),
    }),
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('blockquote', state.key, { children: output(node.content, state) }),
  },
  list: {
    order: currOrder++,
    match: (source: string, state: ParseState) => {
      const prevCaptureStr = state.prevCapture == null ? '' : state.prevCapture[0];
      const isStartOfLineCapture = LIST_LOOKBEHIND_R.exec(prevCaptureStr);
      const isListBlock = state._list || !state.inline;
      if (isStartOfLineCapture && isListBlock) {
        source = isStartOfLineCapture[1] + source;
        return LIST_R.exec(source);
      }
      return null;
    },
    parse: (capture: Capture, parse: Parser, state: ParseState) => {
      const bullet = capture[2];
      const ordered = bullet.length > 1;
      const start = ordered ? +bullet : undefined;
      const items = capture[0].replace(LIST_BLOCK_END_R, '\n').match(LIST_ITEM_R)!;
      let lastItemWasAParagraph = false;
      return {
        ordered,
        start,
        items: items.map((item: string, i: number) => {
          const prefixCapture = LIST_ITEM_PREFIX_R.exec(item);
          const space = prefixCapture ? prefixCapture[0].length : 0;
          const spaceRegex = new RegExp('^ {1,' + space + '}', 'gm');
          const content = item.replace(spaceRegex, '').replace(LIST_ITEM_PREFIX_R, '');
          const isLastItem = i === items.length - 1;
          const containsBlocks = content.indexOf('\n\n') !== -1;
          const thisItemIsAParagraph = containsBlocks || (isLastItem && lastItemWasAParagraph);
          lastItemWasAParagraph = thisItemIsAParagraph;
          const oldStateInline = state.inline;
          const oldStateList = state._list;
          state._list = true;
          let adjustedContent;
          if (thisItemIsAParagraph) {
            state.inline = false;
            adjustedContent = content.replace(LIST_ITEM_END_R, '\n\n');
          } else {
            state.inline = true;
            adjustedContent = content.replace(LIST_ITEM_END_R, '');
          }
          const result = parse(adjustedContent, state);
          state.inline = oldStateInline;
          state._list = oldStateList;
          return result;
        }),
      };
    },
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement(node.ordered ? 'ol' : 'ul', state.key, {
        start: node.start,
        children: node.items.map((item: ASTNode[], i: number) =>
          reactElement('li', '' + i, { children: output(item, state) }),
        ),
      }),
  },
  def: {
    order: currOrder++,
    match: blockRegex(/^ *\[([^\]]+)\]: *<?([^\s>]*)>?(?: +["(]([^\n]+)[")])? *\n(?: *\n)*/),
    parse: (capture: Capture, _parse: Parser, state: ParseState) => {
      const def = capture[1].replace(/\s+/g, ' ').toLowerCase();
      const target = capture[2];
      const title = capture[3];
      if (state._refs && state._refs[def]) {
        state._refs[def].forEach((refNode) => {
          refNode.target = target;
          refNode.title = title;
        });
      }
      state._defs = state._defs || {};
      state._defs[def] = { target, title };
      return { def, target, title };
    },
    react: () => null,
  },
  table: {
    order: currOrder++,
    match: blockRegex(TABLES.TABLE_REGEX),
    parse: TABLES.parseTable,
    react: (node: ASTNode, output: ReactOutput, state: ParseState) => {
      const getStyle = (colIndex: number) => (node.align[colIndex] == null ? {} : { textAlign: node.align[colIndex] });
      const headers = node.header.map((content: ASTNode[], i: number) =>
        reactElement('th', '' + i, { style: getStyle(i), scope: 'col', children: output(content, state) }),
      );
      const rows = node.cells.map((row: ASTNode[][], r: number) =>
        reactElement('tr', '' + r, {
          children: row.map((content, c) =>
            reactElement('td', '' + c, { style: getStyle(c), children: output(content, state) }),
          ),
        }),
      );
      return reactElement('table', state.key, {
        children: [
          reactElement('thead', 'thead', { children: reactElement('tr', null, { children: headers }) }),
          reactElement('tbody', 'tbody', { children: rows }),
        ],
      });
    },
  },
  newline: {
    order: currOrder++,
    requiredFirstCharacters: ['\n'],
    match: blockRegex(/^(?:\n *)*\n/),
    parse: ignoreCapture,
    react: () => '\n',
  },
  paragraph: {
    order: currOrder++,
    match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
    parse: parseCaptureInline,
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('div', state.key, { className: 'paragraph', children: output(node.content, state) }),
  },
  escape: {
    order: currOrder++,
    requiredFirstCharacters: ['\\'],
    match: inlineRegex(/^\\([^0-9A-Za-z\s])/),
    parse: (capture: Capture) => ({ type: 'text', content: capture[1] }),
    react: null,
  },
  tableSeparator: {
    order: currOrder++,
    match: (source: string, state: ParseState) => (state.inTable ? /^ *\| */.exec(source) : null),
    parse: () => ({ type: 'tableSeparator' }),
    react: () => ' | ',
  },
  autolink: {
    order: currOrder++,
    requiredFirstCharacters: ['<'],
    match: inlineRegex(/^<([^: >]+:\/[^ >]+)>/),
    parse: (capture: Capture) => ({
      type: 'link',
      content: [{ type: 'text', content: capture[1] }],
      target: capture[1],
    }),
    react: null,
  },
  mailto: {
    order: currOrder++,
    match: inlineRegex(/^<([^ >]+@[^ >]+)>/),
    parse: (capture: Capture) => {
      const address = capture[1];
      let target = capture[1];
      if (!AUTOLINK_MAILTO_CHECK_R.test(target)) target = 'mailto:' + target;
      return { type: 'link', content: [{ type: 'text', content: address }], target };
    },
    react: null,
  },
  url: {
    order: currOrder++,
    requiredFirstCharacters: ['h'],
    match: inlineRegex(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/),
    parse: (capture: Capture) => ({
      type: 'link',
      content: [{ type: 'text', content: capture[1] }],
      target: capture[1],
      title: undefined,
    }),
    react: null,
  },
  link: {
    order: currOrder++,
    requiredFirstCharacters: ['['],
    match: inlineRegex(new RegExp('^\\[(' + LINK_INSIDE + ')\\]\\(' + LINK_HREF_AND_TITLE + '\\)')),
    parse: (capture: Capture, parse: Parser, state: ParseState) => ({
      content: parse(capture[1], state),
      target: unescapeUrl(capture[2]),
      title: capture[3],
    }),
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('a', state.key, {
        href: sanitizeUrl(node.target),
        title: node.title,
        children: output(node.content, state),
      }),
  },
  image: {
    order: currOrder++,
    match: inlineRegex(new RegExp('^!\\[(' + LINK_INSIDE + ')\\]\\(' + LINK_HREF_AND_TITLE + '\\)')),
    parse: (capture: Capture) => ({ alt: capture[1], target: unescapeUrl(capture[2]), title: capture[3] }),
    react: (node: ASTNode, _output: ReactOutput, state: ParseState) =>
      reactElement('img', state.key, { src: sanitizeUrl(node.target), alt: node.alt, title: node.title }),
  },
  reflink: {
    order: currOrder++,
    match: inlineRegex(new RegExp('^\\[(' + LINK_INSIDE + ')\\]\\s*\\[([^\\]]*)\\]')),
    parse: (capture: Capture, parse: Parser, state: ParseState) =>
      parseRef(capture, state, { type: 'link', content: parse(capture[1], state) }),
    react: null,
  },
  refimage: {
    order: currOrder++,
    match: inlineRegex(new RegExp('^!\\[(' + LINK_INSIDE + ')\\]\\s*\\[([^\\]]*)\\]')),
    parse: (capture: Capture, _parse: Parser, state: ParseState) =>
      parseRef(capture, state, { type: 'image', alt: capture[1] }),
    react: null,
  },
  em: {
    order: currOrder,
    match: inlineRegex(
      new RegExp(
        (SUPPORTS_LOOKBEHIND
          ? '^\\b_((?:_[_(]|\\\\[\\s\\S]|(?<!_)\\B_\\B|[^\\\\_])+?)_(?![(])\\b'
          : '^\\b_((?:__|\\\\[\\s\\S]|[^\\\\_])+?)_\\b') +
          '|^\\*(?=\\S)((?:\\*\\*|\\\\[\\s\\S]|\\s+(?:\\\\[\\s\\S]|[^\\s\\*\\\\]|\\*\\*)|[^\\s\\*\\\\])+?)\\*(?!\\*)',
      ),
    ),
    quality: (capture: Capture) => capture[0].length + 0.2,
    parse: (capture: Capture, parse: Parser, state: ParseState) => ({
      content: parse(capture[2] || capture[1], state),
    }),
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('em', state.key, { children: output(node.content, state) }),
  },
  strong: {
    order: currOrder,
    requiredFirstCharacters: ['*'],
    match: inlineRegex(/^\*\*((?:\\[\s\S]|[^\\])+?)\*\*(?!\*)/),
    quality: (capture: Capture) => capture[0].length + 0.1,
    parse: parseCaptureInline,
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('strong', state.key, { children: output(node.content, state) }),
  },
  u: {
    order: currOrder++,
    requiredFirstCharacters: ['_'],
    match: inlineRegex(/^__((?:\\[\s\S]|[^\\])+?)__(?!_)/),
    quality: (capture: Capture) => capture[0].length,
    parse: parseCaptureInline,
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('u', state.key, { children: output(node.content, state) }),
  },
  del: {
    order: currOrder++,
    requiredFirstCharacters: ['~'],
    match: inlineRegex(/^~~(?=\S)((?:\\[\s\S]|~(?!~)|[^\s~]|\s(?!~~))+?)~~/),
    parse: parseCaptureInline,
    react: (node: ASTNode, output: ReactOutput, state: ParseState) =>
      reactElement('del', state.key, { children: output(node.content, state) }),
  },
  inlineCode: {
    order: currOrder++,
    requiredFirstCharacters: ['`'],
    match: inlineRegex(/^(`+)([\s\S]*?[^`])\1(?!`)/),
    parse: (capture: Capture) => ({ content: capture[2].replace(INLINE_CODE_ESCAPE_BACKTICKS_R, '$1') }),
    react: (node: ASTNode, _output: ReactOutput, state: ParseState) =>
      reactElement('code', state.key, { children: node.content }),
  },
  br: {
    order: currOrder++,
    requiredFirstCharacters: [' '],
    match: anyScopeRegex(/^ {2,}\n/),
    parse: ignoreCapture,
    react: (_node: ASTNode, _output: ReactOutput, state: ParseState) => reactElement('br', state.key, EMPTY_PROPS),
  },
  text: {
    order: currOrder++,
    match: anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\xC0-\uFFFF]|\n\n| {2,}\n|\w+:\S|$)/),
    parse: (capture: Capture) => ({ content: capture[0] }),
    react: (node: ASTNode) => node.content,
  },
} satisfies Record<string, any>;

/** Joins the output of each node type's `react` function, merging adjacent strings (simple-markdown's reactFor). */
export const reactFor = (outputFunc: ReactNodeOutput): ReactOutput => {
  const nestedOutput: ReactOutput = (ast, state) => {
    state = state || {};
    if (Array.isArray(ast)) {
      const oldKey = state.key;
      const result: ReactNode[] = [];
      let lastResult: ReactNode = null;
      for (let i = 0; i < ast.length; i++) {
        state.key = '' + i;
        const nodeOut = nestedOutput(ast[i], state);
        if (typeof nodeOut === 'string' && typeof lastResult === 'string') {
          lastResult = lastResult + nodeOut;
          result[result.length - 1] = lastResult;
        } else {
          result.push(nodeOut);
          lastResult = nodeOut;
        }
      }
      state.key = oldKey;
      return result;
    }
    return outputFunc(ast, nestedOutput, state);
  };
  return nestedOutput;
};

export const ruleOutput =
  (rules: Rules, property: 'react'): ReactNodeOutput =>
  (ast, outputFunc, state) =>
    rules[ast.type][property]!(ast, outputFunc, state);
