import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import type { Descendant, Editor, NodeEntry } from 'slate';
import { RULE_SETS, type MarkdownRules } from '@discord-mana/markdown/internal';
import { MessageResolversContext } from '@discord-mana/messages';
import { ChatInputTypes, type ChatInputType } from '../../chatInputTypes';
import { EditorResolversContext, type EditorContextValue, type EditorResolvers } from '../../core/context';
import { createEditor } from '../../core/createEditor';
import { decorateCodeBlock, decorateMarkdown } from '../../core/decorations';
import { HistoryUtils } from '../../core/history';
import { toRichValue, toTextValue } from '../../core/serialize';
import { EditorUtils, SelectionUtils } from '../../core/slateUtils';
import type { CodeHighlightSpan, DiscordEditor } from '../../core/types';
import { ReactEditor } from '../../slate-react';
import { RichEditor } from '../RichEditor/RichEditor';

// Not in the client: editing text in place, inside an element that already looks like the rendered result
// (an embed title, a field value). It is the chat input's editor core (markdown styling while typing, pills,
// history, shortcuts) without the chat bar: no border, no background, no buttons, and the text takes the
// element's typography. Changes save on their own, on change (debounced) and on blur.

export type InlineEditorRuleSet = keyof typeof RULE_SETS | 'RULES';

export interface InlineEditorHandle {
  focus: () => void;
  blur: () => void;
  getSlateEditor: () => DiscordEditor;
}

