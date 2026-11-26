import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { Tooltip } from '@discord-mana/components';
import { InlineEditor, type InlineEditorHandle, type InlineEditorRuleSet } from '@discord-mana/slate';
import { getLimit, useBuilderRestrictions, useNodeIssues, type NodeKind, type ValidationIssue } from '../core';
import { patchField, readText, useEditableNode } from './fields';
import { isMod } from './NodeFrame';
import { useBuilderUI } from './uiStore';
import { useBuilderContext } from './useBuilderContext';
import styles from './BuilderTextField.module.css';

/** Characters as Discord counts them for limits (UTF-16 code units, like `String.length`). */
const lengthOf = (text: string) => text.length;

/** Undo and redo go to the document's history, so they work the same in and out of text. */
export const useHistoryKeys = () => {
  const { undo, redo } = useBuilderContext();
  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!isMod(event) || event.altKey) return false;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        event.stopPropagation();
        if (key === 'y' || event.shiftKey) redo();
        else undo();
        return true;
      }
      return false;
    },
    [redo, undo],
  );
};

const useFieldIssues = (uid: string, field: string) => {
  const issues = useNodeIssues(uid);
  return useMemo(() => issues.filter((issue) => issue.field === field), [issues, field]);
};

export interface FieldStatusProps {
  anchor: HTMLElement | null;
  length: number;
  limit: number | undefined;
  issues: readonly ValidationIssue[];
  focused: boolean;
  /** Whether the text's node is selected. Otherwise its problem shows only while it is focused. */
  selected?: boolean;
}

/**
 * A small counter by a text that is close to its limit (while typing), and the problem with a text that is
 * invalid (while it, or its node, is being worked on: it hangs below the text, over what follows), with the
 * details on hover.
 */
export const FieldStatus = ({ anchor, length, limit, issues, focused, selected = true }: FieldStatusProps) => {
  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [offset(2), flip({ fallbackPlacements: ['top-end'] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  useLayoutEffect(() => {
    setReference(anchor);
  }, [anchor, setReference]);
  const error = issues.find((issue) => issue.severity === 'error');
  const warning = issues.find((issue) => issue.severity === 'warning');
  const near = limit != null && length >= limit * 0.8;
  const show = anchor != null && ((issues.length > 0 && (focused || selected)) || (focused && near));
  if (!show) return null;
  const over = limit != null && length > limit;
  const counter = limit != null && (near || over) ? `${length}/${limit}` : null;
  const text = issues.map((issue) => issue.message).join('\n');
  const pill = (
    <span
      ref={setFloating}
      style={floatingStyles}
      data-builder-ui
      data-builder-nodrag
      className={styles.status}
      data-severity={error != null ? 'error' : warning != null ? 'warning' : over ? 'error' : 'info'}
      aria-live="polite"
    >
      {counter ?? (error ?? warning)?.message}
    </span>
  );
  return text !== '' ? (
    <Tooltip text={text} position="bottom">
      {pill}
    </Tooltip>
  ) : (
    pill
  );
};

FieldStatus.displayName = 'FieldStatus';

export interface BuilderTextFieldProps {
  uid: string;
  kind: NodeKind | 'message';
  /** The node's property, dotted for nested ones (`footer.text`). */
  field: string;
  /** Which markdown the text takes: the client's rule set for where it renders. */
  rules?: InlineEditorRuleSet;
  multiline?: boolean;
  placeholder?: string;
  /** How the text renders when not being edited (parsed markdown, like the client). */
  renderPreview?: (value: string) => ReactNode;
  /** The element the editor is (inside the client's own element for the text). */
  as?: ElementType;
  className?: string;
  /** The first text of its node: Enter on the node and "add" focus it. */
  isFirstField?: boolean;
  disabled?: boolean;
  'aria-label': string;
}

/**
 * Markdown text edited where it renders: it looks exactly like the message until it is focused, then becomes
 * the chat input's editor (live markdown, mentions, emoji) in the same typography. Every change is saved into
 * the document as it is typed; there is nothing to confirm.
 */
export const BuilderTextField = ({
  uid,
  kind,
  field,
  rules = 'RULES',
  multiline = false,
  placeholder,
  renderPreview,
  as = multiline ? 'div' : 'span',
  className,
  isFirstField = false,
  disabled = false,
  'aria-label': ariaLabel,
}: BuilderTextFieldProps) => {
  const { actions } = useBuilderContext();
  const node = useEditableNode(uid);
  const value = readText(node, field);
  const issues = useFieldIssues(uid, field);
  const selected = useBuilderUI((state) => state.selectedId === uid);
  const limit = getLimit(kind, field, useBuilderRestrictions());
  const editorRef = useRef<InlineEditorHandle>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [draftLength, setDraftLength] = useState<number | null>(null);
  const historyKeys = useHistoryKeys();
  const nodeRef = useRef(node);

  // The editor swaps its element when editing starts and stops; follow it after every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    nodeRef.current = node;
    const element = (wrapperRef.current?.firstElementChild as HTMLElement | null) ?? null;
    setAnchor((previous) => (previous === element ? previous : element));
  });

  const onChange = useCallback(
    (next: string) => {
      setDraftLength(lengthOf(next));
      const current = nodeRef.current;
      if (current == null) return;
      actions.update(uid, patchField(current, field, next), { coalesce: `${uid}:${field}` });
    },
    [actions, field, uid],
  );

  const invalid = issues.some((issue) => issue.severity === 'error');
  return (
    <span
      ref={wrapperRef}
      className={styles.field}
      data-builder-field={field}
      data-builder-first={isFirstField || undefined}
      data-invalid={invalid || undefined}
      data-multiline={multiline || undefined}
      data-empty={value === '' || undefined}
    >
      <InlineEditor
        ref={editorRef}
        as={as}
        className={className}
        value={value}
        onChange={onChange}
        multiline={multiline}
        rules={rules}
        placeholder={placeholder}
        renderPreview={renderPreview}
        disabled={disabled}
        aria-label={ariaLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraftLength(null);
          actions.checkpoint();
        }}
        onKeyDown={(event) => {
          historyKeys(event);
        }}
      />
      <FieldStatus
        anchor={anchor}
        length={draftLength ?? lengthOf(value)}
        limit={limit}
        issues={issues}
        focused={focused}
        selected={selected}
      />
    </span>
  );
};

