import { createEditor as createSlateEditor } from 'slate';
import type { BaseSelection, Descendant, Editor } from 'slate';
import type { ChatInputType } from '../chatInputTypes';
import { EDITOR_START_POINT } from './constants';
import type { EditorContextValue } from './context';
import { toRichValue } from './serialize';
import type { DiscordEditor, EditorEvents } from './types';
import { withBlockQuotes } from './plugins/withBlockQuotes';
import {
  withChangeLoop,
  withClipboard,
  withHistory,
  withLines,
  withReactEditor,
  withSelectionFix,
} from './plugins/withChatInput';
import { withCodeBlocks } from './plugins/withCodeBlocks';
import { withInlines } from './plugins/withInlines';
import { withKeyboard } from './plugins/withKeyboard';
import { withMentions } from './plugins/withMentions';

const createEvents = (): EditorEvents => {
  const listeners = new Set<() => void>();
  return {
    addListener: (_event, listener) => void listeners.add(listener),
    removeListener: (_event, listener) => void listeners.delete(listener),
    emit: () => {
      for (const listener of [...listeners]) listener();
    },
  };
};

export interface CreateEditorOptions {
  chatInputType: ChatInputType;
  context: EditorContextValue;
  previewMarkdown?: boolean;
  /** Runs before/after each settle pass of `onChange` (the editor component pauses value sync meanwhile). */
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
  /** Puts a value into the editor (undo/redo go through it, like a value change from the parent). */
  updateState?: (
    editor: Editor,
    source: 'undo' | 'parent',
    state: { value?: Descendant[]; selection?: BaseSelection },
  ) => void;
}

/** The client's editor: Slate with its plugins, in the client's order. */
export const createEditor = ({
  chatInputType,
  context,
  previewMarkdown = true,
  onChangeStart,
  onChangeEnd,
  updateState,
}: CreateEditorOptions): DiscordEditor => {
  let editor = createSlateEditor() as Editor;
  editor.children = toRichValue('');
  editor.selection = { anchor: EDITOR_START_POINT, focus: EDITOR_START_POINT };
  const { onChange } = editor;
  editor.chatInputType = chatInputType;
  editor.context = context;
  editor.previewMarkdown = previewMarkdown;
  editor.composition = null;
  editor.events = createEvents();
  editor.isMac = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel';
  editor.onChange = (options) => {
    editor.events.emit('onChange');
    onChange(options);
  };
  editor = withReactEditor(editor);
  editor = withClipboard(editor);
  editor = withInlines(editor);
  editor = withMentions(editor);
  if (!chatInputType.markdown?.disableBlockQuotes) editor = withBlockQuotes(editor);
  if (!chatInputType.markdown?.disableCodeBlocks) editor = withCodeBlocks(editor);
  editor = withKeyboard(editor);
  editor = withLines(editor);
  editor = withSelectionFix(editor);
  editor = withChangeLoop(editor, onChangeStart, onChangeEnd);
  const result = editor;
  editor = withHistory(editor, ({ newValue, newSelection }) =>
    updateState?.(result, 'undo', { value: newValue, selection: newSelection }),
  );
  return editor as DiscordEditor;
};
