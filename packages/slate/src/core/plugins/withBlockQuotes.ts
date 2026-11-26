import type { Editor, NodeEntry } from 'slate';
import { HistoryUtils } from '../history';
import { EditorUtils, NodeUtils, PathUtils, PointUtils, RangeUtils, TextUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';
import { isPointInCodeBlock } from './withCodeBlocks';
import type { BlockElement } from '../types';

// `> ` at the start of a line turns it into a block quote (the `> ` is removed and drawn as the quote bar);
// `>>> ` quotes it and every line after it. Backspace at the start of a quote, or Enter on an empty quote line
// after another empty one, turns it back into a line.

const TEXT_BLOCK_TYPES = new Set(['line', 'blockQuote']);

const updateBlockQuotes = (editor: Editor) => {
  let quoteRest = false;
  for (const [block, path] of EditorUtils.blocks(editor)) {
    if (!TEXT_BLOCK_TYPES.has(block.type)) continue;
    const start = { path: PathUtils.child(path, 0), offset: 0 };
    if (isPointInCodeBlock(editor, start)) {
      if (block.type === 'blockQuote') {
        SlateTransforms.setNodes(editor, { type: 'line' }, { at: path });
        SlateTransforms.insertText(editor, '> ', { at: start });
      }
      continue;
    }
    if (block.type === 'blockQuote' || EditorUtils.areStylesDisabled(editor)) continue;
    const first = block.children[0];
    if (!TextUtils.isText(first)) continue;
    const multi = first.text.match(/^\s*>>> /);
    const single = first.text.match(/^\s*> /);
    if (single != null || multi != null || quoteRest) {
      SlateTransforms.setNodes(editor, { type: 'blockQuote' }, { at: path });
      if (!quoteRest) {
        const length = single?.[0].length ?? multi?.[0].length ?? 0;
        const textPath = PathUtils.child(path, 0);
        SlateTransforms.delete(editor, {
          at: { anchor: { path: textPath, offset: 0 }, focus: { path: textPath, offset: length } },
        });
        quoteRest = multi != null;
      }
    }
  }
};

const exitEmptyQuote = (
  editor: Editor,
  [block, path]: NodeEntry<BlockElement>,
  point: { path: number[]; offset: number },
) => {
  if (!EditorUtils.isEmpty(editor, block)) return false;
  const previous = EditorUtils.previous(editor, { at: path });
  if (previous == null || !NodeUtils.isType(previous[0], 'blockQuote') || !EditorUtils.isEmpty(editor, previous[0]))
    return false;
  if (!PointUtils.isAtStart(point, [block, path])) return false;
  SlateTransforms.setNodes(editor, { type: 'line' }, { at: path });
  SlateTransforms.removeNodes(editor, { at: previous[1] });
  return true;
};

export const withBlockQuotes = (editor: Editor) => {
  const { deleteBackward, deleteFragment, insertBreak, onChange } = editor;
  editor.deleteBackward = (unit) => {
    const block = EditorUtils.getCurrentBlock(editor);
    if (block?.[0].type === 'blockQuote') {
      const point = RangeUtils.toPoint(editor.selection);
      if (point != null && PathUtils.isFirstChild(block[1], point.path) && point.offset === 0) {
        SlateTransforms.setNodes(editor, { type: 'line' }, { at: block[1] });
        return;
      }
    }
    deleteBackward(unit);
  };
  editor.deleteFragment = (direction) => {
    if (editor.selection != null) {
      const [start, end] = RangeUtils.edges(editor.selection);
      const startPath = [start.path[0]];
      const startBlock = EditorUtils.node(editor, startPath);
      const endPath = [end.path[0]];
      const endBlock = PathUtils.equals(startPath, endPath) ? null : EditorUtils.node(editor, endPath);
      HistoryUtils.withSingleEntry(editor, () => {
        if (NodeUtils.isType(startBlock?.[0], 'blockQuote') && PointUtils.isAtStart(start, startBlock))
          SlateTransforms.setNodes(editor, { type: 'line' }, { at: startPath });
        if (
          endBlock != null &&
          NodeUtils.isType(endBlock[0], 'blockQuote') &&
          PointUtils.isAtEnd(end, endBlock as NodeEntry<BlockElement>)
        )
          SlateTransforms.setNodes(editor, { type: 'line' }, { at: endPath });
        deleteFragment(direction);
      });
      return;
    }
    deleteFragment(direction);
  };
  editor.insertBreak = () => {
    const block = EditorUtils.getCurrentBlock(editor);
    if (block?.[0].type === 'blockQuote') {
      const point = RangeUtils.toPoint(editor.selection);
      if (point == null) return;
      if (!exitEmptyQuote(editor, block as NodeEntry<BlockElement>, point))
        SlateTransforms.splitNodes(editor, { at: point, always: true });
      return;
    }
    insertBreak();
  };
  let lastValue: unknown = null;
  let lastPreview = true;
  editor.onChange = () => {
    const value = EditorUtils.richValue(editor);
    if (value !== lastValue || editor.previewMarkdown !== lastPreview) {
      HistoryUtils.withMergedEntry(editor, () => {
        EditorUtils.withoutNormalizing(editor, () => updateBlockQuotes(editor));
      });
      lastValue = value;
      lastPreview = editor.previewMarkdown;
    }
    onChange();
  };
  return editor;
};
