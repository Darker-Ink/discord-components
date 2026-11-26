// A small browser/Node client for Execute Webhook and Edit Webhook Message (resources/webhook.mdx).
import type { APIMessage } from '@discord-mana/messages';
import type { ValidationIssue, WebhookMessagePayload } from './types';

export interface ParsedWebhookUrl {
  id: string;
  token: string;
  /** The webhook's base URL, on the same host and API version as given. */
  url: string;
  /** A `thread_id` already in the URL's query string. */
  threadId?: string;
}

const WEBHOOK_URL =
  /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v(\d+))?\/webhooks\/(\d{17,20})\/([\w-]+)\/?$/i;

/**
 * Parses a webhook URL (`https://discord.com/api/webhooks/{id}/{token}`, also on discordapp.com, canary. and
 * ptb., with or without `/v{n}`). Returns null for anything else.
 */
export const parseWebhookUrl = (value: string): ParsedWebhookUrl | null => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const match = WEBHOOK_URL.exec(`${url.origin}${url.pathname}`);
  if (!match) return null;
  const [, version, id, token] = match;
  const threadId = url.searchParams.get('thread_id') ?? undefined;
  return {
    id,
    token,
    url: `${url.origin}/api${version ? `/v${version}` : ''}/webhooks/${id}/${token}`,
    ...(threadId ? { threadId } : {}),
  };
};

export const isWebhookUrl = (value: string) => parseWebhookUrl(value) != null;

export interface WebhookFile {
  /** File name, referenced from the payload as `attachment://<name>`. */
  name: string;
  data: Blob | ArrayBuffer | Uint8Array | string;
  contentType?: string;
  /** Alt text (attachment `description`). */
  description?: string;
  spoiler?: boolean;
}

