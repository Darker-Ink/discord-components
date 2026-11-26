import type { Editor, NodeEntry, Point } from 'slate';
import { HistoryUtils } from '../history';
import { serializeNode } from '../serialize';
import { EditorUtils, PathUtils, RangeUtils, TextUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';
import { FIRST_TEXT_PATH } from '../constants';
import type { BlockElement, CodeBlockState, CodeHighlightSpan } from '../types';

// Lines between ``` fences are marked as code (`codeBlockState`), which the renderer shows as code lines and the
// markdown pass leaves alone. Syntax highlighting of the code comes from `context.highlightCode` when given (the
// client highlights with a WebAssembly tree-sitter build).

const LINE_TYPES = new Set(['line']);
const LANGUAGE_RE = /^[a-z0-9_+\-.#]+$/i;

interface LineState {
  blockEntry: NodeEntry<BlockElement>;
  wasInCodeBlock: boolean;
  isInCodeBlock: boolean;
  isStyledCodeBlockLine: boolean;
  lang: string | null;
  hljsTypes: CodeHighlightSpan[] | null;
  closesCodeBlock: boolean;
  opensCodeBlock: boolean;
  opensCodeBlockOnOwnLine: boolean;
}

const fencePositions = ([block, path]: NodeEntry<BlockElement>) => {
  if (!LINE_TYPES.has(block.type)) return [];
  const positions: Point[] = [];
  const re = /\\|```/g;
  for (let i = 0; i < block.children.length; i++) {
    const child = block.children[i];
    if (!TextUtils.isText(child)) continue;
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(child.text)) != null) {
      if (match[0] === '\\') {
        re.lastIndex += 1;
        continue;
      }
      positions.push({ path: PathUtils.child(path, i), offset: match.index });
    }
  }
  return positions;
};

const lineState = (
  editor: Editor,
  entry: NodeEntry<BlockElement>,
  wasInCodeBlock: boolean,
  wasStyled: boolean,
  previousLang: string | null,
): LineState => {
  const fences = fencePositions(entry);
  const first = fences[0];
  const last = fences[fences.length - 1];
  let afterLastFence: string | null = null;
  if (last != null) {
    const [node] = EditorUtils.node(editor, last.path);
    afterLastFence = TextUtils.isText(node) ? node.text.substring(last.offset + 3) : null;
  }
  const closes = wasInCodeBlock && first != null;
  const stillIn = wasInCodeBlock && fences.length === 0;
  const styled = wasStyled && fences.length === 0;
  const opens = (closes ? fences.slice(1) : fences).length % 2 === 1;
  const onOwnLine =
    opens && (afterLastFence == null || afterLastFence === '' || afterLastFence.match(LANGUAGE_RE) != null);
  const lang = onOwnLine && afterLastFence != null && afterLastFence !== '' ? afterLastFence.toLowerCase() : null;
  return {
    blockEntry: entry,
    wasInCodeBlock,
    isInCodeBlock: stillIn,
    isStyledCodeBlockLine: styled,
    lang: opens || closes ? lang : previousLang,
    hljsTypes: null,
    closesCodeBlock: closes,
    opensCodeBlock: opens,
    opensCodeBlockOnOwnLine: onOwnLine,
  };
};

const highlight = (editor: Editor, states: LineState[]) => {
  const highlightCode = editor.context.highlightCode;
  let lines: LineState[] = [];
  let inside = false;
  for (const state of states) {
    const isLast = state === states[states.length - 1];
    if (state.closesCodeBlock || isLast) {
      if (inside && isLast && !state.closesCodeBlock) lines.push(state);
      inside = false;
      if (lines.length > 0) {
        const code = lines.map((line) => serializeNode(line.blockEntry[0])).join('\n');
        const lang = lines[0].lang;
        const spans = lang != null && highlightCode != null ? highlightCode(code, lang) : null;
        for (let i = 0; i < lines.length; i++)
          lines[i].hljsTypes = spans != null && spans.length === lines.length ? spans[i] : [];
        lines = [];
      }
    }
    if (inside) lines.push(state);
    if (state.opensCodeBlock) inside = true;
  }
};

const updateCodeBlocks = (editor: Editor) => {
  const states: LineState[] = [];
  let previous: LineState | null = null;
  for (const entry of EditorUtils.blocks(editor)) {
    previous = lineState(
      editor,
      entry,
      previous != null && (previous.isInCodeBlock || previous.opensCodeBlock),
      previous != null && (previous.isStyledCodeBlockLine || previous.opensCodeBlockOnOwnLine),
      previous != null && (previous.opensCodeBlock || !previous.closesCodeBlock) ? previous.lang : null,
    );
    states.push(previous);
  }
  highlight(editor, states);
  for (const state of states) {
    const [block, path] = state.blockEntry;
    const codeBlockState: CodeBlockState | null =
      state.isStyledCodeBlockLine || state.wasInCodeBlock
        ? {
            lang: state.lang,
            wasInCodeBlock: state.wasInCodeBlock,
            isInCodeBlock: state.isInCodeBlock,
            isStyledCodeBlockLine: state.isStyledCodeBlockLine,
            hljsTypes: state.hljsTypes,
          }
        : null;
    // Compared loosely like the client: a missing state and `null` are the same.
    const current = block.type === 'line' ? block.codeBlockState : undefined;
    if (current != codeBlockState) SlateTransforms.setNodes(editor, { codeBlockState }, { at: path });
  }
};

export const withCodeBlocks = (editor: Editor) => {
  const { onChange } = editor;
  let lastValue: unknown = null;
  editor.onChange = () => {
    if (EditorUtils.richValue(editor) !== lastValue) {
      HistoryUtils.withoutSaving(editor, () => {
        EditorUtils.withoutNormalizing(editor, () => updateCodeBlocks(editor));
      });
      lastValue = EditorUtils.richValue(editor);
    }
    onChange();
  };
  return editor;
};

/** Whether a point is inside a code block (an odd number of fences before it). */
export const isPointInCodeBlock = (editor: Editor, point: Point) => {
  let count = 0;
  for (const [node, path] of EditorUtils.nodes(editor, {
    at: { anchor: { path: FIRST_TEXT_PATH, offset: 0 }, focus: point },
    mode: 'lowest',
    match: (n) => TextUtils.isText(n),
  })) {
    let text = (node as { text: string }).text;
    if (PathUtils.equals(path, point.path)) text = text.substring(0, point.offset);
    count += text.match(/```/g)?.length ?? 0;
  }
  return count % 2 !== 0;
};

export const isSelectionInCodeBlock = (editor: Editor) =>
  editor.selection != null && isPointInCodeBlock(editor, RangeUtils.start(editor.selection));
