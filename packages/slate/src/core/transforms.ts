import { Transforms } from 'slate';
import type { Editor, Element, Location, NodeEntry, Point, Range } from 'slate';
import type { TextUnit } from './types';
import { EditorUtils, PathUtils, PointUtils, RangeUtils, TextUtils } from './slateUtils';

type Overlap = ReturnType<typeof EditorUtils.getSelectionOverlap>;
type Where = Overlap['anchor'];

const pick = (
  current: Point | undefined,
  where: Where,
  start: Point | null,
  inside: Point | null,
  end: Point | null,
) => {
  switch (where) {
    case 'start':
      return start;
    case 'inside':
      return inside;
    case 'end':
      return end;
  }
  return current;
};

// Puts the selection back where it was relative to a replaced range (before, inside or after it).
const restoreSelection = (
  editor: Editor,
  overlap: Overlap,
  start: Point | null,
  inside: Point | null,
  end: Point | null,
) => {
  if (overlap.anchor == null && overlap.focus == null) return;
  const anchor = pick(editor.selection?.anchor, overlap.anchor, start, inside, end);
  const focus = pick(editor.selection?.focus, overlap.focus, start, inside, end);
  if (anchor != null && focus != null) Transforms.select(editor, { anchor, focus });
};

const THAI_RE = /[฀-๿]/;

