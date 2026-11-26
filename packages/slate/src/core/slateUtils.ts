import { invariant } from './invariant';
import { Editor, Element, Node, Path, Point, Range, Text } from 'slate';
import type { Ancestor, BaseSelection, Descendant, Location, NodeEntry } from 'slate';
import { ReactEditor } from '../slate-react';
import { FIRST_BLOCK_PATH, FIRST_TEXT_PATH, EDITOR_ROOT_PATH } from './constants';
import { markdownEntries, type MarkdownEntry } from './markdownTokens';
import type { BlockElement, RichElement } from './types';

// The client's helpers on top of Slate's namespaces: each spreads Slate's (and slate-react's) functions and
// adds its own, so call sites read `EditorUtils.richValue(editor)` next to `EditorUtils.before(editor, …)`.

// The client changes how Slate walks by line and block: "block" movement means "line", and a line unit stops at
// the edge of the inline element the point is in instead of the whole block.
let positionsPatched = false;
const patchPositions = () => {
  if (positionsPatched) return;
  positionsPatched = true;
  const positions = Editor.positions;
  Editor.positions = function* (editor, options = {}) {
    const { at = editor.selection, reverse = false, voids = false } = options ?? {};
    let { unit = 'offset' } = options ?? {};
    if (at == null) return;
    if (unit === 'block') unit = 'line';
    if (unit === 'offset') {
      yield* positions(editor, options);
      return;
    }
    const range = PointUtils.isPoint(at)
      ? reverse
        ? { anchor: at, focus: EditorUtils.start(editor, []) }
        : { anchor: at, focus: EditorUtils.end(editor, []) }
      : EditorUtils.range(editor, at);
    const [start, end] = RangeUtils.edges(range);
    const blocks = EditorUtils.blocks(editor);
    const step = reverse ? -1 : 1;
    const first = start.path[0] ?? 0;
    const last = end.path[0] ?? blocks.length - 1;
    const from = reverse ? last : first;
    const to = reverse ? first : last;
    let done = false;
    let pending: Point | undefined;
    // eslint-disable-next-line func-style -- generators have no arrow form
    function* walk([node, path]: NodeEntry<Ancestor>): Generator<Point> {
      const depth = path.length;
      const containsStart = PathUtils.isAncestor(path, start.path);
      const containsEnd = PathUtils.isAncestor(path, end.path);
      const lo = containsStart ? start.path[depth] : 0;
      const hi = containsEnd ? end.path[depth] : node.children.length - 1;
      const begin = reverse ? hi : lo;
      const finish = reverse ? lo : hi;
      for (let i = begin; !done && (reverse ? i >= finish : i <= finish); i += step) {
        const child = node.children[i];
        const childPath = PathUtils.child(path, i);
        if (ElementUtils.isElement(child)) {
          const edge = reverse ? end.path : start.path;
          if (!(PathUtils.equals(childPath, edge) || PathUtils.isAncestor(childPath, edge))) {
            const isVoid = editor.isVoid(child);
            if (unit === 'line' && ElementUtils.isElement(child) && !isVoid) {
              if (pending != null) {
                yield pending;
                pending = undefined;
              }
              done = true;
              return;
            }
            if (!voids && isVoid) continue;
          }
          yield* walk([child, childPath]);
        } else if (TextUtils.isText(child)) {
          if (unit === 'line') pending = { path: childPath, offset: reverse ? 0 : child.text.length };
          else if (child.text.length === 0) yield { path: childPath, offset: 0 };
          else {
            const textRange = Editor.range(editor, childPath);
            if (PathUtils.equals(childPath, start.path)) textRange.anchor = start;
            if (PathUtils.equals(childPath, end.path)) textRange.focus = end;
            yield* positions(editor, { ...options, at: textRange });
          }
        }
      }
      if (unit === 'line' && ElementUtils.isElement(node) && !editor.isVoid(node)) {
        if (pending != null) {
          yield pending;
          pending = undefined;
        }
        done = true;
      }
    }
    if (unit === 'line') yield reverse ? end : start;
    for (let i = from; !done && (reverse ? i >= to : i <= to); i += step) yield* walk(blocks[i]);
  };
};

