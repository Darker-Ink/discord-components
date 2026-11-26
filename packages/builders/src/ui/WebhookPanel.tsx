import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button, InlineNotice, Switch, Text, TextInput } from '@discord-mana/components';
import { SendMessageIcon } from '@discord-mana/icons';
import {
  isMessageFieldAllowed,
  useBuilderRestrictions,
  nodeAtPath,
  parseWebhookUrl,
  ROOT_UID,
  sendWebhookMessage,
  useBuilderIssues,
  useBuilderSelector,
  type SendWebhookOptions,
  type ValidationIssue,
  type WebhookResult,
} from '../core';
import { collectUploads } from './attachments';
import { FilesSection, useAttachmentSummary } from './EditableAttachments';
import { useBuilderFiles } from './files';
import { AppliedTagsInput, MessageOptions } from './MessageOptions';
import { NodeTextInput } from './popouts';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUI, useBuilderUIStore, type WebhookDraft } from './uiStore';
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

/** What Discord says about a webhook (Get Webhook with Token): who it posts as, and where. */
export interface WebhookInfo {
  id: string;
  name: string | null;
  avatar: string | null;
  channel_id: string;
  guild_id?: string;
  /** Set for webhooks an app created; only those can send interactive components. */
  application_id: string | null;
}

/** The webhook's avatar on Discord's CDN, or null when it has none. */
export const getWebhookAvatarURL = (info: Pick<WebhookInfo, 'id' | 'avatar'>, size = 128) =>
  info.avatar != null ? `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png?size=${size}` : null;

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
  /**
   * Called with the webhook's name, avatar and owner once a valid URL is entered (looked up from Discord), and
   * with null when the URL is cleared or isn't valid. Use it to preview the real author, and to tell validation
   * whether interactive components are allowed (`applicationOwnedWebhook`).
   */
  onWebhookChange?: (info: WebhookInfo | null) => void;
}

type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'done'; result: WebhookResult; at: number };

/**
 * Sends the message with a webhook, straight from the browser to Discord (nothing goes through a server).
 * Thread and identity overrides are optional; Discord's answer is shown as it came, with its field errors
 * linked to the parts of the message they are about.
 */
