import type { Editor, NodeEntry, Path } from 'slate';
import { EditorUtils, ElementUtils, NodeUtils, PointUtils, TextUtils } from './slateUtils';
import { pointAtSerializedOffset } from './offsets';
import type { MarkdownEntry } from './markdownTokens';
import type { BlockElement, DecorationRange } from './types';

const TEXT_BLOCK_TYPES = new Set(['line', 'blockQuote']);
const NONE: DecorationRange[] = [];

const isSyntaxFlag = (flag: string) =>
  flag === 'syntaxBefore' || flag === 'syntaxAfter' || flag.startsWith('before_') || flag.startsWith('after_');

/**
 * Markdown entries as decorations: each styled span becomes a range with its rule names as flags. A syntax
 * span also gets the styles of the content next to it (`before_strong` on the `**` before bold text).
 */
export const entriesToDecorations = (editor: Editor, path: Path, serialized: string[], entries: MarkdownEntry[]) => {
  const ranges: DecorationRange[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.attributes.length === 0 || entry.text.length === 0) continue;
    const previous = entries[i - 1];
    const next = entries[i + 1];
    const range = {
      anchor: pointAtSerializedOffset(editor, path, serialized, entry.start),
      focus: pointAtSerializedOffset(editor, path, serialized, entry.start + entry.text.length),
    };
    const flags: Record<string, true> = {};
    for (const attribute of entry.attributes) {
      flags[attribute] = true;
      if (attribute === 'syntaxBefore' && next != null) {
        for (const nextAttribute of next.attributes)
          if (!isSyntaxFlag(nextAttribute)) flags[`before_${nextAttribute}`] = true;
      } else if (attribute === 'syntaxAfter' && previous != null)
        for (const previousAttribute of previous.attributes)
          if (!isSyntaxFlag(previousAttribute)) flags[`after_${previousAttribute}`] = true;
    }
    // Split at inline elements so each range covers one text node.
    for (const [, nodePath] of EditorUtils.nodes(editor, { at: range, mode: 'lowest', voids: false })) {
      const nodeRange = { anchor: EditorUtils.start(editor, nodePath), focus: EditorUtils.end(editor, nodePath) };
      if (PointUtils.isBefore(nodeRange.anchor, range.anchor)) nodeRange.anchor = range.anchor;
      if (PointUtils.isAfter(nodeRange.focus, range.focus)) nodeRange.focus = range.focus;
      ranges.push({ ...flags, ...nodeRange });
    }
  }
  return ranges;
};

/** Live markdown styling of a line or block quote. */
export const decorateMarkdown = (editor: Editor, [node, path]: NodeEntry): DecorationRange[] => {
  if (EditorUtils.areStylesDisabled(editor)) return [];
  if (path.length !== 1 || !NodeUtils.isInTypes(node, TEXT_BLOCK_TYPES)) return NONE;
  const { entries, serializedChildren } = ElementUtils.markdown(editor, node as BlockElement, true);
  return entriesToDecorations(editor, path, serializedChildren, entries);
};

/** Syntax highlighting of code block lines (`hljsTypes` and ANSI styles from `codeBlockState`). */
export const decorateCodeBlock = (editor: Editor, [node, path]: NodeEntry): DecorationRange[] => {
  if (EditorUtils.areStylesDisabled(editor)) return [];
  const ranges: DecorationRange[] = [];
  if (!NodeUtils.isType(node, 'line') || node.codeBlockState == null) return ranges;
  const { hljsTypes, isStyledCodeBlockLine } = node.codeBlockState;
  if (hljsTypes == null || hljsTypes.length === 0 || !isStyledCodeBlockLine) return [];
  const serialized = node.children.map((child) => (TextUtils.isText(child) ? child.text : null));
  for (const span of hljsTypes)
    ranges.push({
      hljsTypes: span.types,
      ...(span.style != null ? { ansiStyle: span.style } : null),
      anchor: pointAtSerializedOffset(editor, path, serialized, span.start),
      focus: pointAtSerializedOffset(editor, path, serialized, span.end),
    });
  return ranges;
};