export const NodeUtils = {
  ...Node,
  isType: <T extends RichElement['type']>(node: unknown, type: T): node is Extract<RichElement, { type: T }> =>
    Element.isElement(node) && node.type === type,
  isInTypes: (node: unknown, types: Set<string>): node is RichElement =>
    Element.isElement(node) && types.has(node.type),
};

export const TextUtils = { ...Text };

export const PathUtils = {
  ...Path,
  isFirstEditorBlock: (path: Path) => Path.equals(path, FIRST_BLOCK_PATH),
  isFirstEditorText: (path: Path) => Path.equals(path, FIRST_TEXT_PATH),
  isFirstChild: (parent: Path, path: Path) => Path.equals(path, PathUtils.child(parent, 0)),
  child: (path: Path, index: number): Path => [...path, index],
};

export const PointUtils = {
  ...Point,
  start([, path]: NodeEntry): Point {
    return { path: PathUtils.child(path, 0), offset: 0 };
  },
  end([node, path]: NodeEntry<Ancestor>): Point {
    const last = node.children[node.children.length - 1];
    return {
      path: PathUtils.child(path, node.children.length - 1),
      offset: TextUtils.isText(last) ? last.text.length : 0,
    };
  },
  isAtStart(point: Point, entry: NodeEntry) {
    return Point.equals(point, PointUtils.start(entry));
  },
  isAtEnd(point: Point, entry: NodeEntry<Ancestor>) {
    return Point.equals(point, PointUtils.end(entry));
  },
  clamp(point: Point, range: Range) {
    const [start, end] = Range.edges(range);
    if (Point.isBefore(point, start)) point = start;
    if (Point.isAfter(point, end)) point = end;
    return point;
  },
};

export const RangeUtils = {
  ...Range,
  toPoint: (range: BaseSelection | undefined) => (range == null || Range.isExpanded(range) ? null : range.anchor),
  children([node, path]: NodeEntry<Ancestor>): Range {
    const last = node.children[node.children.length - 1];
    return {
      anchor: { path: PathUtils.child(path, 0), offset: 0 },
      focus: {
        path: PathUtils.child(path, node.children.length - 1),
        offset: TextUtils.isText(last) ? last.text.length : 0,
      },
    };
  },
  clamp(range: Range, bounds: Range): Range {
    let [start, end] = Range.edges(range);
    const [min, max] = Range.edges(bounds);
    if (Point.isBefore(start, min)) start = min;
    if (Point.isAfter(end, max)) end = max;
    return Range.isForward(range) ? { anchor: start, focus: end } : { anchor: end, focus: start };
  },
};

export const SelectionUtils = {
  equals: (a: BaseSelection | undefined, b: BaseSelection | undefined) =>
    (a == null && b == null) || (a != null && b != null && Range.equals(a, b)),
  isValid(editor: Editor, selection: BaseSelection | undefined): selection is Range {
    if (selection == null) return false;
    const { anchor, focus } = selection;
    if (!Editor.hasPath(editor, anchor.path) || !Editor.hasPath(editor, focus.path)) return false;
    const [anchorNode] = Editor.node(editor, anchor.path);
    const [focusNode] = Editor.node(editor, focus.path);
    return (
      Text.isText(anchorNode) &&
      Text.isText(focusNode) &&
      anchor.offset <= anchorNode.text.length &&
      focus.offset <= focusNode.text.length
    );
  },
};

export interface MarkdownResult {
  entries: MarkdownEntry[];
  serializedChildren: string[];
}