export const WebhookPanel = ({
  className,
  storageKey,
  fetch: fetchImpl,
  onResult,
  onWebhookChange,
}: WebhookPanelProps) => {
  const { store } = useBuilderContext();
  const files = useBuilderFiles();
  const attachments = useAttachmentSummary();
  const threadName = useBuilderSelector((state) => state.doc.thread_name ?? '');
  const hasTags = useBuilderSelector((state) => (state.doc.applied_tags?.length ?? 0) > 0);
  const issues = useBuilderIssues();
  const restrictions = useBuilderRestrictions();
  const reveal = useRevealIssue();
  // Kept in the editor's state, so switching tabs doesn't lose what was typed or the last result.
  const ui = useBuilderUIStore();
  const saved = useBuilderUI((current) => current.webhook);
  const [initial] = useState(
    () =>
      saved ?? {
        url: readStored(storageKey) ?? '',
        threadId: '',
        remember: readStored(storageKey) != null,
        result: null,
      },
  );
  const draft = saved ?? initial;
  const { url, threadId, remember } = draft;
  const state: SendState = draft.sending
    ? { status: 'sending' }
    : draft.result != null
      ? { status: 'done', result: draft.result, at: 0 }
      : { status: 'idle' };
  const patch = useCallback(
    (next: Partial<WebhookDraft>) => ui.set({ webhook: { ...(ui.getState().webhook ?? initial), ...next } }),
    [initial, ui],
  );
  const setUrl = (value: string) => patch({ url: value });
  const setThreadId = (value: string) => patch({ threadId: value });
  const setRemember = (value: boolean) => patch({ remember: value });
  const setState = (next: SendState) =>
    patch(
      next.status === 'sending'
        ? { sending: true }
        : { sending: false, result: next.status === 'done' ? next.result : null },
    );

  useEffect(() => {
    writeStored(storageKey, remember && url !== '' ? url : null);
  }, [remember, storageKey, url]);

  const parsed = url.trim() === '' ? null : parseWebhookUrl(url);
  const urlError = url.trim() !== '' && parsed == null ? 'Not a webhook URL' : undefined;
  const errors = issues.filter((issue) => issue.severity === 'error');
  const [fetched, setFetched] = useState<{ url: string; info: WebhookInfo | null } | null>(null);
  const webhookUrl = parsed?.url ?? null;
  const info = fetched != null && fetched.url === webhookUrl ? fetched.info : null;

  // Who the webhook posts as (and whether an app owns it), so the preview and the checks match it.
  useEffect(() => {
    if (webhookUrl == null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      (fetchImpl ?? fetch)(webhookUrl, { signal: controller.signal })
        .then(async (response) => (response.ok ? ((await response.json()) as WebhookInfo) : null))
        .then((next) => setFetched({ url: webhookUrl, info: next }))
        .catch(() => {
          if (!controller.signal.aborted) setFetched({ url: webhookUrl, info: null });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchImpl, webhookUrl]);

  const onWebhookChangeRef = useRef(onWebhookChange);
  useLayoutEffect(() => {
    onWebhookChangeRef.current = onWebhookChange;
  });
  useEffect(() => onWebhookChangeRef.current?.(info), [info]);

  const send = useCallback(async () => {
    if (parsed == null) return;
    setState({ status: 'sending' });
    const options: SendWebhookOptions = { fetch: fetchImpl };
    const thread = threadId.trim() || parsed.threadId;
    if (thread) options.threadId = thread;
    // The files go as files[n], n being each one's place in the message's attachments.
    const { uploads } = collectUploads(store.getState().doc, files);
    if (uploads.length > 0) options.files = uploads;
    const result = await sendWebhookMessage(parsed.url, store.toJSON(), options);
    setState({ status: 'done', result, at: Date.now() });
    onResult?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchImpl, files, onResult, parsed, store, threadId, patch]);

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
        {info != null ? (
          <div className={styles.identity}>
            {getWebhookAvatarURL(info) != null ? (
              <img className={styles.identityAvatar} src={getWebhookAvatarURL(info)!} alt="" />
            ) : (
              <span className={styles.identityAvatar} />
            )}
            <div className={styles.identityText}>
              <Text variant="body-sm/semibold" color="text-strong">
                {info.name ?? 'Unnamed webhook'}
              </Text>
              <Text variant="body-xs/normal" color="text-muted">
                {info.application_id != null ? 'App webhook' : 'Channel webhook'}
              </Text>
            </div>
          </div>
        ) : null}
        {storageKey != null ? (
          <div className={styles.remember}>
            <Switch
              label="Remember in this browser"
              description="Anyone with the URL can post as this webhook."
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
          />
          {isMessageFieldAllowed(restrictions, 'thread_name') ? (
            <NodeTextInput uid={ROOT_UID} field="thread_name" label="Thread name" placeholder="Optional" />
          ) : null}
        </div>
        {/* Tags are for forum posts, which a thread name starts. */}
        {isMessageFieldAllowed(restrictions, 'applied_tags') && (threadName !== '' || hasTags) ? (
          <AppliedTagsInput />
        ) : null}
        {isMessageFieldAllowed(restrictions, 'username') || isMessageFieldAllowed(restrictions, 'avatar_url') ? (
          <div className={styles.row}>
            {isMessageFieldAllowed(restrictions, 'username') ? (
              <NodeTextInput uid={ROOT_UID} field="username" label="Username" placeholder="Default" />
            ) : null}
            {isMessageFieldAllowed(restrictions, 'avatar_url') ? (
              <NodeTextInput uid={ROOT_UID} field="avatar_url" label="Avatar URL" placeholder="Default" />
            ) : null}
          </div>
        ) : null}
        <FilesSection />
        <MessageOptions />
        {attachments.missing.length > 0 ? (
          <InlineNotice
            type="critical"
            message={`${attachments.missing.length === 1 ? '1 file is' : `${attachments.missing.length} files are`} missing: ${attachments.missing.join(', ')}`}
          />
        ) : null}
        {errors.length > 0 ? (
          <InlineNotice
            type="warning"
            message={`${errors.length} ${errors.length === 1 ? 'error' : 'errors'} in this message`}
          />
        ) : null}
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            icon={{ type: 'icon', asset: SendMessageIcon }}
            text={state.status === 'sending' ? 'Sending…' : 'Send'}
            loading={state.status === 'sending' ? true : undefined}
            disabled={parsed == null || state.status === 'sending' || attachments.missing.length > 0}
          />
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
                  ? `Message ${state.result.message.id} in channel ${state.result.message.channel_id}`
                  : 'Accepted by Discord'
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
