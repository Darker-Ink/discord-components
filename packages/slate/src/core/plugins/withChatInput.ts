import type { BaseSelection, Descendant, Editor, Operation } from 'slate';
import { Editor as SlateEditor } from 'slate';
import { validateLinkTarget } from '@discord-mana/markdown/internal';
import { withReact } from '../../slate-react';
import { SELECTABLE_VOID_TYPES } from '../constants';
import { HistoryUtils } from '../history';
import { toTextValue } from '../serialize';
import { EditorUtils, LineUtils, PathUtils, PointUtils, RangeUtils, SelectionUtils } from '../slateUtils';
import { SlateTransforms } from '../transforms';
import type { HistoryEntry } from '../types';
import { INLINE_INPUT_TYPES } from './withMentions';

/**
 * slate-react, keeping Slate's own mark and clipboard methods (the client replaces them below) and deleting
 * to the start/end of the visual line for Cmd+Backspace/Delete.
 */
export const withReactEditor = (editor: Editor) => {
  const {
    addMark,
    removeMark,
    deleteBackward,
    deleteForward,
    setFragmentData,
    insertData,
    insertFragmentData,
    insertTextData,
  } = editor;
  editor = withReact(editor);
  editor.addMark = addMark;
  editor.removeMark = removeMark;
  editor.setFragmentData = setFragmentData;
  editor.insertData = insertData;
  editor.insertFragmentData = insertFragmentData;
  editor.insertTextData = insertTextData;
  editor.deleteBackward = (unit) => {
    if (unit === 'line') {
      const point = RangeUtils.toPoint(editor.selection);
      if (point != null) {
        const before = EditorUtils.before(editor, point, { unit });
        if (before != null) {
          const lineStart = LineUtils.getLineStart(editor, point, false);
          SlateTransforms.delete(editor, {
            at: {
              anchor: lineStart != null && PointUtils.isAfter(lineStart, before) ? lineStart : before,
              focus: point,
            },
          });
          return;
        }
      }
    }
    deleteBackward(unit);
  };
  editor.deleteForward = (unit) => {
    if (unit === 'line') {
      const point = RangeUtils.toPoint(editor.selection);
      if (point != null) {
        const after = EditorUtils.after(editor, point, { unit });
        if (after != null) {
          const lineEnd = LineUtils.getLineEnd(editor, point, false);
          SlateTransforms.delete(editor, {
            at: { anchor: lineEnd != null && PointUtils.isBefore(lineEnd, after) ? lineEnd : after, focus: point },
          });
          return;
        }
      }
    }
    deleteForward(unit);
  };
  return editor;
};

/**
 * Copy writes the selection as plain text; paste inserts plain text only. Pasting a URL over selected text that
 * isn't a URL makes a masked link (`[text](url)`).
 */
export const withClipboard = (editor: Editor) => {
  editor.setFragmentData = (data) => {
    if (editor.selection != null && !PointUtils.equals(editor.selection.anchor, editor.selection.focus)) {
      const text = toTextValue(EditorUtils.richValue(editor), {
        mode: 'plain',
        range: editor.selection,
        preventEmojiSurrogates: true,
        resolvers: editor.context.resolvers,
      });
      data.setData('text/plain', text);
    }
  };
  editor.insertData = (data) => {
    editor.insertTextData(data);
  };
  editor.insertFragmentData = () => false;
  editor.insertTextData = (data) => {
    const text = data.getData('text/plain');
    if (text.length === 0) return false;
    if (editor.selection != null && RangeUtils.isExpanded(editor.selection)) {
      const selected = SlateEditor.string(editor, editor.selection);
      const pastedLink = validateLinkTarget(text);
      const selectedLink = validateLinkTarget(selected);
      if (pastedLink != null && selectedLink == null) {
        const [start, end] = RangeUtils.edges(editor.selection);
        EditorUtils.withoutNormalizing(editor, () => {
          SlateTransforms.select(editor, start);
          editor.insertText('[');
          SlateTransforms.select(editor, end);
          if (PathUtils.compare(start.path, end.path) === 0) SlateTransforms.move(editor, { distance: 1 });
          editor.insertText(`](${pastedLink.target})`);
        });
        return true;
      }
      if (pastedLink != null && selectedLink != null) {
        SlateTransforms.delete(editor, { at: editor.selection });
        editor.insertText(pastedLink.target);
        return true;
      }
      SlateTransforms.delete(editor, { at: editor.selection });
    }
    editor.insertText(text);
    return true;
  };
  return editor;
};