export const ElementUtils = {
  ...Element,
  updateElement<T extends Element>(editor: Editor, [node, path]: NodeEntry<T>): NodeEntry<T> {
    const entry = Editor.node(editor, path);
    invariant(!Editor.isEditor(node), 'Element is the root node');
    invariant(entry != null, 'Failed to find element');
    invariant(Element.isElement(entry[0]), 'Node at this path is no longer an element');
    invariant((entry[0] as Element).type === node.type, 'Node at this path is a different type');
    return entry as NodeEntry<T>;
  },
  /**
   * Tokenizes a block's text with the chat's markdown rules. `forDecorations` uses the rule set without inline
   * objects (mentions and emoji are already voids); the mention plugin parses with them to find what to convert.
   */
  markdown(editor: Editor, element: BlockElement, forDecorations?: boolean): MarkdownResult {
    const wasInCodeBlock = element.type === 'line' && element.codeBlockState?.wasInCodeBlock === true;
    const serializedChildren = ElementUtils.serializeMarkdownChildren(element);
    return {
      entries: markdownEntries(editor.context, serializedChildren.join(''), wasInCodeBlock, forDecorations === true),
      serializedChildren,
    };
  },
  serializeMarkdownChildren: (element: Element) =>
    element.children.map((child) => (Text.isText(child) ? child.text : '?')),
  isEmpty(element: Element) {
    if (element.children.length > 1) return false;
    if (element.children.length === 0) return true;
    const child = element.children[0];
    return Text.isText(child) && child.text.length === 0;
  },
};