export interface SendWebhookOptions {
  /** Send into this thread of the webhook's channel (`thread_id`). */
  threadId?: string;
  /** Create a forum/media thread with this name. */
  threadName?: string;
  /** Override the webhook's name and avatar. */
  username?: string;
  avatarUrl?: string;
  /** Files to upload (`files[n]`), sent as multipart/form-data. */
  files?: (File | WebhookFile)[];
  /** Wait for the message and return it (`wait=true`, default). */
  wait?: boolean;
  /**
   * `with_components=true`: needed for webhooks to send components at all. `'auto'` (default) adds it when the
   * payload has components.
   */
  withComponents?: boolean | 'auto';
  /** Retry once after a 429 if Discord asks to wait at most this long (ms). Default 5000; 0 never retries. */
  maxRetryDelay?: number;
  signal?: AbortSignal;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export interface WebhookRequest {
  url: string;
  init: RequestInit & { method: string; body: string | FormData };
}

export type WebhookResult =
  | { ok: true; status: number; message?: APIMessage }
  | {
      ok: false;
      /** HTTP status, or 0 when the request didn't reach Discord (network or CORS error, bad URL, aborted). */
      status: number;
      /** Discord's JSON error code. */
      code?: number;
      message: string;
      /** Discord's response body, as sent. */
      body?: unknown;
      /** Discord's (nested) form errors as validation issues, with the same paths as `validateMessage`. */
      issues: ValidationIssue[];
      /** Seconds to wait, for rate limits. */
      retryAfter?: number;
    };

const isFile = (file: File | WebhookFile): file is File => typeof File !== 'undefined' && file instanceof File;

const toBlob = (file: WebhookFile) =>
  file.data instanceof Blob
    ? file.data
    : new Blob([file.data as BlobPart], file.contentType ? { type: file.contentType } : undefined);

/** Builds the Execute Webhook request (JSON, or multipart with `payload_json` when there are files). */
export const buildWebhookRequest = (
  webhookUrl: string,
  payload: WebhookMessagePayload,
  options: SendWebhookOptions = {},
  { method = 'POST', messageId }: { method?: 'POST' | 'PATCH'; messageId?: string } = {},
): WebhookRequest => {
  const parsed = parseWebhookUrl(webhookUrl);
  if (!parsed) throw new TypeError('Not a Discord webhook URL (https://discord.com/api/webhooks/{id}/{token})');
  const body: WebhookMessagePayload = { ...payload };
  if (options.username !== undefined) body.username = options.username;
  if (options.avatarUrl !== undefined) body.avatar_url = options.avatarUrl;
  if (options.threadName !== undefined) body.thread_name = options.threadName;
  if (method === 'PATCH') {
    // Edit Webhook Message takes none of these.
    delete body.username;
    delete body.avatar_url;
    delete body.thread_name;
    delete body.applied_tags;
    delete body.tts;
  }
  const files = options.files ?? [];
  if (files.length > 0 && body.attachments === undefined) {
    body.attachments = files.map((file, index) => ({
      id: index,
      filename: file.name,
      ...(!isFile(file) && file.description ? { description: file.description } : {}),
      ...(!isFile(file) && file.spoiler ? { is_spoiler: true } : {}),
    }));
  }

  const query = new URLSearchParams();
  const wait = options.wait ?? true;
  if (method === 'POST' && wait) query.set('wait', 'true');
  const threadId = options.threadId ?? parsed.threadId;
  if (threadId) query.set('thread_id', threadId);
  const withComponents =
    options.withComponents === 'auto' || options.withComponents === undefined
      ? Array.isArray(body.components) && body.components.length > 0
      : options.withComponents;
  if (withComponents) query.set('with_components', 'true');
  const search = query.toString();
  const url = `${parsed.url}${messageId ? `/messages/${messageId}` : ''}${search ? `?${search}` : ''}`;

  const init = { method, ...(options.signal ? { signal: options.signal } : {}) };
  if (files.length === 0) {
    return {
      url,
      init: { ...init, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    };
  }
  const form = new FormData();
  form.append('payload_json', JSON.stringify(body));
  files.forEach((file, index) => {
    form.append(`files[${index}]`, isFile(file) ? file : toBlob(file), file.name);
  });
  return { url, init: { ...init, body: form } };
};

type DiscordErrorTree = { _errors?: { code?: string; message?: string }[] } & { [key: string]: unknown };

/**
 * Flattens Discord's nested form errors (`{ errors: { embeds: { 0: { title: { _errors: [...] } } } } }`) into
 * issues with paths like `['embeds', 0, 'title']`.
 */
export const parseDiscordErrors = (errors: unknown, path: (string | number)[] = []): ValidationIssue[] => {
  if (typeof errors !== 'object' || errors === null) return [];
  const issues: ValidationIssue[] = [];
  const tree = errors as DiscordErrorTree;
  for (const entry of tree._errors ?? []) {
    issues.push({
      path,
      code: entry.code ?? 'DISCORD_ERROR',
      message: entry.message ?? 'Invalid value',
      severity: 'error',
    });
  }
  for (const [key, child] of Object.entries(tree)) {
    if (key === '_errors') continue;
    // Multipart requests report errors under payload_json.
    if (key === 'payload_json' && path.length === 0) {
      issues.push(...parseDiscordErrors(child, path));
      continue;
    }
    issues.push(...parseDiscordErrors(child, [...path, /^\d+$/.test(key) ? Number(key) : key]));
  }
  return issues;
};

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const failure = (
  status: number,
  message: string,
  code: string,
  extra: { code?: number; body?: unknown; retryAfter?: number } = {},
): WebhookResult => ({
  ok: false,
  status,
  message,
  issues: [{ path: [], code, message, severity: 'error' }],
  ...extra,
});

const execute = async (request: () => WebhookRequest, options: SendWebhookOptions): Promise<WebhookResult> => {
  let built: WebhookRequest;
  try {
    built = request();
  } catch (error) {
    return failure(0, (error as Error).message, 'INVALID_WEBHOOK_URL');
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const maxRetryDelay = options.maxRetryDelay ?? 5000;
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(built.url, built.init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure(0, `Couldn't reach Discord: ${message}`, 'NETWORK_ERROR');
    }
    if (response.ok) {
      if (response.status === 204) return { ok: true, status: 204 };
      const message = (await readBody(response)) as APIMessage | undefined;
      return { ok: true, status: response.status, ...(message && typeof message === 'object' ? { message } : {}) };
    }
    const body = await readBody(response);
    const json = (typeof body === 'object' && body !== null ? body : {}) as {
      code?: number;
      message?: string;
      errors?: unknown;
      retry_after?: number;
      global?: boolean;
    };
    if (response.status === 429) {
      const header = Number(response.headers.get('Retry-After'));
      const retryAfter = json.retry_after ?? (Number.isFinite(header) ? header : 1);
      if (attempt === 0 && retryAfter * 1000 <= maxRetryDelay) {
        try {
          await sleep(retryAfter * 1000, options.signal);
        } catch {
          return failure(0, 'The request was aborted', 'ABORTED');
        }
        // A fresh request: a body (FormData especially) can't always be sent twice.
        built = request();
        continue;
      }
      const message = `${json.message ?? 'You are being rate limited.'} Try again in ${Math.ceil(retryAfter)}s.`;
      return failure(429, message, 'RATE_LIMITED', { retryAfter, body, ...(json.code ? { code: json.code } : {}) });
    }
    const message = json.message ?? (typeof body === 'string' && body ? body : `HTTP ${response.status}`);
    const issues = parseDiscordErrors(json.errors);
    return {
      ok: false,
      status: response.status,
      message,
      body,
      ...(json.code != null ? { code: json.code } : {}),
      issues:
        issues.length > 0
          ? issues
          : [{ path: [], code: String(json.code ?? response.status), message, severity: 'error' }],
    };
  }
};

/**
 * Sends a message with a webhook. Never throws: failures (Discord errors, rate limits, network/CORS errors)
 * come back as `{ ok: false, status, message, issues }`, with Discord's form errors mapped to the same paths
 * as `validateMessage`. A 429 is retried once if Discord asks to wait less than `maxRetryDelay`.
 */
export const sendWebhookMessage = (
  webhookUrl: string,
  payload: WebhookMessagePayload,
  options: SendWebhookOptions = {},
): Promise<WebhookResult> => execute(() => buildWebhookRequest(webhookUrl, payload, options), options);

/** Edits a message the webhook sent (Edit Webhook Message). Same options and results as `sendWebhookMessage`. */
export const editWebhookMessage = (
  webhookUrl: string,
  messageId: string,
  payload: WebhookMessagePayload,
  options: Omit<SendWebhookOptions, 'username' | 'avatarUrl' | 'threadName' | 'wait'> = {},
): Promise<WebhookResult> =>
  execute(() => buildWebhookRequest(webhookUrl, payload, options, { method: 'PATCH', messageId }), options);
