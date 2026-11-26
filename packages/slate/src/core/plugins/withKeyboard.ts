import { invariant } from '../invariant';
import getDirection from 'direction';
import type { Editor, Element, NodeEntry } from 'slate';
import { ReactEditor } from '../../slate-react';
import { HistoryUtils } from '../history';
import { EditorUtils, NodeUtils, PathUtils, PointUtils, RangeUtils, TextUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';
import { toggleFormat } from './withFormatting';

const KEY = {
  TAB: 9,
  END: 35,
  HOME: 36,
  ARROW_LEFT: 37,
  ARROW_RIGHT: 39,
  BACKSPACE: 8,
  DELETE: 46,
  A: 65,
  B: 66,
  E: 69,
  I: 73,
  K: 75,
  S: 83,
  T: 84,
  U: 85,
} as const;

interface ModifierEvent {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Whether exactly these modifiers are held; `null` means "either". */
export const matchesModifiers = (
  event: ModifierEvent,
  {
    cmd = false,
    ctrl = false,
    alt = false,
    shift = false,
  }: { cmd?: boolean | null; ctrl?: boolean | null; alt?: boolean | null; shift?: boolean | null },
) =>
  (cmd == null || event.metaKey === cmd) &&
  (ctrl == null || event.ctrlKey === ctrl) &&
  (alt == null || event.altKey === alt) &&
  (shift == null || event.shiftKey === shift);

const moveToLineBoundary = (editor: Editor, direction: 'forward' | 'backward') => {
  const selection = (ReactEditor.findDocumentOrShadowRoot(editor) as Document).getSelection();
  if (selection == null || selection.rangeCount === 0) return false;
  selection.modify('move', direction, 'lineboundary');
  const range = EditorUtils.toSlateRange(editor, selection, { exactMatch: false, suppressThrow: true });
  if (range != null) SlateTransforms.select(editor, range);
  return true;
};

const moveToBlockEdge = (editor: Editor, edge: 'start' | 'end') => {
  const block = EditorUtils.getCurrentBlock(editor);
  if (block == null) return false;
  const point = edge === 'start' ? EditorUtils.start(editor, block[1]) : EditorUtils.end(editor, block[1]);
  SlateTransforms.select(editor, { anchor: point, focus: point });
  return true;
};

// Emacs-style Ctrl+T on macOS: swap the characters around the caret.
const transposeCharacters = (editor: Editor) => {
  const { selection } = editor;
  if (selection == null || !RangeUtils.isCollapsed(selection)) return false;
  const point = selection.anchor;
  const [leaf, path] = EditorUtils.leaf(editor, point);
  const { text } = leaf;
  if (text.length < 2) return false;
  const { offset } = point;
  if (offset === 0) return false;
  const atEnd = offset >= text.length;
  const index = atEnd ? text.length - 2 : offset - 1;
  const swapped = text[index + 1] + text[index];
  if (!(swapped as string & { isWellFormed: () => boolean }).isWellFormed()) return false;
  HistoryUtils.withSingleEntry(editor, () => {
    SlateTransforms.delete(editor, { at: { anchor: { path, offset: index }, focus: { path, offset: index + 2 } } });
    SlateTransforms.insertText(editor, swapped, { at: { path, offset: index } });
    SlateTransforms.select(editor, { path, offset: atEnd ? text.length : offset + 1 });
  });
  return true;
};

const indentCodeBlock = (editor: Editor, event: ModifierEvent) => {
  if (editor.selection == null) return false;
  const [start, end] = RangeUtils.edges(editor.selection);
  const blocks = EditorUtils.blocks(editor).slice(start.path[0], end.path[0] + 1);
  for (const [block] of blocks) if (block.type !== 'line' || !block.codeBlockState?.isInCodeBlock) return false;
  if (!event.shiftKey && RangeUtils.isCollapsed(editor.selection)) {
    SlateTransforms.insertText(editor, '  ');
    return true;
  }
  const indent = !event.shiftKey;
  HistoryUtils.withSingleEntry(editor, () => {
    let anchor = editor.selection?.anchor ?? EditorUtils.start(editor, []);
    let focus = editor.selection?.focus ?? EditorUtils.end(editor, []);
    for (const [block, blockPath] of blocks) {
      const first = block.children[0];
      if (!TextUtils.isText(first)) continue;
      const path = PathUtils.child(blockPath, 0);
      const lineStart = { path, offset: 0 };
      if (indent) {
        SlateTransforms.insertText(editor, '  ', { at: lineStart });
        if (PathUtils.equals(anchor.path, path) && anchor.offset !== 0) anchor = { path, offset: anchor.offset + 2 };
        if (PathUtils.equals(focus.path, path) && focus.offset !== 0) focus = { path, offset: focus.offset + 2 };
      } else if (first.text.startsWith('  ')) {
        SlateTransforms.delete(editor, { at: { anchor: lineStart, focus: { path, offset: 2 } } });
        if (PathUtils.equals(anchor.path, path)) anchor = { path, offset: Math.max(0, anchor.offset - 2) };
        if (PathUtils.equals(focus.path, path)) focus = { path, offset: Math.max(0, focus.offset - 2) };
      }
    }
    SlateTransforms.select(editor, { anchor, focus });
  });
  return true;
};

/** Formatting shortcuts, code block indentation, word/line movement and line deletion. */
export const withKeyboard = (editor: Editor) => {
  editor.onKeyDown = (event) => {
    const mac = editor.isMac;
    switch (event.which) {
      case KEY.B:
        if (!EditorUtils.isEditorEmpty(editor) && matchesModifiers(event, { ctrl: !mac, cmd: mac })) {
          toggleFormat(editor, 'bold');
          return true;
        }
        break;
      case KEY.I:
        if (!EditorUtils.isEditorEmpty(editor) && matchesModifiers(event, { ctrl: !mac, cmd: mac })) {
          toggleFormat(editor, 'italics');
          return true;
        }
        break;
      case KEY.U:
        if (!EditorUtils.isEditorEmpty(editor) && matchesModifiers(event, { ctrl: !mac, cmd: mac })) {
          toggleFormat(editor, 'underline');
          return true;
        }
        break;
      case KEY.S:
        if (!EditorUtils.isEditorEmpty(editor) && matchesModifiers(event, { ctrl: !mac, cmd: mac, shift: true })) {
          toggleFormat(editor, 'strikethrough');
          return true;
        }
        break;
      case KEY.TAB:
        if (matchesModifiers(event, { shift: null }) && indentCodeBlock(editor, event)) return true;
        break;
      case KEY.ARROW_LEFT:
      case KEY.ARROW_RIGHT: {
        let unit: 'character' | 'word';
        if (matchesModifiers(event, { shift: null })) unit = 'character';
        else if (matchesModifiers(event, { ctrl: !mac, alt: mac, shift: null })) unit = 'word';
        else return false;
        const block = editor.children[editor.selection?.focus?.path[0] ?? 0];
        const rtl = getDirection(NodeUtils.string(block)) === 'rtl';
        const reverse = (event.which === KEY.ARROW_LEFT) === !rtl;
        SlateTransforms.keyboardMove(editor, { reverse, unit, edge: event.shiftKey ? 'focus' : undefined });
        return true;
      }
      case KEY.A:
        if (mac && matchesModifiers(event, { ctrl: true }) && moveToBlockEdge(editor, 'start')) return true;
        break;
      case KEY.E:
        if (mac && matchesModifiers(event, { ctrl: true }) && moveToBlockEdge(editor, 'end')) return true;
        break;
      case KEY.T:
        if (mac && matchesModifiers(event, { ctrl: true }) && transposeCharacters(editor)) return true;
        break;
      case KEY.HOME:
        if (matchesModifiers(event, { shift: false, ctrl: false }) && moveToLineBoundary(editor, 'backward'))
          return true;
        break;
      case KEY.END:
        if (matchesModifiers(event, { shift: false, ctrl: false }) && moveToLineBoundary(editor, 'forward'))
          return true;
        break;
      case KEY.BACKSPACE:
      case KEY.DELETE:
      case KEY.K: {
        const backward = event.which === KEY.BACKSPACE;
        if (
          ((!mac && event.which !== KEY.K && matchesModifiers(event, { ctrl: true, shift: true })) ||
            (mac && event.which !== KEY.K && matchesModifiers(event, { cmd: true })) ||
            (mac && event.which === KEY.K && matchesModifiers(event, { ctrl: true }))) &&
          editor.selection != null
        ) {
          const [start, end] = RangeUtils.edges(editor.selection);
          const [block, path] = EditorUtils.node(editor, [backward ? start.path[0] : end.path[0]]);
          invariant(EditorUtils.isBlock(editor, block), 'Top-most node of selection is not a block');
          const blockEntry = [block, path] as NodeEntry<Element>;
          if (
            (backward && !PointUtils.isAtStart(start, blockEntry)) ||
            (!backward && !PointUtils.isAtEnd(end, blockEntry))
          ) {
            if (backward) editor.deleteBackward('line');
            else editor.deleteForward('line');
            return true;
          }
        }
      }
    }
    return false;
  };
  return editor;
};
