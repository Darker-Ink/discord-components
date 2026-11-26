import type { BaseSelection, Descendant, Editor } from 'slate';
import { EditorUtils, RangeUtils } from './slateUtils';
import type { HistoryEntry } from './types';

// The client's undo history: whole-value snapshots rather than Slate operations. Typing merges into the current
// entry; `withSingleEntry` groups a change into one entry.

const SAVING = new WeakMap<Editor, boolean>();
const MERGING = new WeakMap<Editor, boolean>();
const MAX_ENTRIES = 250;

const run = <T>(editor: Editor, type: HistoryEntry['type'], merge: boolean, fn: () => T): T => {
  const children = editor.children;
  const selection = editor.selection;
  const saving = HistoryUtils.isSaving(editor);
  SAVING.set(editor, false);
  try {
    const result = fn();
    if (saving) {
      if (merge) HistoryUtils.mergeEntry(editor);
      else if (editor.children !== children) HistoryUtils.insertEntry(editor, type, false);
      else if (
        HistoryUtils.isMerging(editor) &&
        editor.selection != null &&
        (selection == null || !RangeUtils.equals(editor.selection, selection))
      )
        HistoryUtils.mergeEntry(editor);
    }
    return result;
  } finally {
    SAVING.set(editor, saving);
  }
};

export const HistoryUtils = {
  isMerging: (editor: Editor) => MERGING.get(editor) ?? true,
  isSaving: (editor: Editor) => SAVING.get(editor) ?? true,
  withoutMerging(editor: Editor, fn: () => void) {
    const merging = HistoryUtils.isMerging(editor);
    MERGING.set(editor, false);
    try {
      fn();
    } finally {
      MERGING.set(editor, merging);
    }
  },
  withoutSaving(editor: Editor, fn: () => void) {
    const saving = HistoryUtils.isSaving(editor);
    SAVING.set(editor, false);
    try {
      fn();
    } finally {
      SAVING.set(editor, saving);
    }
  },
  withSingleEntry: <T>(editor: Editor, fn: () => T) => run(editor, 'other', false, fn),
  withMergedEntry: <T>(editor: Editor, fn: () => T) => run(editor, 'other', true, fn),
  currentEntry: (editor: Editor): HistoryEntry | null =>
    editor.history.stack.length > 0 ? editor.history.stack[editor.history.index] : null,
  insertOrMergeEntry(editor: Editor, type: HistoryEntry['type'], mergeable = true) {
    const entry = HistoryUtils.currentEntry(editor);
    if (HistoryUtils.isMerging(editor) && entry?.mergeable) HistoryUtils.mergeEntry(editor, mergeable);
    else HistoryUtils.insertEntry(editor, type, mergeable);
  },
  insertEntry(
    editor: Editor,
    type: HistoryEntry['type'],
    mergeable = true,
    value?: Descendant[],
    selection?: BaseSelection,
  ) {
    selection = selection ?? editor.selection;
    value = value ?? EditorUtils.richValue(editor);
    const { history } = editor;
    const entry = HistoryUtils.currentEntry(editor);
    if (entry != null) entry.mergeable = false;
    if (history.stack.length > 0) history.stack.length = history.index + 1;
    while (history.stack.length >= MAX_ENTRIES) history.stack.shift();
    history.stack.push({ type, mergeable, createdAt: Date.now(), value, selection });
    history.index = history.stack.length - 1;
  },
  mergeEntry(editor: Editor, mergeable = true) {
    const { selection } = editor;
    const value = EditorUtils.richValue(editor);
    const entry = HistoryUtils.currentEntry(editor);
    if (entry != null) {
      entry.value = value;
      entry.selection = selection;
      if (!mergeable) entry.mergeable = false;
    }
  },
};
