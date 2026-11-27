import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button, ScrollerThin, Text } from '@discord-mana/components';
import { CheckmarkLargeIcon, CopyIcon, DownloadIcon, UploadIcon } from '@discord-mana/icons';
import { parseMessageJSON, stringifyMessage, useBuilderSelector } from '../core';
import { useBuilderContext } from './useBuilderContext';
import styles from './JsonPanel.module.css';

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/g;

/** JSON with each token wrapped for color (keys, strings, numbers, literals, punctuation). */
export const highlightJSON = (text: string): ReactNode[] => {
  const result: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) result.push(text.slice(last, index));
    const [whole, string, colon, number, literal, punctuation] = match;
    if (string != null) {
      result.push(
        <span key={key++} className={colon != null ? styles.key : styles.string}>
          {string}
        </span>,
      );
      if (colon != null) result.push(colon);
    } else if (number != null) {
      result.push(
        <span key={key++} className={styles.number}>
          {number}
        </span>,
      );
    } else if (literal != null) {
      result.push(
        <span key={key++} className={styles.literal}>
          {literal}
        </span>,
      );
    } else if (punctuation != null) {
      result.push(
        <span key={key++} className={styles.punctuation}>
          {punctuation}
        </span>,
      );
    }
    last = index + whole.length;
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
};

/** Where `JSON.parse` stopped, as a line and column (from its message, which has a position). */
const errorLocation = (text: string, message: string) => {
  const line = /line (\d+) column (\d+)/i.exec(message);
  if (line != null) return { line: Number(line[1]), column: Number(line[2]) };
  const position = /position (\d+)/i.exec(message);
  if (position == null) return null;
  const before = text.slice(0, Number(position[1]));
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

type ParseState = { status: 'ok' } | { status: 'error'; message: string; line?: number; column?: number };

const parse = (text: string): { state: ParseState; doc: ReturnType<typeof parseMessageJSON>['doc'] } => {
  try {
    JSON.parse(text);
  } catch (error) {
    const message = (error as Error).message.replace(/^JSON\.parse: /, '');
    const location = errorLocation(text, message);
    return {
      state: { status: 'error', message: message.replace(/ \(line \d+ column \d+\)/, ''), ...location },
      doc: null,
    };
  }
  const { doc, errors } = parseMessageJSON(text);
  return doc != null
    ? { state: { status: 'ok' }, doc }
    : { state: { status: 'error', message: errors.join(' ') }, doc: null };
};

export const downloadJSON = (text: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export interface JsonPanelProps {
  className?: string;
  /** The name of a downloaded file. */
  fileName?: string;
  /** Extra actions in the panel's bar (e.g. "Open as preview"). */
  actions?: ReactNode;
}

/**
 * The message as JSON, live: it follows every edit on the canvas, and editing it changes the canvas as soon as
 * it is valid again (invalid JSON is pointed out and changes nothing). Copy it, download it, or bring a
 * payload in by pasting or dropping a `.json` file.
 */
export const JsonPanel = ({ className, fileName = 'message.json', actions: extraActions }: JsonPanelProps) => {
  const { actions } = useBuilderContext();
  const doc = useBuilderSelector((state) => state.doc);
  const json = useMemo(() => stringifyMessage(doc), [doc]);
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<ParseState>({ status: 'ok' });
  const [copied, setCopied] = useState(false);
  const [dropping, setDropping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const text = draft ?? json;

  const apply = useCallback(
    (next: string) => {
      const result = parse(next);
      setState(result.state);
      if (result.doc != null) actions.replace(result.doc);
    },
    [actions],
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
    },
    [],
  );

  const onChange = (next: string) => {
    setDraft(next);
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(next), 250);
  };

  const importText = useCallback(
    (next: string) => {
      setDraft(null);
      apply(next);
    },
    [apply],
  );

  const importFile = useCallback(
    async (file: File | undefined) => {
      if (file == null) return;
      importText(await file.text());
    },
    [importText],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const file = event.dataTransfer.files[0];
    setDropping(false);
    if (file == null) return;
    event.preventDefault();
    void importFile(file);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      textareaRef.current?.select();
    }
  };

  const errorLine = state.status === 'error' ? state.line : undefined;
  return (
    <div
      className={clsx(styles.panel, className)}
      data-dropping={dropping || undefined}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <div className={styles.bar}>
        <Button
          size="sm"
          variant="secondary"
          icon={{ type: 'icon', asset: copied ? CheckmarkLargeIcon : CopyIcon }}
          text={copied ? 'Copied' : 'Copy'}
          onClick={() => void copy()}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={{ type: 'icon', asset: DownloadIcon }}
          text="Download"
          onClick={() => downloadJSON(json, fileName)}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={{ type: 'icon', asset: UploadIcon }}
          text="Import"
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void importFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        {extraActions}
      </div>
      <div className={styles.editor} data-invalid={state.status === 'error' || undefined}>
        {/* The scroller scrolls the text: the textarea is as big as its content, over a highlighted copy. */}
        <ScrollerThin orientation="auto" className={styles.scroller} scrollbarGutter={false}>
          <div className={styles.surface}>
            <pre className={styles.code} aria-hidden>
              {text.split('\n').map((line, index) => (
                <span key={index} className={clsx(styles.line, { [styles.errorLine]: errorLine === index + 1 })}>
                  {highlightJSON(line)}
                  {'\n'}
                </span>
              ))}
            </pre>
            <textarea
              ref={textareaRef}
              className={styles.input}
              value={text}
              wrap="off"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Message JSON"
              aria-invalid={state.status === 'error'}
              aria-describedby={state.status === 'error' ? 'builder-json-error' : undefined}
              onChange={(event) => onChange(event.currentTarget.value)}
              onBlur={() => {
                // Leaving valid JSON shows it formatted again; invalid JSON stays as typed until it is fixed.
                if (state.status === 'ok') setDraft(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && !event.shiftKey) {
                  event.preventDefault();
                  document.execCommand('insertText', false, '  ');
                }
              }}
            />
          </div>
        </ScrollerThin>
      </div>
      {state.status === 'error' ? (
        <div className={styles.error} id="builder-json-error" role="alert">
          <Text variant="body-sm/semibold" color="text-feedback-critical">
            {state.line != null ? `Invalid JSON at line ${state.line}, column ${state.column}` : 'Invalid message'}
          </Text>
          <Text variant="body-sm/normal" color="text-muted">
            {state.message}
          </Text>
        </div>
      ) : null}
      {dropping ? (
        <div className={styles.dropOverlay} aria-hidden>
          <UploadIcon size="md" color="currentColor" />
          Drop to import
        </div>
      ) : null}
    </div>
  );
};

JsonPanel.displayName = 'JsonPanel';
