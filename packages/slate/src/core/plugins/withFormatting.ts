import { invariant } from '../invariant';
import type { Editor, Point } from 'slate';
import { HistoryUtils } from '../history';
import { EditorUtils, PathUtils, PointUtils, RangeUtils, TextUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';

// Ctrl/Cmd+B, I, U, Shift+S and the formatting toolbar: wrap the selection in markup, or remove the markup
// around it when it is already wrapped.

export type FormatType = 'bold' | 'italics' | 'underline' | 'strikethrough' | 'inlineCode' | 'spoiler';

const MARKUP_CHARS = new Set(['*', '_', '~', '`', '|']);
const SYNTAX: Record<FormatType, string> = {
  bold: '**',
  italics: '*',
  underline: '__',
  strikethrough: '~~',
  inlineCode: '`',
  spoiler: '||',
};

interface Found {
  chars: string;
  location: number;
}

const indexOfSyntax = (text: string, syntax: string) => {
  const index = text.indexOf(syntax);
  if (index >= 0) {
    const char = syntax.charAt(0);
    if (
      (index > 0 && text.charAt(index - 1) === char) ||
      (index < text.length - 1 && text.charAt(index + syntax.length) === char)
    )
      return -1;
  }
  return index;
};

const findSyntax = (
  result: Partial<Record<FormatType, Found>>,
  text: string,
  start: number,
  syntax: string,
  type: FormatType,
) => {
  const index = indexOfSyntax(text, syntax);
  if (index >= 0) result[type] = { chars: syntax, location: start + index };
};

const findCombined = (
  result: Partial<Record<FormatType, Found>>,
  text: string,
  start: number,
  syntax: string,
  first: FormatType,
  second: FormatType,
) => {
  const index = indexOfSyntax(text, syntax);
  if (index >= 0) {
    result[first] = { chars: syntax.substring(0, 1), location: index + start };
    result[second] = { chars: syntax.substring(1), location: index + start + 1 };
  }
};

const syntaxAround = (editor: Editor, point: Point) => {
  const [node] = EditorUtils.node(editor, point.path);
  if (!TextUtils.isText(node)) return {};
  const text = node.text;
  let start = point.offset;
  for (let i = start - 1; i >= 0; i--)
    if (MARKUP_CHARS.has(text.charAt(i))) start--;
    else break;
  let end = point.offset;
  for (let i = end; i < text.length; i++)
    if (MARKUP_CHARS.has(text.charAt(i))) end++;
    else break;
  const run = text.substring(start, end);
  const result: Partial<Record<FormatType, Found>> = {};
  findCombined(result, run, start, '***', 'italics', 'bold');
  findCombined(result, run, start, '___', 'italics', 'underline');
  findSyntax(result, run, start, '**', 'bold');
  findSyntax(result, run, start, '*', 'italics');
  findSyntax(result, run, start, '_', 'italics');
  findSyntax(result, run, start, '__', 'underline');
  findSyntax(result, run, start, '`', 'inlineCode');
  findSyntax(result, run, start, '~~', 'strikethrough');
  findSyntax(result, run, start, '||', 'spoiler');
  return result;
};

/** Formats that wrap the selection on both sides. */
export const getActiveFormats = (editor: Editor, start: Point, end: Point) => {
  if (editor.selection == null) return { before: {}, after: {} };
  const before = syntaxAround(editor, start);
  const after = syntaxAround(editor, end);
  for (const key in before) if (!(key in after)) delete before[key as FormatType];
  for (const key in after) if (!(key in before)) delete after[key as FormatType];
  return { before, after };
};

export const toggleFormat = (editor: Editor, type: FormatType) => {
  HistoryUtils.withSingleEntry(editor, () => {
    EditorUtils.withoutNormalizing(editor, () => {
      const selection = editor.selection;
      invariant(selection != null, 'Editor has no selection');
      const [start, end] = RangeUtils.edges(selection);
      const formats = getActiveFormats(editor, start, end);
      const opening = formats.before[type];
      const closing = formats.after[type];
      const startEntry = EditorUtils.node(editor, start.path);
      const endEntry = EditorUtils.node(editor, end.path);
      if (startEntry == null || endEntry == null || !TextUtils.isText(startEntry[0]) || !TextUtils.isText(endEntry[0]))
        return;
      const samePath = PathUtils.equals(startEntry[1], endEntry[1]);
      if (opening != null && closing != null) {
        const openAt = { path: start.path, offset: opening.location };
        const closeAt = { path: end.path, offset: closing.location };
        SlateTransforms.delete(editor, { at: closeAt, distance: closing.chars.length });
        SlateTransforms.delete(editor, { at: openAt, distance: opening.chars.length });
        let anchor = start.offset;
        let focus = end.offset;
        if (!PointUtils.isBefore(start, openAt)) anchor -= opening.chars.length;
        if (samePath && !PointUtils.isBefore(end, openAt)) focus -= opening.chars.length;
        if (PointUtils.isAfter(end, closeAt)) focus -= closing.chars.length;
        SlateTransforms.select(editor, {
          anchor: { path: start.path, offset: Math.max(0, anchor) },
          focus: { path: end.path, offset: Math.max(0, focus) },
        });
      } else {
        const syntax = SYNTAX[type];
        SlateTransforms.insertText(editor, syntax, { at: end });
        SlateTransforms.insertText(editor, syntax, { at: start });
        const anchorMax = startEntry[0].text.length + syntax.length;
        const focusMax = endEntry[0].text.length + (samePath ? 2 * syntax.length : syntax.length);
        SlateTransforms.select(editor, {
          anchor: { path: start.path, offset: Math.min(anchorMax, start.offset + syntax.length) },
          focus: { path: end.path, offset: Math.min(focusMax, end.offset + (samePath ? syntax.length : 0)) },
        });
      }
    });
  });
  EditorUtils.focus(editor);
};

/** Turns the selected lines into (or back from) a block type, e.g. block quotes from the toolbar. */
export const toggleBlockType = (editor: Editor, type: 'blockQuote') => {
  const selection = editor.selection;
  if (selection == null) return;
  let all = true;
  for (const [node, path] of EditorUtils.blocks(editor))
    if ((node.type === 'line' || node.type === type) && RangeUtils.includes(selection, path))
      all = all && node.type === type;
  EditorUtils.withoutNormalizing(editor, () => {
    for (const [node, path] of EditorUtils.blocks(editor))
      if (RangeUtils.includes(selection, path)) {
        if (!all && node.type === 'line') SlateTransforms.setNodes(editor, { type }, { at: path });
        else if (all && node.type === type) SlateTransforms.setNodes(editor, { type: 'line' }, { at: path });
      }
  });
  EditorUtils.focus(editor);
};