const canSplitLines = (editor: Editor) => {
  const block = EditorUtils.getCurrentBlock(editor);
  const inline = EditorUtils.getCurrentInline(editor);
  return (
    block != null &&
    block[0].type !== ('applicationCommand' as string) &&
    !INLINE_INPUT_TYPES.has(inline?.[0]?.type ?? '')
  );
};

/** Enter and pasted newlines split lines (where lines can be split); Shift+Enter is the same as Enter. */
export const withLines = (editor: Editor) => {
  const { insertBreak, insertText } = editor;
  editor.rendersTrailingNewline = () => false;
  editor.insertBreak = () => {
    if (canSplitLines(editor)) insertBreak();
  };
  editor.insertSoftBreak = () => {
    editor.insertBreak();
  };
  editor.insertText = (text) => {
    if (text.indexOf('\r') < 0 && text.indexOf('\n') < 0) {
      insertText(text);
      return;
    }
    const lines = text.split(/\r\n|\r|\n/);
    if (canSplitLines(editor))
      HistoryUtils.withSingleEntry(editor, () => {
        let split = false;
        for (const line of lines) {
          if (split) SlateTransforms.splitNodes(editor, { always: true });
          insertText(line);
          split = true;
        }
      });
    else insertText(lines.join(' '));
  };
  return editor;
};

/** Keeps the selection valid and out of voids (it moves to the nearest edge outside the void). */
export const withSelectionFix = (editor: Editor) => {
  const { apply, onChange } = editor;
  editor.apply = (operation) => {
    apply(operation);
    if (SelectionUtils.isValid(editor, editor.selection)) editor.lastGoodSelection = editor.selection;
  };
  editor.onChange = () => {
    if (!SelectionUtils.isValid(editor, editor.selection)) {
      if (SelectionUtils.isValid(editor, editor.lastGoodSelection)) editor.selection = editor.lastGoodSelection;
      else {
        const end = EditorUtils.end(editor, []);
        editor.selection = { anchor: end, focus: end };
      }
    }
    if (editor.selection != null) {
      let [start, end] = RangeUtils.edges(editor.selection);
      let moved = false;
      let entry;
      while (
        start != null &&
        (entry = EditorUtils.getParentVoid(editor, start)) != null &&
        !SELECTABLE_VOID_TYPES.includes(entry[0].type)
      ) {
        start = EditorUtils.before(editor, start, { unit: 'offset' })!;
        moved = true;
      }
      while (
        end != null &&
        (entry = EditorUtils.getParentVoid(editor, end)) != null &&
        !SELECTABLE_VOID_TYPES.includes(entry[0].type)
      ) {
        end = EditorUtils.after(editor, end, { unit: 'offset' })!;
        moved = true;
      }
      if (moved && start != null && end != null)
        SlateTransforms.select(
          editor,
          RangeUtils.isForward(editor.selection) ? { anchor: start, focus: end } : { anchor: end, focus: start },
        );
    }
    onChange();
  };
  return editor;
};

/**
 * Plugins change the value from `onChange`, which triggers another `onChange`; run them again (up to five times)
 * until the value settles, between `onChangeStart` and `onChangeEnd`.
 */
export const withChangeLoop = (editor: Editor, onChangeStart?: () => void, onChangeEnd?: () => void) => {
  const { onChange } = editor;
  let running = false;
  let again = false;
  editor.onChange = () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      let iterations = 0;
      do {
        again = false;
        if (iterations++ >= 5) break;
        onChangeStart?.();
        try {
          onChange();
        } finally {
          onChangeEnd?.();
        }
      } while (again);
    } finally {
      running = false;
    }
  };
  return editor;
};

const snapshot = (editor: Editor): HistoryEntry => ({
  type: 'other',
  mergeable: false,
  createdAt: Date.now(),
  value: EditorUtils.richValue(editor),
  selection: editor.selection,
});

