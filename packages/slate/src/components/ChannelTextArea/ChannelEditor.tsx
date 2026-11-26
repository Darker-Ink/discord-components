import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import clsx from 'clsx';
import type { BaseSelection, Descendant, Editor, NodeEntry } from 'slate';
import { ReactEditor } from '../../slate-react';
import type { ChatInputType } from '../../chatInputTypes';
import { WORD_SEPARATOR_RE } from '../../core/constants';
import type { EditorContextValue } from '../../core/context';
import { createEditor } from '../../core/createEditor';
import { decorateCodeBlock, decorateMarkdown } from '../../core/decorations';
import { HistoryUtils } from '../../core/history';
import { matchesModifiers } from '../../core/plugins/withKeyboard';
import { isSelectionInCodeBlock } from '../../core/plugins/withCodeBlocks';
import { updateMentions } from '../../core/plugins/withMentions';
import { toTextValue } from '../../core/serialize';
import { EditorUtils, PathUtils, RangeUtils, SelectionUtils, TextUtils } from '../../core/slateUtils';
import { SlateTransforms } from '../../core/transforms';
import type { DiscordEditor, RichValue } from '../../core/types';
import { RichEditor } from '../RichEditor/RichEditor';
import styles from './ChannelEditor.module.css';

const AUTOCOMPLETE_PREFIXES = ['+:', '@', '#', ':', '/'].sort((a, b) => b.length - a.length);
const OPENING_PUNCTUATION = new Set(['(']);

/** The word being typed, trimmed to start at an autocomplete prefix (`@`, `#`, `:`…) when it has one. */
export const trimToAutocompletePrefix = (word: string, fullWord: string) => {
  let trimmed = word;
  outer: for (let i = 0; i < word.length; i++)
    if (i === 0 || WORD_SEPARATOR_RE.test(word[i - 1]) || OPENING_PUNCTUATION.has(word[i - 1]))
      for (const prefix of AUTOCOMPLETE_PREFIXES)
        if (word.startsWith(prefix, i)) {
          trimmed = word.slice(i);
          break outer;
        }
  const removed = word.length - trimmed.length;
  return { word: trimmed, fullWord: fullWord.slice(removed), didTrimPrefix: removed > 0 };
};

export interface CurrentWord {
  word: string | null;
  fullWord?: string | null;
  isAtStart: boolean;
}

export interface ChannelEditorHandle {
  getSlateEditor: () => DiscordEditor;
  submit: (event?: { preventDefault: () => void }) => void;
  focus: () => void;
  blur: () => void;
  getCurrentWord: () => CurrentWord;
  getFirstText: () => string;
  /** Inserts text at the caret; `rawText` (message syntax, e.g. `<@id>`) wins when styles are on. */
  insertText: (text: string, rawText?: string | null, addSpace?: boolean) => void;
  /** Replaces the word being typed with an autocomplete result. */
  insertAutocomplete: (
    text: string,
    rawText?: string | null,
    options?: { addSpace?: boolean; replaceFullWord?: boolean },
  ) => void;
  insertEmoji: (options: {
    emoji: { id?: string | null; name: string; originalName?: string; animated?: boolean; surrogates?: string };
    addSpace?: boolean;
  }) => void;
}

export interface ChannelEditorProps {
  ref?: Ref<ChannelEditorHandle>;
  value: RichValue;
  type: ChatInputType;
  context: EditorContextValue;
  className?: string;
  id?: string;
  disabled?: boolean;
  submitting?: boolean;
  placeholder?: string;
  required?: boolean;
  textAreaPaddingClassName?: string;
  previewMarkdown?: boolean;
  spellcheckEnabled?: boolean;
  disableAutoFocus?: boolean;
  disableEnterToSubmit?: boolean;
  allowNewLines?: boolean;
  onChange?: (textValue: string, richValue: Descendant[]) => void;
  /** Returns true when it handled the paste (files); the editor then ignores it. */
  onPaste?: (event: ClipboardEvent<HTMLDivElement>) => boolean;
  onResize?: (height: number) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Autocomplete hooks: return true when the key was used. */
  onTab?: () => boolean;
  onEnter?: (event: KeyboardEvent<HTMLDivElement>) => boolean;
  onSpace?: () => boolean;
  moveSelection?: (delta: number) => boolean;
  maybeShowAutocomplete?: () => void;
  hideAutocomplete?: () => void;
  onSubmit?: (value: string) => void;
  'aria-owns'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup'];
  'aria-activedescendant'?: string;
  'aria-controls'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-autocomplete'?: React.AriaAttributes['aria-autocomplete'];
}