export const SlateTransforms = {
  ...Transforms,
  resetSelectionToEditorStart(editor: Editor) {
    Transforms.select(editor, EditorUtils.start(editor, []));
  },
  resetSelectionToEditorEnd(editor: Editor) {
    Transforms.select(editor, EditorUtils.end(editor, []));
  },
  delete(
    editor: Editor,
    options: {
      at?: Location;
      distance?: number;
      unit?: TextUnit | 'offset';
      reverse?: boolean;
      select?: boolean;
      bounds?: Range;
      voids?: boolean;
    },
  ) {
    let { at } = options;
    const { distance, unit, reverse = false, select = false, bounds, voids } = options;
    if (at == null) {
      if (editor.selection == null) return;
      at = editor.selection;
    }
    let [start, end] = RangeUtils.isRange(at) ? RangeUtils.edges(at) : EditorUtils.edges(editor, at);
    if (distance != null || unit != null)
      if (reverse) {
        let before = EditorUtils.before(editor, start, { distance, unit }) ?? EditorUtils.start(editor, []);
        // Thai combining characters are deleted one code point at a time, like a native input.
        if (unit === 'character' && (distance ?? 1) === 1 && PathUtils.equals(start.path, end.path)) {
          const leaf = EditorUtils.leaf(editor, start.path);
          const text = leaf != null ? leaf[0].text : '';
          if (text.length > 0 && text[text.length - 1].match(THAI_RE) != null)
            before = EditorUtils.before(editor, start, { distance, unit: 'offset' }) ?? EditorUtils.start(editor, []);
        }
        start = before;
      } else end = EditorUtils.after(editor, end, { distance, unit }) ?? EditorUtils.end(editor, []);
    if (bounds != null) {
      const [min, max] = RangeUtils.edges(bounds);
      if (PointUtils.isBefore(start, min)) start = min;
      if (PointUtils.isAfter(end, max)) end = max;
    }
    if (!PointUtils.equals(start, end)) {
      Transforms.delete(editor, { at: { anchor: start, focus: end }, hanging: true, voids });
      if (select && EditorUtils.hasPath(editor, start.path)) Transforms.select(editor, start);
    }
  },
  textToText(editor: Editor, text: string, range: Range) {
    const overlap = EditorUtils.getSelectionOverlap(editor, range);
    const [start, end] = RangeUtils.edges(range);
    let before = EditorUtils.before(editor, start) ?? EditorUtils.start(editor, []);
    let after = EditorUtils.after(editor, end);
    if (RangeUtils.isExpanded(range)) Transforms.delete(editor, { at: range, voids: true });
    Transforms.insertText(editor, text, { at: before });
    before = before ?? EditorUtils.start(editor, []);
    after = after ?? EditorUtils.end(editor, []);
    restoreSelection(editor, overlap, before, after, after);
  },
  /** Replaces a range of text with an inline void (a pill), keeping empty texts around it. */
  textToVoid(editor: Editor, node: Element, range: Range) {
    const overlap = EditorUtils.getSelectionOverlap(editor, range);
    const start = RangeUtils.start(range);
    const voidPath = PathUtils.next(start.path);
    const after = { path: PathUtils.next(voidPath), offset: 0 };
    Transforms.delete(editor, { at: range, voids: true });
    if (start.offset === 0) Transforms.insertNodes(editor, [{ text: '' }], { at: start.path });
    Transforms.insertNodes(editor, [node], { at: start });
    if (!(EditorUtils.hasPath(editor, after.path) && TextUtils.isText(EditorUtils.node(editor, after.path)[0])))
      Transforms.insertNodes(editor, [{ text: '' }], { at: after.path });
    restoreSelection(editor, overlap, start, after, after);
  },
  textToInline(editor: Editor, node: Element, range: Range) {
    const overlap = EditorUtils.getSelectionOverlap(editor, range);
    const last = node.children[node.children.length - 1];
    const start = RangeUtils.start(range);
    const inlinePath = PathUtils.next(start.path);
    const end = {
      path: PathUtils.child(inlinePath, node.children.length - 1),
      offset: TextUtils.isText(last) ? last.text.length : 0,
    };
    Transforms.delete(editor, { at: range, voids: true });
    if (start.offset === 0) Transforms.insertNodes(editor, [{ text: '' }], { at: start.path });
    Transforms.insertNodes(editor, [node], { at: start });
    restoreSelection(editor, overlap, start, end, end);
  },
  /** Replaces an inline void with its text (a pill that no longer parses, e.g. after an escape was typed). */
  voidToText(editor: Editor, text: string, at: Location) {
    const overlap = EditorUtils.getSelectionOverlap(editor, at as Range);
    const before = EditorUtils.before(editor, at) ?? EditorUtils.start(editor, []);
    const end = { path: before.path, offset: before.offset + text.length };
    Transforms.delete(editor, { at, voids: true });
    Transforms.insertText(editor, text, { at: before });
    restoreSelection(editor, overlap, before, before, end);
  },
  removeInline(editor: Editor, at: Location) {
    const overlap = EditorUtils.getSelectionOverlap(editor, at as Range);
    const before = EditorUtils.before(editor, at) ?? EditorUtils.start(editor, []);
    Transforms.delete(editor, { at, voids: true });
    restoreSelection(editor, overlap, before, before, before);
  },
  removeInlineChildren(editor: Editor, [node, path]: NodeEntry<Element>) {
    const overlap = EditorUtils.getSelectionOverlap(editor, path);
    const start = { path: PathUtils.child(path, 0), offset: 0 };
    EditorUtils.withoutNormalizing(editor, () => {
      for (let i = node.children.length - 1; i >= 0; i--)
        Transforms.removeNodes(editor, { at: PathUtils.child(path, i), voids: true });
    });
    restoreSelection(editor, overlap, null, start, null);
  },
  keyboardMove(
    editor: Editor,
    options?: { distance?: number; unit?: 'character' | 'word' | 'line' | 'offset'; reverse?: boolean; edge?: 'focus' },
  ) {
    const { distance = 1, unit = 'character', reverse = false, edge } = options ?? {};
    const selection = editor.selection;
    if (selection == null) return;
    let point = selection.focus;
    if (RangeUtils.isExpanded(selection)) {
      if (edge === undefined && unit === 'character') {
        Transforms.collapse(editor, { edge: reverse ? 'start' : 'end' });
        return;
      }
      if (edge !== 'focus')
        point = unit === 'line' || reverse ? RangeUtils.start(selection) : RangeUtils.end(selection);
    }
    const next = (reverse ? EditorUtils.before : EditorUtils.after)(editor, point, { unit, distance });
    if (next != null)
      Transforms.setSelection(editor, edge === 'focus' ? { focus: next } : { anchor: next, focus: next });
  },
};