const MERGE_WINDOW = 4000;

const recordOperation = (editor: Editor, operation: Operation, previous: Operation | null) => {
  const { selection } = editor;
  const entry = HistoryUtils.currentEntry(editor);
  let type: HistoryEntry['type'];
  let mergeable = true;
  let canMerge = true;
  if (operation.type === 'insert_text' && operation.text.length === 1) {
    type = 'insert';
    // A word typed after a space starts a new entry.
    canMerge = !(
      (operation.text === '' || operation.text.endsWith(' ')) &&
      previous?.type === 'insert_text' &&
      !(previous.text === '' && previous.text.endsWith(' '))
    );
  } else if (operation.type === 'split_node') type = 'insert';
  else if (operation.type === 'remove_text' && operation.text.length === 1) type = 'delete';
  else {
    type = 'other';
    mergeable = false;
    canMerge = false;
  }
  if (operation.type === 'set_selection' && entry != null) {
    entry.selection = selection;
    return;
  }
  if (mergeable && entry?.type === type && Date.now() - entry.createdAt < MERGE_WINDOW)
    HistoryUtils.insertOrMergeEntry(editor, type, canMerge);
  else HistoryUtils.insertEntry(editor, type, canMerge);
};

/** Undo/redo over whole-value snapshots; `restore` puts a snapshot back into the editor. */
export const withHistory = (
  editor: Editor,
  restore: (entry: { newValue: Descendant[]; newSelection: BaseSelection }) => void,
) => {
  const { apply, deleteBackward, deleteForward, deleteFragment, insertData, insertText, onChange } = editor;
  const goTo = (index: number) => {
    const entry = HistoryUtils.currentEntry(editor);
    if (entry != null) entry.mergeable = false;
    if (index >= editor.history.stack.length) return;
    editor.history.index = index;
    const target = HistoryUtils.currentEntry(editor)!;
    restore({ newValue: target.value, newSelection: target.selection });
  };
  editor.history = { index: 0, stack: [] };
  let previousOperation: Operation | null = null;
  let lastOperation: Operation | null = null;
  let lastValue: unknown = null;
  editor.onChange = () => {
    const { history } = editor;
    if (history.stack.length === 0) {
      history.stack = [snapshot(editor)];
      history.index = 0;
    }
    if (editor.selection != null) HistoryUtils.currentEntry(editor)!.selection = editor.selection;
    lastOperation = null;
    onChange();
  };
  editor.undo = () => {
    if (editor.history.index > 0) goTo(editor.history.index - 1);
  };
  editor.redo = () => {
    if (editor.history.index < editor.history.stack.length - 1) goTo(editor.history.index + 1);
  };
  editor.apply = (operation) => {
    const { history } = editor;
    apply(operation);
    const value = EditorUtils.richValue(editor);
    if (value !== lastValue) {
      if (history.stack.length === 0) {
        history.stack = [snapshot(editor)];
        history.index = 0;
      }
      if (HistoryUtils.isSaving(editor)) {
        recordOperation(editor, operation, previousOperation);
        previousOperation = operation;
      }
      lastOperation = operation;
      lastValue = value;
    }
  };
  editor.deleteBackward = (unit) => {
    HistoryUtils.withSingleEntry(editor, () => deleteBackward(unit));
  };
  editor.deleteForward = (unit) => {
    HistoryUtils.withSingleEntry(editor, () => deleteForward(unit));
  };
  editor.deleteFragment = (direction) => {
    HistoryUtils.withSingleEntry(editor, () => deleteFragment(direction));
  };
  editor.insertText = (text) => {
    if (text.length === 1 && lastOperation?.type === 'remove_text')
      HistoryUtils.withMergedEntry(editor, () => insertText(text));
    else if (editor.selection != null && RangeUtils.isExpanded(editor.selection))
      HistoryUtils.withSingleEntry(editor, () => insertText(text));
    else insertText(text);
  };
  editor.insertData = (data) => {
    if (lastOperation?.type === 'remove_text') HistoryUtils.withMergedEntry(editor, () => insertData(data));
    else HistoryUtils.withSingleEntry(editor, () => insertData(data));
  };
  return editor;
};
