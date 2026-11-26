import { normalizeCodeLanguage } from '@discord-mana/markdown';
import {
  ANSI_COLORS,
  ansiStyle,
  codeHighlightStyles,
  highlightCode,
  isHighlightable,
  parseAnsi,
} from '@discord-mana/markdown/internal';
import decorationStyles from '../components/RichEditor/markupDecorations.module.css';
import type { CodeHighlightSpan } from './types';

// Syntax highlighting of code blocks while typing, with the highlighter message code blocks use (Arborium):
// its HTML (`<a-k>const</a-k>`…) is cut into per-line spans whose classes are the same highlight classes. The
// first use of a language loads its grammar; the code block is highlighted again once it is ready.

const MAX_CACHE = 250;
const cache = new Map<string, CodeHighlightSpan[][] | null>();
const pending = new Set<string>();

const remember = (key: string, value: CodeHighlightSpan[][] | null) => {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
};

const classFor = (tag: string) => (codeHighlightStyles as Record<string, string>)[tag];

// Walks the highlighter's HTML: each text run takes the class of its innermost highlight element, split at line
// breaks, with neighbouring runs of the same class merged.
const htmlToLineSpans = (html: string, lineCount: number): CodeHighlightSpan[][] | null => {
  const root = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const lines: CodeHighlightSpan[][] = [[]];
  let column = 0;
  const push = (text: string, type: string | undefined) => {
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        lines.push([]);
        column = 0;
      }
      if (part.length > 0 && type != null) {
        const line = lines[lines.length - 1];
        const last = line[line.length - 1];
        if (last != null && last.end === column && last.types[0] === type) last.end += part.length;
        else line.push({ types: [type], start: column, end: column + part.length });
      }
      column += part.length;
    });
  };
  const walk = (node: Node, type: string | undefined) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) push(child.textContent ?? '', type);
      else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName.toLowerCase();
        walk(child, tag.startsWith('a-') ? (classFor(tag) ?? type) : type);
      }
    }
  };
  walk(root, undefined);
  // The highlighter's input ends with a newline; drop the line after it.
  if (lines.length === lineCount + 1 && lines[lines.length - 1].length === 0) lines.pop();
  return lines.length === lineCount ? lines : null;
};

// ```ansi blocks: escape sequences in small syntax colour, the text between them in the colours they set.
const ansiLineSpans = (code: string, lineCount: number): CodeHighlightSpan[][] | null => {
  const lines: CodeHighlightSpan[][] = [[]];
  let column = 0;
  const push = (text: string, types: string[], style?: Record<string, string>) => {
    text.split('\n').forEach((part, i) => {
      if (i > 0) {
        lines.push([]);
        column = 0;
      }
      if (part.length > 0 && types.length > 0) {
        const span: CodeHighlightSpan = { types, start: column, end: column + part.length };
        if (style != null) span.style = style;
        lines[lines.length - 1].push(span);
      }
      column += part.length;
    });
  };
  let position = 0;
  for (const segment of parseAnsi(code)) {
    push(code.substring(position, segment.position), [decorationStyles.ansiControlSequence]);
    const style = ansiStyle(segment, ANSI_COLORS);
    push(segment.value, style != null ? [codeHighlightStyles.ansi] : [], style);
    position = segment.position + segment.value.length;
  }
  push(code.substring(position), [decorationStyles.ansiControlSequence]);
  return lines.length === lineCount ? lines : null;
};

/**
 * Per-line highlight spans for a code block, or null while the language's grammar loads (`onReady` runs then)
 * or when it can't be highlighted.
 */
export const highlightCodeLines = (code: string, lang: string, onReady: () => void): CodeHighlightSpan[][] | null => {
  const lineCount = code.split('\n').length;
  const language = normalizeCodeLanguage(lang);
  if (language == null) return null;
  if (language === 'ansi') return ansiLineSpans(code, lineCount);
  if (!isHighlightable(code)) return null;
  const key = `${language}\0${code}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (!pending.has(key)) {
    pending.add(key);
    highlightCode(language, code)
      .then((html) => {
        remember(key, html == null ? null : htmlToLineSpans(html, lineCount));
        if (html != null) onReady();
      })
      .catch(() => remember(key, null))
      .finally(() => pending.delete(key));
  }
  return null;
};