BuilderTextField.displayName = 'BuilderTextField';

export interface BuilderPlainTextFieldProps {
  uid: string;
  kind: NodeKind | 'message';
  field: string;
  placeholder?: string;
  className?: string;
  as?: ElementType;
  isFirstField?: boolean;
  disabled?: boolean;
  /** Text that may not be empty falls back to this when cleared (e.g. a select option's label). */
  'aria-label': string;
}

/**
 * Plain text (no markdown: an author name, a footer, a label) edited in place: the client's own element,
 * made editable. Saves as it is typed; Enter or Escape leaves the field.
 */
export const BuilderPlainTextField = ({
  uid,
  kind,
  field,
  placeholder,
  className,
  as: Tag = 'span',
  isFirstField = false,
  disabled = false,
  'aria-label': ariaLabel,
}: BuilderPlainTextFieldProps) => {
  const { actions } = useBuilderContext();
  const node = useEditableNode(uid);
  const value = readText(node, field);
  const issues = useFieldIssues(uid, field);
  const selected = useBuilderUI((state) => state.selectedId === uid);
  const limit = getLimit(kind, field, useBuilderRestrictions());
  const elementRef = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const historyKeys = useHistoryKeys();
  const nodeRef = useRef(node);
  useLayoutEffect(() => {
    nodeRef.current = node;
  });

  // The DOM holds the text while it is being edited; outside changes (undo, import) replace it.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element != null && element.textContent !== value) element.textContent = value;
  }, [value]);

  const setRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    setAnchor(element);
  }, []);

  const invalid = issues.some((issue) => issue.severity === 'error');
  return (
    <>
      <Tag
        ref={setRef}
        className={clsx(className, styles.plain)}
        contentEditable={disabled ? undefined : 'plaintext-only'}
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        spellCheck
        data-builder-field={field}
        data-builder-first={isFirstField || undefined}
        data-invalid={invalid || undefined}
        data-placeholder={placeholder}
        onFocus={(event: FocusEvent<HTMLElement>) => {
          setFocused(true);
          // Focused from the keyboard or by the editor: the caret goes to the end, like the markdown fields.
          const element = event.currentTarget;
          const selection = window.getSelection();
          if (selection != null && !element.contains(selection.anchorNode)) {
            selection.selectAllChildren(element);
            selection.collapseToEnd();
          }
        }}
        onBlur={() => {
          setFocused(false);
          actions.checkpoint();
        }}
        onInput={(event: React.FormEvent<HTMLElement>) => {
          const current = nodeRef.current;
          if (current == null) return;
          const text = (event.currentTarget.textContent ?? '').replace(/\n/g, ' ');
          actions.update(uid, patchField(current, field, text), { coalesce: `${uid}:${field}` });
        }}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (historyKeys(event)) return;
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
          }
        }}
        onPaste={(event: React.ClipboardEvent<HTMLElement>) => {
          // Older browsers without `plaintext-only` would paste formatting.
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
          document.execCommand('insertText', false, text);
        }}
      />
      <FieldStatus
        anchor={anchor}
        length={value.length}
        limit={limit}
        issues={issues}
        focused={focused}
        selected={selected}
      />
    </>
  );
};

BuilderPlainTextField.displayName = 'BuilderPlainTextField';