export const EditorUtils = {
  ...Editor,
  ...ReactEditor,
  richValue: (editor: Editor) => editor.children as Descendant[],
  blocks: (editor: Editor) =>
    EditorUtils.richValue(editor).map((node, index) => [node, [index]] as NodeEntry<BlockElement>),
  isBlock: (editor: Editor, node: unknown): node is Element =>
    ElementUtils.isElement(node) && Editor.isBlock(editor, node),
  isInline: (editor: Editor, node: unknown): node is Element =>
    ElementUtils.isElement(node) && Editor.isInline(editor, node),
  isVoid: (editor: Editor, node: unknown): node is Element =>
    ElementUtils.isElement(node) && Editor.isVoid(editor, node),
  isEditorEmpty(editor: Editor) {
    const value = EditorUtils.richValue(editor);
    if (value.length > 1) return false;
    if (value.length === 0) return true;
    const first = value[0];
    return Element.isElement(first) && first.type === 'line' && ElementUtils.isEmpty(first);
  },
  getFirstText(editor: Editor) {
    const [node] = Editor.node(editor, FIRST_TEXT_PATH);
    return Text.isText(node) ? node : null;
  },
  getCurrentBlock: (editor: Editor) =>
    editor.selection == null ? null : EditorUtils.getParentBlock(editor, editor.selection),
  getCurrentElement: (editor: Editor) =>
    editor.selection == null ? null : EditorUtils.getParentElement(editor, editor.selection),
  getCurrentInline: (editor: Editor) =>
    editor.selection == null ? null : EditorUtils.getParentInline(editor, editor.selection),
  getCurrentVoid: (editor: Editor) =>
    editor.selection == null ? null : EditorUtils.getParentVoid(editor, editor.selection),
  getCurrentText(editor: Editor) {
    const point = editor.selection != null ? RangeUtils.toPoint(editor.selection) : null;
    return point == null ? null : (Editor.node(editor, point.path) as NodeEntry<Text>);
  },
  getParentBlock: (editor: Editor, at: Location) =>
    Editor.above<Element>(editor, {
      at,
      match: (node) => Element.isElement(node) && Editor.isBlock(editor, node),
      mode: 'lowest',
    }) ?? null,
  getParentElement: (editor: Editor, at: Location) =>
    Editor.above<Element>(editor, { at, match: (node) => Element.isElement(node), mode: 'lowest' }) ?? null,
  getParentInline: (editor: Editor, at: Location) =>
    Editor.above<Element>(editor, { at, match: (node) => EditorUtils.isInline(editor, node), mode: 'lowest' }) ?? null,
  getParentVoid: (editor: Editor, at: Location) =>
    Editor.above<Element>(editor, { at, match: (node) => EditorUtils.isVoid(editor, node), mode: 'lowest' }) ?? null,
  getParentOfType: (editor: Editor, at: Location, types: string[]) =>
    Editor.above<Element>(editor, {
      at,
      match: (node) => Element.isElement(node) && types.includes(node.type),
      mode: 'lowest',
    }) ?? null,
  getSelectedParentOfType(editor: Editor, types: string[]) {
    if (editor.selection == null) return null;
    const point = RangeUtils.toPoint(editor.selection);
    return point == null ? null : EditorUtils.getParentOfType(editor, point, types);
  },
  getNodesOfType: (editor: Editor, types: string[]) =>
    Editor.nodes<Element>(editor, {
      at: EDITOR_ROOT_PATH,
      match: (node) => Element.isElement(node) && types.includes(node.type),
      mode: 'highest',
    }),
  getSelectedVoid(editor: Editor) {
    if (editor.selection == null) return null;
    let point: Point | undefined;
    if (Range.isExpanded(editor.selection)) {
      const [start, end] = Range.edges(editor.selection);
      const after = Editor.after(editor, start, { unit: 'offset' });
      const before = Editor.before(editor, end, { unit: 'offset' });
      if (after == null || before == null || !Point.equals(after, before)) return null;
      point = after;
    } else point = editor.selection.anchor;
    return point == null ? null : EditorUtils.getParentVoid(editor, point);
  },
  getSelectedText(editor: Editor, fromDOM?: boolean) {
    let range: Range | null = null;
    if (fromDOM) {
      const selection = (ReactEditor.findDocumentOrShadowRoot(editor) as Document).getSelection();
      if (selection != null && selection.rangeCount > 0) {
        const domRange = selection.getRangeAt(0);
        if (domRange != null)
          range = ReactEditor.toSlateRange(editor, domRange, { exactMatch: true, suppressThrow: true });
      }
    } else range = editor.selection;
    return range == null ? '' : EditorUtils.getTextFromRange(editor, range);
  },
  getTextFromRange(editor: Editor, range: Range) {
    const [start, end] = Range.edges(range);
    let text = '';
    for (const [node, path] of Editor.nodes<Text>(editor, {
      at: range,
      mode: 'lowest',
      match: (n) => Text.isText(n),
    })) {
      const from = Path.equals(path, start.path) ? start.offset : 0;
      const to = Path.equals(path, end.path) ? end.offset : 0;
      text += node.text.substring(from, to);
    }
    return text;
  },
  withoutNormalizing(editor: Editor, fn: () => void) {
    const wasNormalizing = Editor.isNormalizing(editor);
    Editor.setNormalizing(editor, false);
    try {
      fn();
    } finally {
      Editor.setNormalizing(editor, wasNormalizing);
    }
    if (wasNormalizing !== false) Editor.normalize(editor);
  },
  /** Styling is off when markdown preview is disabled, and for `s/find/replace` and `+:emoji:` reaction shortcuts. */
  areStylesDisabled(editor: Editor) {
    if (!editor.previewMarkdown) return true;
    const value = EditorUtils.richValue(editor);
    const first = value[0];
    const text = Element.isElement(first) && first.type === 'line' ? first.children[0] : null;
    if (text == null || !Text.isText(text)) return false;
    const type = editor.chatInputType;
    const content = text.text;
    return (
      value.length === 1 &&
      (first as Element).children.length === 1 &&
      ((type.sedReplace === true && content.startsWith('s/')) ||
        (type.autocomplete?.reactions === true && (content === '+' || content.startsWith('+:'))))
    );
  },
  focus(editor: Editor) {
    if (!ReactEditor.isFocused(editor)) {
      ReactEditor.focus(editor);
      ReactEditor.deselect(editor);
    }
  },
  getSelectionOverlap(editor: Editor, at: Range | Path) {
    if (editor.selection == null) return { anchor: null, focus: null };
    let range: Range;
    if (Path.isPath(at)) {
      const nodeRange = Editor.range(editor, at);
      const [node] = Editor.node(editor, at);
      if (Element.isElement(node)) {
        const before = Editor.before(editor, at);
        const after = Editor.after(editor, at);
        range = { anchor: before ?? nodeRange.anchor, focus: after ?? nodeRange.focus };
      } else range = nodeRange;
    } else range = at;
    const [start, end] = Range.edges(range);
    const where = (point: Point): 'start' | 'end' | 'inside' | null =>
      Point.equals(point, start)
        ? 'start'
        : Point.equals(point, end)
          ? 'end'
          : Range.includes(range, point)
            ? 'inside'
            : null;
    return { anchor: where(editor.selection.anchor), focus: where(editor.selection.focus) };
  },
};

