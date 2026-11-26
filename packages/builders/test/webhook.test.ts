import { describe, expect, it, vi } from 'vitest';
import {
  buildWebhookRequest,
  editWebhookMessage,
  parseDiscordErrors,
  parseWebhookUrl,
  sendWebhookMessage,
} from '../src/core';

const URL = 'https://discord.com/api/webhooks/123456789012345678/abc-DEF_123';
const BASE = 'https://discord.com/api/webhooks/123456789012345678/abc-DEF_123';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('parseWebhookUrl', () => {
  it.each([
    'https://discord.com/api/webhooks/123456789012345678/token',
    'https://discordapp.com/api/webhooks/123456789012345678/token',
    'https://canary.discord.com/api/webhooks/123456789012345678/token',
    'https://ptb.discord.com/api/v10/webhooks/123456789012345678/token/',
  ])('accepts %s', (url) => {
    expect(parseWebhookUrl(url)).toMatchObject({ id: '123456789012345678', token: 'token' });
  });

  it.each([
    'http://discord.com/api/webhooks/123456789012345678/token',
    'https://evil.com/api/webhooks/123456789012345678/token',
    'https://discord.com.evil.com/api/webhooks/123456789012345678/token',
    'https://discord.com/api/webhooks/123/token',
    'https://discord.com/api/webhooks/123456789012345678',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parseWebhookUrl(url)).toBeNull();
  });

  it('keeps the API version and reads thread_id', () => {
    expect(parseWebhookUrl('https://discord.com/api/v10/webhooks/123456789012345678/t?thread_id=999')).toEqual({
      id: '123456789012345678',
      token: 't',
      url: 'https://discord.com/api/v10/webhooks/123456789012345678/t',
      threadId: '999',
    });
  });
});

describe('buildWebhookRequest', () => {
  it('sends JSON with wait=true by default', async () => {
    const { url, init } = buildWebhookRequest(URL, { content: 'hi' });
    expect(url).toBe(`${BASE}?wait=true`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ content: 'hi' });
  });

  it('adds with_components when there are components, and the thread and overrides', () => {
    const { url, init } = buildWebhookRequest(
      URL,
      { flags: 32768, components: [{ type: 10, content: 'x' }] },
      { threadId: '42', username: 'Bot', avatarUrl: 'https://a.com/a.png', threadName: 'New thread', wait: false },
    );
    expect(url).toBe(`${BASE}?thread_id=42&with_components=true`);
    expect(JSON.parse(init.body as string)).toEqual({
      flags: 32768,
      components: [{ type: 10, content: 'x' }],
      username: 'Bot',
      avatar_url: 'https://a.com/a.png',
      thread_name: 'New thread',
    });
    expect(buildWebhookRequest(URL, { content: 'x', components: [] }).url).toBe(`${BASE}?wait=true`);
    expect(buildWebhookRequest(URL, { content: 'x' }, { withComponents: true }).url).toContain('with_components=true');
  });

  it('uploads files as multipart with payload_json and attachments', async () => {
    const { init } = buildWebhookRequest(
      URL,
      { embeds: [{ image: { url: 'attachment://cat.png' } }] },
      {
        files: [
          { name: 'cat.png', data: new Uint8Array([1, 2, 3]), contentType: 'image/png', description: 'A cat' },
          new File(['hello'], 'notes.txt', { type: 'text/plain' }),
        ],
      },
    );
    const form = init.body as FormData;
    expect(init.headers).toBeUndefined();
    expect(JSON.parse(form.get('payload_json') as string)).toEqual({
      embeds: [{ image: { url: 'attachment://cat.png' } }],
      attachments: [
        { id: 0, filename: 'cat.png', description: 'A cat' },
        { id: 1, filename: 'notes.txt' },
      ],
    });
    const first = form.get('files[0]') as File;
    expect(first.name).toBe('cat.png');
    expect(first.type).toBe('image/png');
    expect(await (form.get('files[1]') as File).text()).toBe('hello');
  });

  it('throws for bad URLs', () => {
    expect(() => buildWebhookRequest('https://example.com', { content: 'x' })).toThrow(TypeError);
  });
});