const insertRawOrPlain = (editor: Editor, text: string, rawText: string | null | undefined, addSpace: boolean) => {
  const value = EditorUtils.areStylesDisabled(editor) || rawText == null ? text : rawText;
  HistoryUtils.withSingleEntry(editor, () => {
    SlateTransforms.insertText(editor, addSpace ? value + ' ' : value);
  });
};

const findEditorNode = (editor: DiscordEditor) => {
  try {
    return ReactEditor.toDOMNode(editor, editor);
  } catch {
    return null;
  }
};

/** The client's Slate chat editor (`SlateChannelTextArea`): value sync with the parent, submit and keys. */
export const ChannelEditor = ({
  ref,
  value,
  type,
  context,
  className,
  id,
  disabled = false,
  submitting = false,
  placeholder,
  required,
  textAreaPaddingClassName,
  previewMarkdown = true,
  spellcheckEnabled,
  disableAutoFocus = false,
  disableEnterToSubmit = false,
  allowNewLines = true,
  onChange,
  onPaste,
  onResize,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  onTab,
  onEnter,
  onSpace,
  moveSelection,
  maybeShowAutocomplete,
  hideAutocomplete,
  onSubmit,
  ...aria
}: ChannelEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<Descendant[] | null>(null);
  const syncFromParentRef = useRef(true);
  const emitChangesRef = useRef(true);
  const readOnly = disabled || submitting;

  const updateState = useCallback(
    (editor: Editor, source: 'undo' | 'parent', state: { value?: Descendant[]; selection?: BaseSelection }) => {
      let { selection } = state;
      const next = state.value;
      const current = EditorUtils.richValue(editor);
      const previousSelection = editor.selection;
      let changed = false;
      if (next !== undefined && next !== current) {
        editor.children = next;
        // An edited message's text arrives with its mentions as text; convert them before showing it.
        if (source === 'parent' && !editor.previewMarkdown && editor.chatInputType.analyticsName === 'edit') {
          try {
            editor.previewMarkdown = true;
            updateMentions(editor);
          } finally {
            editor.previewMarkdown = false;
          }
          updateMentions(editor);
          selection = undefined;
        }
        if (source !== 'undo') HistoryUtils.insertEntry(editor, 'other', false, current, previousSelection);
        changed = true;
      }
      if (selection != null && !SelectionUtils.isValid(editor, selection)) selection = undefined;
      if ((changed || !SelectionUtils.isValid(editor, previousSelection)) && selection === undefined) {
        const end = EditorUtils.end(editor, []);
        selection = { anchor: end, focus: end };
      }
      if (selection != null && !SelectionUtils.equals(selection, previousSelection)) {
        editor.selection = selection;
        const entry = HistoryUtils.currentEntry(editor);
        if (entry != null) entry.selection = selection;
        changed = true;
      }
      if (changed) {
        if (source === 'parent')
          try {
            emitChangesRef.current = false;
            editor.onChange();
          } finally {
            emitChangesRef.current = true;
          }
        else editor.onChange();
      }
    },
    [],
  );

  const editorRef = useRef<DiscordEditor | null>(null);
  if (editorRef.current == null)
    editorRef.current = createEditor({
      chatInputType: type,
      context,
      previewMarkdown,
      onChangeStart: () => {
        syncFromParentRef.current = false;
      },
      onChangeEnd: () => {
        syncFromParentRef.current = true;
      },
      updateState,
    });
  const editor = editorRef.current;
  editor.context = context;

  useEffect(() => {
    if (editor.previewMarkdown !== previewMarkdown) {
      editor.previewMarkdown = previewMarkdown;
      editor.onChange();
    }
  }, [editor, previewMarkdown]);

  const submit = useCallback(() => {
    onSubmit?.(
      toTextValue(EditorUtils.richValue(editor), {
        mode: 'raw',
        ignoreTrailingEmptyNodes: true,
        resolvers: editor.context.resolvers,
      }),
    );
  }, [editor, onSubmit]);

  const getCurrentWord = useCallback((): CurrentWord => {
    const selection = editor.selection;
    if (
      selection == null ||
      !SelectionUtils.isValid(editor, selection) ||
      RangeUtils.isExpanded(selection) ||
      isSelectionInCodeBlock(editor)
    )
      return { word: null, isAtStart: false };
    const [, blockPath] = EditorUtils.node(editor, PathUtils.parent(selection.anchor.path));
    let [node, path] = EditorUtils.node(editor, selection.anchor.path);
    let offset = selection.anchor.offset;
    let before = '';
    let atStart = false;
    for (;;) {
      if (--offset < 0) {
        if (!PathUtils.hasPrevious(path)) {
          atStart = true;
          break;
        }
        [node, path] = EditorUtils.node(editor, PathUtils.previous(path));
      }
      if (!TextUtils.isText(node)) break;
      const char = node.text[offset];
      if (WORD_SEPARATOR_RE.test(char)) break;
      before = char + before;
    }
    let full = before;
    let index = selection.anchor.offset;
    const [current] = EditorUtils.node(editor, selection.anchor.path);
    while (TextUtils.isText(current) && index < current.text.length) {
      const char = current.text[index];
      if (WORD_SEPARATOR_RE.test(char)) break;
      full += char;
      index++;
    }
    const result = trimToAutocompletePrefix(before, full);
    return {
      word: result.word,
      fullWord: result.fullWord,
      isAtStart: !result.didTrimPrefix && atStart && PathUtils.isFirstEditorBlock(blockPath),
    };
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      getSlateEditor: () => editor,
      submit(event) {
        event?.preventDefault();
        submit();
      },
      focus() {
        EditorUtils.focus(editor);
      },
      blur() {
        ReactEditor.blur(editor);
      },
      getCurrentWord,
      getFirstText: () => EditorUtils.getFirstText(editor)?.text ?? '',
      insertText(text, rawText = null, addSpace = false) {
        HistoryUtils.withSingleEntry(editor, () => insertRawOrPlain(editor, text, rawText, addSpace));
      },
      insertAutocomplete(text, rawText = null, { addSpace = true, replaceFullWord = false } = {}) {
        HistoryUtils.withSingleEntry(editor, () => {
          const { word, fullWord } = getCurrentWord();
          if (word != null && word.length > 0)
            SlateTransforms.delete(editor, { distance: word.length, unit: 'character', reverse: true });
          if (replaceFullWord && word != null && fullWord != null && fullWord.length - word.length > 0)
            SlateTransforms.delete(editor, { distance: fullWord.length - word.length, unit: 'character' });
          insertRawOrPlain(editor, text, rawText, addSpace);
        });
      },
      insertEmoji({ emoji, addSpace = false }) {
        HistoryUtils.withSingleEntry(editor, () => {
          const name = (emoji.originalName ?? emoji.name ?? '').replace(/:/g, '');
          insertRawOrPlain(
            editor,
            `:${emoji.name}:`,
            emoji.id != null ? `<${emoji.animated ? 'a' : ''}:${name}:${emoji.id}>` : null,
            addSpace,
          );
        });
      },
    }),
    [editor, submit, getCurrentWord],
  );

  // The editor is absolutely positioned inside its container, so the container follows its height.
  const heightRef = useRef<number | null>(null);
  const updateHeight = useCallback(() => {
    const node = findEditorNode(editor);
    if (node == null) return;
    const height = node.offsetHeight;
    if (heightRef.current !== height) {
      if (containerRef.current != null) containerRef.current.style.height = `${height}px`;
      heightRef.current = height;
      onResize?.(height);
    }
  }, [editor, onResize]);
  useLayoutEffect(() => {
    const node = findEditorNode(editor);
    if (node == null || typeof ResizeObserver === 'undefined') return;
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    // Also measure after edits and image loads: a resize that happens while the observer is being replaced
    // (React re-running effects) would otherwise leave the container at a stale height.
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateHeight);
    };
    editor.events.addListener('onChange', schedule);
    node.addEventListener('load', schedule, true);
    schedule();
    document.fonts?.ready.then(schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      editor.events.removeListener('onChange', schedule);
      node.removeEventListener('load', schedule, true);
    };
  }, [editor, updateHeight]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowUp':
          if (moveSelection?.(-1)) return void event.preventDefault();
          break;
        case 'ArrowDown':
          if (moveSelection?.(1)) return void event.preventDefault();
          break;
        case 'p':
        case 'P':
          if (matchesModifiers(event, { ctrl: true }) && moveSelection?.(-1)) return void event.preventDefault();
          break;
        case 'n':
        case 'N':
          if (matchesModifiers(event, { ctrl: true }) && moveSelection?.(1)) return void event.preventDefault();
          break;
        case 'Escape':
          hideAutocomplete?.();
          break;
        case 'Tab':
          if (matchesModifiers(event, {}) && onTab?.()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          break;
        case 'Enter':
          if (matchesModifiers(event, {}) && onEnter?.(event)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          break;
        case ' ':
          if (matchesModifiers(event, {}) && onSpace?.()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
      }
      if (editor.onKeyDown?.(event) === true) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (
        event.key === 'Enter' &&
        !(
          (event.altKey ||
            event.shiftKey ||
            (disableEnterToSubmit && !event.ctrlKey) ||
            isSelectionInCodeBlock(editor)) &&
          allowNewLines
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        submit();
      }
      onKeyDown?.(event);
    },
    [
      allowNewLines,
      disableEnterToSubmit,
      editor,
      hideAutocomplete,
      moveSelection,
      onEnter,
      onKeyDown,
      onSpace,
      onTab,
      submit,
    ],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (readOnly) return true;
      if (event.defaultPrevented) return false;
      const handled = onPaste?.(event) ?? false;
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
      return handled;
    },
    [readOnly, onPaste],
  );

  const handleChange = useCallback(
    (next: Descendant[]) => {
      if (next !== lastValueRef.current) {
        if (emitChangesRef.current)
          onChange?.(toTextValue(next, { mode: 'raw', resolvers: editor.context.resolvers }), next);
      } else if (emitChangesRef.current) maybeShowAutocomplete?.();
    },
    [editor, maybeShowAutocomplete, onChange],
  );

  useLayoutEffect(() => {
    if (syncFromParentRef.current) {
      lastValueRef.current = value;
      updateState(editor, 'parent', { value });
    }
  }, [editor, value, updateState]);

  const decorate = useCallback(
    (entry: NodeEntry) => [...decorateMarkdown(editor, entry), ...decorateCodeBlock(editor, entry)],
    [editor],
  );

  return (
    <div ref={containerRef} className={clsx(className, styles.slateContainer)}>
      <RichEditor
        id={id}
        editor={editor}
        className={clsx(styles.slateTextArea, textAreaPaddingClassName)}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={spellcheckEnabled}
        autoFocus={!disableAutoFocus}
        canFocus={!disabled}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={() => maybeShowAutocomplete?.()}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={onKeyUp}
        decorate={decorate}
        aria-required={required}
        {...aria}
      />
    </div>
  );
};

ChannelEditor.displayName = 'ChannelEditor';