export interface InlineEditorProps {
  ref?: Ref<InlineEditorHandle>;
  /** The text, in message format (`**bold**`, `<@id>`…). */
  value: string;
  /** Every edit. */
  onChange?: (value: string) => void;
  /** The text to keep: after `saveDelay` ms without typing, and on blur (or Enter when single-line). */
  onSave?: (value: string) => void;
  /** Milliseconds of no typing before `onSave`; without it, saving waits for blur. */
  saveDelay?: number;
  /** Multi-line text (Enter inserts a line break); single-line text saves and blurs on Enter. */
  multiline?: boolean;
  placeholder?: string;
  /**
   * Which markdown the field supports, by the client's rule set names (`EMBED_TITLE_RULES` has no masked links
   * and no mentions) or as a rule map. Defaults to the message rules.
   */
  rules?: InlineEditorRuleSet | MarkdownRules;
  /** Live styling of markdown syntax while typing. */
  previewMarkdown?: boolean;
  /** Longer text is cut off as it is typed or pasted. */
  maxLength?: number;
  /** The element to render as, e.g. `h4` for a heading. */
  as?: ElementType;
  /** Classes of the rendered element the text should look like. */
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  autoFocus?: boolean;
  spellCheck?: boolean;
  guildId?: string | null;
  channelId?: string | null;
  /** Users, roles, channels and emoji for pills; defaults to the nearest `EditorResolversContext`. */
  resolvers?: EditorResolvers;
  highlightCode?: (code: string, lang: string) => CodeHighlightSpan[][] | null;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const INLINE_TYPE: ChatInputType = {
  ...ChatInputTypes.GENERIC_RICH_TEXTAREA,
  analyticsName: 'inline_editor',
};

const SINGLE_LINE_TYPE: ChatInputType = {
  ...INLINE_TYPE,
  markdown: { disableCodeBlocks: true, disableBlockQuotes: true },
};

const resolveRules = (rules: InlineEditorProps['rules']) =>
  rules == null || rules === 'RULES' ? undefined : typeof rules === 'string' ? RULE_SETS[rules] : rules;

const textLength = (editor: Editor) => toTextValue(EditorUtils.richValue(editor), { mode: 'raw' }).length;

// Single-line fields join pasted lines with spaces; `maxLength` cuts what doesn't fit.
const withFieldLimits = (editor: DiscordEditor, multiline: () => boolean, maxLength: () => number | undefined) => {
  const { insertText, insertBreak } = editor;
  editor.insertBreak = () => {
    if (multiline()) insertBreak();
  };
  editor.insertSoftBreak = () => editor.insertBreak();
  editor.insertText = (text) => {
    if (!multiline()) text = text.replace(/\r\n|\r|\n/g, ' ');
    const limit = maxLength();
    if (limit != null) {
      const selected = editor.selection != null ? EditorUtils.getTextFromRange(editor, editor.selection).length : 0;
      const room = limit - (textLength(editor) - selected);
      if (room <= 0) return;
      text = text.slice(0, room);
    }
    insertText(text);
  };
  return editor;
};

export const InlineEditor = ({
  ref,
  value,
  onChange,
  onSave,
  saveDelay,
  multiline = false,
  placeholder,
  rules,
  previewMarkdown = true,
  maxLength,
  as = 'div',
  className,
  style,
  disabled = false,
  autoFocus = false,
  spellCheck = true,
  guildId,
  channelId,
  resolvers,
  highlightCode,
  onFocus,
  onBlur,
  onKeyDown,
  ...aria
}: InlineEditorProps) => {
  const parent = useContext(EditorResolversContext);
  const context = useMemo<EditorContextValue>(
    () => ({
      guildId: guildId !== undefined ? guildId : parent.guildId,
      channelId: channelId !== undefined ? channelId : parent.channelId,
      resolvers: resolvers ?? parent.resolvers,
      rules: resolveRules(rules) ?? parent.rules,
      highlightCode: highlightCode ?? parent.highlightCode,
    }),
    [guildId, channelId, resolvers, rules, highlightCode, parent],
  );
  const multilineRef = useRef(multiline);
  multilineRef.current = multiline;
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;

  const lastTextRef = useRef(value);
  const savedTextRef = useRef(value);
  const emitRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const editorRef = useRef<DiscordEditor | null>(null);
  if (editorRef.current == null) {
    const editor = createEditor({
      chatInputType: multiline ? INLINE_TYPE : SINGLE_LINE_TYPE,
      context,
      previewMarkdown,
      updateState: (target, _source, state) => {
        if (state.value !== undefined) target.children = state.value;
        if (state.selection != null && SelectionUtils.isValid(target, state.selection))
          target.selection = state.selection;
        else {
          const end = EditorUtils.end(target, []);
          target.selection = { anchor: end, focus: end };
        }
        target.onChange();
      },
    });
    editor.children = toRichValue(value);
    editorRef.current = withFieldLimits(
      editor,
      () => multilineRef.current,
      () => maxLengthRef.current,
    );
  }
  const editor = editorRef.current;
  editor.context = context;

  useEffect(() => {
    if (editor.previewMarkdown !== previewMarkdown) {
      editor.previewMarkdown = previewMarkdown;
      editor.onChange();
    }
  }, [editor, previewMarkdown]);

  const save = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (lastTextRef.current !== savedTextRef.current) {
      savedTextRef.current = lastTextRef.current;
      onSaveRef.current?.(lastTextRef.current);
    }
  }, []);

  useEffect(() => () => save(), [save]);

  // A new value from outside replaces the text (and becomes what's saved), unless it is what we just emitted.
  useLayoutEffect(() => {
    if (value === lastTextRef.current) return;
    lastTextRef.current = value;
    savedTextRef.current = value;
    const previous = EditorUtils.richValue(editor);
    editor.children = toRichValue(value);
    HistoryUtils.insertEntry(editor, 'other', false, previous, editor.selection);
    if (!SelectionUtils.isValid(editor, editor.selection)) {
      const end = EditorUtils.end(editor, []);
      editor.selection = { anchor: end, focus: end };
    }
    try {
      emitRef.current = false;
      editor.onChange();
    } finally {
      emitRef.current = true;
    }
  }, [editor, value]);

  const handleChange = useCallback(
    (next: Descendant[]) => {
      const text = toTextValue(next, { mode: 'raw', ignoreTrailingEmptyNodes: !multilineRef.current });
      if (!emitRef.current || text === lastTextRef.current) return;
      lastTextRef.current = text;
      onChange?.(text);
      if (saveDelay != null) {
        if (timerRef.current != null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(save, saveDelay);
      }
    },
    [onChange, save, saveDelay],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (editor.onKeyDown?.(event) === true) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if ((event.key === 'Enter' && !multiline && !event.shiftKey) || event.key === 'Escape') {
        event.preventDefault();
        ReactEditor.blur(editor);
        save();
      }
    },
    [editor, multiline, onKeyDown, save],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      save();
      onBlur?.(event);
    },
    [onBlur, save],
  );

  useImperativeHandle(
    ref,
    () => ({
      focus: () => EditorUtils.focus(editor),
      blur: () => ReactEditor.blur(editor),
      getSlateEditor: () => editor,
    }),
    [editor],
  );

  const decorate = useCallback(
    (entry: NodeEntry) => [...decorateMarkdown(editor, entry), ...decorateCodeBlock(editor, entry)],
    [editor],
  );

  return (
    <EditorResolversContext.Provider value={context}>
      <MessageResolversContext.Provider value={context.resolvers}>
        <RichEditor
          appearance="inline"
          as={as}
          editor={editor}
          className={className}
          style={style}
          placeholder={placeholder}
          readOnly={disabled}
          canFocus={!disabled}
          spellCheck={spellCheck}
          autoFocus={autoFocus}
          decorate={decorate}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-multiline={multiline}
          {...aria}
        />
      </MessageResolversContext.Provider>
    </EditorResolversContext.Provider>
  );
};

InlineEditor.displayName = 'InlineEditor';