describe('sendWebhookMessage', () => {
  it('returns the sent message', async () => {
    const fetch = vi.fn(async () => json(200, { id: '1', content: 'hi' }));
    const result = await sendWebhookMessage(URL, { content: 'hi' }, { fetch });
    expect(result).toEqual({ ok: true, status: 200, message: { id: '1', content: 'hi' } });
    expect(fetch).toHaveBeenCalledWith(`${BASE}?wait=true`, expect.objectContaining({ method: 'POST' }));
  });

  it('handles 204 without wait', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    expect(await sendWebhookMessage(URL, { content: 'hi' }, { fetch, wait: false })).toEqual({ ok: true, status: 204 });
  });

  it('maps Discord form errors to issues with our paths', async () => {
    const body = {
      code: 50035,
      message: 'Invalid Form Body',
      errors: {
        embeds: {
          0: { title: { _errors: [{ code: 'BASE_TYPE_MAX_LENGTH', message: 'Must be 256 or fewer in length.' }] } },
        },
        components: {
          1: {
            components: {
              0: { custom_id: { _errors: [{ code: 'COMPONENT_CUSTOM_ID_DUPLICATED', message: 'Duplicate' }] } },
            },
          },
        },
      },
    };
    const result = await sendWebhookMessage(URL, { content: 'x' }, { fetch: async () => json(400, body) });
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: 50035,
      message: 'Invalid Form Body',
      body,
      issues: [
        {
          path: ['embeds', 0, 'title'],
          code: 'BASE_TYPE_MAX_LENGTH',
          message: 'Must be 256 or fewer in length.',
          severity: 'error',
        },
        {
          path: ['components', 1, 'components', 0, 'custom_id'],
          code: 'COMPONENT_CUSTOM_ID_DUPLICATED',
          message: 'Duplicate',
          severity: 'error',
        },
      ],
    });
  });

  it('reports errors without form details', async () => {
    const result = await sendWebhookMessage(
      URL,
      { content: 'x' },
      {
        fetch: async () => json(404, { code: 10015, message: 'Unknown Webhook' }),
      },
    );
    expect(result).toMatchObject({
      ok: false,
      status: 404,
      code: 10015,
      message: 'Unknown Webhook',
      issues: [{ path: [], code: '10015', message: 'Unknown Webhook' }],
    });
  });

  it('retries once after a short rate limit', async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(json(429, { message: 'You are being rate limited.', retry_after: 0.5, global: false }))
        .mockResolvedValueOnce(json(200, { id: '1' }));
      const pending = sendWebhookMessage(URL, { content: 'x' }, { fetch });
      await vi.advanceTimersByTimeAsync(500);
      expect(await pending).toMatchObject({ ok: true, message: { id: '1' } });
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("doesn't wait out long rate limits", async () => {
    const fetch = vi.fn(async () =>
      json(429, { message: 'You are being rate limited.', retry_after: 64.57, global: true }),
    );
    const result = await sendWebhookMessage(URL, { content: 'x' }, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      status: 429,
      retryAfter: 64.57,
      message: 'You are being rate limited. Try again in 65s.',
      issues: [{ code: 'RATE_LIMITED' }],
    });
  });

  it('never throws on network errors or bad URLs', async () => {
    const result = await sendWebhookMessage(
      URL,
      { content: 'x' },
      {
        fetch: async () => {
          throw new TypeError('Failed to fetch');
        },
      },
    );
    expect(result).toMatchObject({ ok: false, status: 0, message: "Couldn't reach Discord: Failed to fetch" });
    expect(await sendWebhookMessage('nope', { content: 'x' })).toMatchObject({
      ok: false,
      status: 0,
      issues: [{ code: 'INVALID_WEBHOOK_URL' }],
    });
  });

  it('edits messages with PATCH, without webhook-only fields', async () => {
    const fetch = vi.fn(async () => json(200, { id: '9' }));
    await editWebhookMessage(
      URL,
      '9',
      { content: 'new', username: 'x', components: [{ type: 1, components: [] }] },
      { fetch },
    );
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/messages/9?with_components=true`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ content: 'new', components: [{ type: 1, components: [] }] });
  });
});

describe('parseDiscordErrors', () => {
  it('flattens request-level errors and payload_json', () => {
    expect(
      parseDiscordErrors({
        _errors: [{ code: 'TOO_LARGE', message: 'Too large' }],
        payload_json: { content: { _errors: [{ code: 'BASE_TYPE_MAX_LENGTH', message: 'Too long' }] } },
      }),
    ).toEqual([
      { path: [], code: 'TOO_LARGE', message: 'Too large', severity: 'error' },
      { path: ['content'], code: 'BASE_TYPE_MAX_LENGTH', message: 'Too long', severity: 'error' },
    ]);
  });
});