const isLineOverlapping = (a: DOMRect, b: DOMRect) => {
  const middle = (b.top + b.bottom) / 2;
  return a.top <= middle && a.bottom >= middle;
};

const isOnSameLine = (editor: Editor, a: Range, b: Range) => {
  const rectA = ReactEditor.toDOMRange(editor, a).getBoundingClientRect();
  const rectB = ReactEditor.toDOMRange(editor, b).getBoundingClientRect();
  return isLineOverlapping(rectA, rectB) && isLineOverlapping(rectB, rectA);
};

// Binary search over the positions between the point and its block's edge for the first (or last) one rendered
// on the same visual line as the point.
const findLineEdge = (editor: Editor, point: Point, positions: Point[], toStart: boolean) => {
  const target = { anchor: point, focus: point };
  let low = 0;
  let high = positions.length;
  let middle = Math.floor((low + high) / 2);
  while (middle !== low) {
    if (isOnSameLine(editor, { anchor: positions[middle], focus: positions[middle] }, target)) {
      if (toStart) high = middle;
      else low = middle;
    } else if (toStart) low = middle;
    else high = middle;
    middle = Math.floor((low + high) / 2);
    if (!toStart && middle === positions.length - 2 && high === positions.length - 1) {
      const last = positions[positions.length - 1];
      if (isOnSameLine(editor, { anchor: last, focus: last }, target)) middle = high;
    }
  }
  return positions[middle];
};

/** Visual (wrapped) line edges, for Cmd+Backspace and friends. */
export const LineUtils = {
  getLineStart(editor: Editor, point: Point, skipCurrent?: boolean) {
    const parent = EditorUtils.getParentElement(editor, point);
    if (parent == null) return null;
    const start = Editor.start(editor, parent[1]);
    const positions = Array.from(Editor.positions(editor, { at: { anchor: start, focus: point } }));
    let edge = findLineEdge(editor, point, positions, true);
    if (skipCurrent && Point.equals(point, edge) && !PointUtils.isAtEnd(point, parent)) {
      const after = Editor.after(editor, point);
      if (after == null) return edge;
      edge = findLineEdge(editor, after, positions, true);
    }
    return edge;
  },
  getLineEnd(editor: Editor, point: Point, skipCurrent?: boolean) {
    const parent = EditorUtils.getParentElement(editor, point);
    if (parent == null) return null;
    const end = Editor.end(editor, parent[1]);
    const positions = Array.from(Editor.positions(editor, { at: { anchor: point, focus: end } }));
    let edge = findLineEdge(editor, point, positions, false);
    if (skipCurrent && Point.equals(point, edge) && !PointUtils.isAtEnd(point, parent)) {
      const after = Editor.after(editor, point);
      if (after == null) return edge;
      edge = findLineEdge(editor, after, positions, false);
    }
    return edge;
  },
};

patchPositions();
