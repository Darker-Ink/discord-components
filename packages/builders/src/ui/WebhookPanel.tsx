import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Button, InlineNotice, Switch, Text, TextInput } from '@discord-mana/components';
import { SendMessageIcon } from '@discord-mana/icons';
import {
  nodeAtPath,
  parseWebhookUrl,
  ROOT_UID,
  sendWebhookMessage,
  useBuilderIssues,
  type SendWebhookOptions,
  type ValidationIssue,
  type WebhookResult,
} from '../core';
import { NodeTextInput } from './popouts';
import { useBuilderContext } from './useBuilderContext';
import { useRevealIssue } from './ValidationPanel';
import styles from './WebhookPanel.module.css';

const readStored = (key: string | undefined) => {
  if (key == null) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string | undefined, value: string | null) => {
  if (key == null) return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage is blocked: the URL lasts until the page closes.
  }
};

export interface WebhookPanelProps {
  className?: string;
  /**
   * Offer to remember the webhook URL in this browser's localStorage, under this key. Without it the URL is
   * never stored.
   */
  storageKey?: string;
  /** Replaces the request (tests, or sending through your own server). Defaults to `fetch`. */
  fetch?: typeof fetch;
  /** Called with every result. */
  onResult?: (result: WebhookResult) => void;
}

type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'done'; result: WebhookResult; at: number };

/**
 * Sends the message with a webhook, straight from the browser to Discord (nothing goes through a server).
 * Thread and identity overrides are optional; Discord's answer is shown as it came, with its field errors
 * linked to the parts of the message they are about.
 */
export const WebhookPanel = ({ className, storageKey, fetch: fetchImpl, onResult }: WebhookPanelProps) => {
  const { store } = useBuilderContext();
  const issues = useBuilderIssues();
  const reveal = useRevealIssue();
  const [url, setUrl] = useState(() => readStored(storageKey) ?? '');
  const [remember, setRemember] = useState(() => readStored(storageKey) != null);
  const [threadId, setThreadId] = useState('');
  const [state, setState] = useState<SendState>({ status: 'idle' });

  useEffect(() => {
    writeStored(storageKey, remember && url !== '' ? url : null);
  }, [remember, storageKey, url]);

  const parsed = url.trim() === '' ? null : parseWebhookUrl(url);
  const urlError =
    url.trim() !== '' && parsed == null
      ? 'This isn’t a webhook URL. Copy it from Server Settings → Integrations → Webhooks.'
      : undefined;
  const errors = issues.filter((issue) => issue.severity === 'error');

  const send = useCallback(async () => {
    if (parsed == null) return;
    setState({ status: 'sending' });
    const options: SendWebhookOptions = { fetch: fetchImpl };
    const thread = threadId.trim() || parsed.threadId;
    if (thread) options.threadId = thread;
    const result = await sendWebhookMessage(parsed.url, store.toJSON(), options);
    setState({ status: 'done', result, at: Date.now() });
    onResult?.(result);
  }, [fetchImpl, onResult, parsed, store, threadId]);

  const issueTarget = (issue: ValidationIssue): ValidationIssue => {
    const { uid, rest } = nodeAtPath(store.getState().doc, issue.path);
    return { ...issue, nodeId: uid, field: rest.length > 0 ? rest.join('.') : undefined };
  };

  return (
    <div className={clsx(styles.panel, className)}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <TextInput
          label="Webhook URL"
          type="password"
          revealable
          value={url}
          placeholder="https://discord.com/api/webhooks/…"
          onChange={setUrl}
          errorMessage={urlError}
          autoComplete="off"
          spellCheck={false}
        />
        {storageKey != null ? (
          <div className={styles.remember}>
            <Switch
              label="Remember in this browser"
              description="A webhook URL is a password for your channel: anyone who has it can post there. Only turn this on for a browser you trust."
              checked={remember}
              onChange={setRemember}
            />
          </div>
        ) : null}
        <div className={styles.row}>
          <TextInput
            label="Thread ID"
            value={threadId}
            placeholder={parsed?.threadId ?? 'Optional'}
            onChange={setThreadId}
            description="Post in a thread of the channel"
          />
          <NodeTextInput
            uid={ROOT_UID}
            field="thread_name"
            label="New thread"
            placeholder="Optional"
            description="Forum channels: create a post"
          />
        </div>
        <div className={styles.row}>
          <NodeTextInput uid={ROOT_UID} field="username" label="Username" placeholder="Webhook’s own" />
          <NodeTextInput uid={ROOT_UID} field="avatar_url" label="Avatar URL" placeholder="Webhook’s own" />
        </div>
        {errors.length > 0 ? (
          <InlineNotice
            type="warning"
            message={`Discord will likely refuse this message: ${errors.length} ${errors.length === 1 ? 'problem' : 'problems'} to fix first (see Issues).`}
          />
        ) : null}
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            icon={{ type: 'icon', asset: SendMessageIcon }}
            text={state.status === 'sending' ? 'Sending…' : 'Send'}
            loading={state.status === 'sending' ? true : undefined}
            disabled={parsed == null || state.status === 'sending'}
          />
          <Text variant="body-xs/normal" color="text-muted">
            Sent from your browser straight to Discord. Nothing is stored on a server.
          </Text>
        </div>
      </form>
      {state.status === 'done' ? (
        <div className={styles.result} role="status" aria-live="polite">
          {state.result.ok ? (
            <InlineNotice
              type="success"
              title="Sent"
              message={
                state.result.message != null
                  ? `Message ${state.result.message.id} was posted in channel ${state.result.message.channel_id}.`
                  : 'Discord accepted the message.'
              }
            />
          ) : (
            <InlineNotice
              type="critical"
              title={
                state.result.status === 0
                  ? 'Couldn’t reach Discord'
                  : `Discord refused the message (${state.result.status}${state.result.code != null ? `, code ${state.result.code}` : ''})`
              }
              message={
                state.result.retryAfter != null
                  ? `${state.result.message} Try again in ${Math.ceil(state.result.retryAfter)} s.`
                  : state.result.message
              }
            />
          )}
          {!state.result.ok && state.result.issues.length > 0 ? (
            <ul className={styles.issues}>
              {state.result.issues.map((issue, index) => (
                <li key={index}>
                  <button type="button" className={styles.issue} onClick={() => reveal(issueTarget(issue))}>
                    <code className={styles.path}>{issue.path.join('.') || 'message'}</code>
                    <span>{issue.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

WebhookPanel.displayName = 'WebhookPanel';
