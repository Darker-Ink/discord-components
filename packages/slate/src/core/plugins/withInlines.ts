import type { Editor, Point } from 'slate';
import type { TextUnit } from '../types';
import { EditorUtils, PathUtils, PointUtils, RangeUtils, TextUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';

// Deleting next to or inside inline elements: a pill goes away in one keystroke, an empty inline input is removed,
// and deleting never reaches across into the neighbouring block's inline. Also keeps the caret from leaving an
// inline input during IME composition.

// Returns true when it handled the deletion.
const deleteAroundInline = (editor: Editor, unit: TextUnit | 'block', reverse: boolean) => {
  const inline = EditorUtils.getCurrentInline(editor);
  if (unit === 'block') return true;
  const text = EditorUtils.getCurrentText(editor);
  if (text == null) return true;
  let [node, path] = text;
  let [start, end] = EditorUtils.edges(editor, path);
  let point: Point | null = RangeUtils.toPoint(editor.selection);
  if (point == null) return true;
  if (inline != null) {
    const [element, inlinePath] = inline;
    if (EditorUtils.isEmpty(editor, element) || EditorUtils.isVoid(editor, element)) {
      SlateTransforms.removeInline(editor, inlinePath);
      return true;
    }
  }
  if (unit === 'line') {
    if (inline == null) return false;
    const [lineStart, lineEnd] = EditorUtils.edges(editor, inline[1]);
    SlateTransforms.delete(editor, {
      at: point,
      unit,
      reverse,
      select: true,
      bounds: { anchor: lineStart, focus: lineEnd },
    });
    return true;
  }
  const block = EditorUtils.getParentBlock(editor, point);
  if (block == null) return true;
  const blockPath = block[1];
  if (PointUtils.equals(point, reverse ? start : end))
    for (;;) {
      const next: Point | undefined = (reverse ? EditorUtils.before : EditorUtils.after)(editor, point);
      if (next == null) return true;
      if (!PathUtils.isDescendant(next.path, blockPath)) break;
      point = next;
      const nextInline = EditorUtils.getParentInline(editor, next);
      if (nextInline != null) {
        const [element, inlinePath] = nextInline;
        if (EditorUtils.isEmpty(editor, element) || EditorUtils.isVoid(editor, element)) {
          const before = EditorUtils.before(editor, inlinePath);
          if (before != null) SlateTransforms.select(editor, before);
          SlateTransforms.removeInline(editor, inlinePath);
          return true;
        }
      }
      const entry = EditorUtils.node(editor, next.path);
      if (entry == null || !TextUtils.isText(entry[0])) return true;
      [node, path] = entry as [typeof node, typeof path];
      if (node.text.length !== 0) {
        [start, end] = EditorUtils.edges(editor, path);
        break;
      }
    }
  SlateTransforms.delete(editor, { at: point, unit, reverse, select: true });
  return true;
};

export const withInlines = (editor: Editor) => {
  const { apply, deleteBackward, deleteForward, deleteFragment, insertText } = editor;
  editor.apply = (operation) => {
    if (
      operation.type === 'set_selection' &&
      editor.composition?.startedInsideInline &&
      RangeUtils.isRange(operation.properties) &&
      RangeUtils.isRange(operation.newProperties) &&
      RangeUtils.isCollapsed(operation.newProperties)
    ) {
      const from = EditorUtils.getParentInline(editor, operation.properties);
      const to = EditorUtils.getParentInline(editor, operation.newProperties);
      if (from != null && (to == null || !PathUtils.equals(from[1], to[1]))) return;
    }
    apply(operation);
  };
  editor.insertText = (text) => {
    if (editor.selection != null && EditorUtils.getCurrentInline(editor) != null)
      SlateTransforms.insertText(editor, text);
    else insertText(text);
  };
  editor.deleteBackward = (unit) => {
    if (!deleteAroundInline(editor, unit, true)) deleteBackward(unit);
  };
  editor.deleteForward = (unit) => {
    if (!deleteAroundInline(editor, unit, false)) deleteForward(unit);
  };
  editor.deleteFragment = (direction) => {
    if (editor.selection != null && RangeUtils.isExpanded(editor.selection)) {
      let anchor = editor.selection.anchor;
      let focus = editor.selection.focus;
      const anchorInline = EditorUtils.getParentInline(editor, anchor);
      const focusInline = EditorUtils.getParentInline(editor, focus);
      if (anchorInline != null && focusInline != null && PathUtils.equals(anchorInline[1], focusInline[1])) {
        deleteFragment(direction);
        return;
      }
      const forward = RangeUtils.isForward(editor.selection);
      if (anchorInline != null) {
        const [start, end] = EditorUtils.edges(editor, anchorInline[1]);
        if (forward && PointUtils.equals(anchor, start))
          anchor = EditorUtils.before(editor, start) ?? EditorUtils.start(editor, []);
        else if (!forward && PointUtils.equals(anchor, end))
          anchor = EditorUtils.after(editor, end) ?? EditorUtils.end(editor, []);
      }
      if (focusInline != null) {
        const [start, end] = EditorUtils.edges(editor, focusInline[1]);
        if (!forward && PointUtils.equals(focus, start))
          focus = EditorUtils.before(editor, start) ?? EditorUtils.start(editor, []);
        else if (forward && PointUtils.equals(focus, end))
          focus = EditorUtils.after(editor, end) ?? EditorUtils.end(editor, []);
      }
      SlateTransforms.delete(editor, { at: { anchor, focus }, reverse: direction === 'backward', select: true });
      return;
    }
    deleteFragment(direction);
  };
  return editor;
};
