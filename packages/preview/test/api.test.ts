import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import worker from '../src/worker';

const ORIGIN = 'https://preview.test';
let ipCounter = 0;

const call = (path: string, init: RequestInit & { key?: string; ip?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.key != null) headers.set('authorization', `Bearer ${init.key}`);
  if (init.ip != null) headers.set('cf-connecting-ip', init.ip);
  if (init.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return exports.default.fetch(new Request(ORIGIN + path, { ...init, headers }));
};

const post = (path: string, body: unknown, init: { key?: string; ip?: string; headers?: HeadersInit } = {}) =>
  call(path, { ...init, method: 'POST', body: JSON.stringify(body) });

/** A fresh key from its own IP, so tests don't share the key-creation limit. */
const newKey = async () => {
  const response = await post('/api/keys', { name: 'test' }, { ip: `10.0.0.${++ipCounter}` });
  expect(response.status).toBe(201);
  return ((await response.json()) as { key: string; id: string }).key;
};

const AUTHOR = { id: '1000000000000000001', username: 'wumpus' };

const message = (overrides: Record<string, unknown> = {}) => ({
  author: AUTHOR,
  content: 'Hello',
  timestamp: '2026-11-26T09:00:00.000Z',
  ...overrides,
});

const createPreview = async (key: string, body: Record<string, unknown> = {}) => {
  const response = await post('/api/previews', { data: [message()], ...body }, { key });
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string; url: string | null };
};

const errorCode = async (response: Response) => ((await response.json()) as { error: { code: string } }).error.code;

const hmac = async (secret: string, text: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...signature))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

describe('API keys', () => {
  it('creates a key shown once and stores only a hash', async () => {
    const response = await post('/api/keys', { name: 'my bot' }, { ip: '10.1.0.1' });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; key: string; name: string };
    expect(body.key).toMatch(/^dm_[0-9A-Za-z]{12}_[0-9A-Za-z]{32}$/);
    expect(body.name).toBe('my bot');
    const row = await env.DB.prepare('SELECT * FROM api_keys WHERE id = ?')
      .bind(body.id)
      .first<Record<string, unknown>>();
    const secret = body.key.split('_')[2];
    expect(row?.secret_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(secret);
  });

  it('rate limits key creation per IP', async () => {
    const ip = '10.2.0.1';
    for (let i = 0; i < 3; i++) expect((await post('/api/keys', {}, { ip })).status).toBe(201);
    const limited = await post('/api/keys', {}, { ip });
    expect(limited.status).toBe(429);
    expect(await errorCode(limited)).toBe('rate_limited');
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await post('/api/keys', {}, { ip: '10.2.0.2' })).status).toBe(201);
  });

  it('rejects missing, malformed and wrong keys', async () => {
    const missing = await call('/api/previews');
    expect(missing.status).toBe(401);
    expect(missing.headers.get('www-authenticate')).toContain('Bearer');
    expect((await call('/api/previews', { key: 'nope' })).status).toBe(401);
    const key = await newKey();
    const wrong = key.slice(0, -4) + (key.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect((await call('/api/previews', { key: wrong })).status).toBe(401);
    expect((await call('/api/previews', { key })).status).toBe(200);
  });

  it('reports the current key and revokes it with its previews', async () => {
    const key = await newKey();
    const { id } = await createPreview(key);
    const current = await call('/api/keys/current', { key });
    expect(current.status).toBe(200);
    expect(((await current.json()) as { usage: { previews: number } }).usage.previews).toBe(1);
    expect((await call('/api/keys/current', { key, method: 'DELETE' })).status).toBe(204);
    expect((await call('/api/keys/current', { key })).status).toBe(401);
    expect((await call(`/api/previews/${id}/content`)).status).toBe(404);
    expect(await env.PAYLOADS.head(`previews/${id}.json.gz`)).toBeNull();
  });
});

describe('creating previews', () => {
  it('accepts an array or { messages } and fills in what renderers need', async () => {
    const key = await newKey();
    const a = await createPreview(key, {
      data: [message({ content: 'second', timestamp: '2026-11-26T10:00:00Z' }), message()],
    });
    expect(a.url).toBe(`${ORIGIN}/p/${a.id}`);
    const b = await createPreview(key, { data: { messages: [message()] } });
    expect(b.id).toMatch(/^[0-9A-Za-z]{16}$/);

    const content = (await (await call(`/api/previews/${a.id}/content`)).json()) as {
      messages: { id: string; type: number; content: string; channel_id: string }[];
    };
    // Sorted chronologically, with ids, types and channel ids filled in.
    expect(content.messages.map((m) => m.content)).toEqual(['Hello', 'second']);
    expect(content.messages[0].id).toMatch(/^\d+$/);
    expect(content.messages[0].type).toBe(0);
    expect(content.messages[0].channel_id).toBe('0');
  });

  it('rejects garbage with the path of each problem', async () => {
    const key = await newKey();
    const response = await post(
      '/api/previews',
      { data: [{ author: { id: 'abc' }, content: 5, embeds: [{ url: 'javascript:alert(1)' }] }], secret: 'yes' },
      { key },
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { path: string }[] } };
    expect(body.error.code).toBe('invalid_body');
    expect(body.error.details.map((d) => d.path)).toEqual(
      expect.arrayContaining([
        'data.0.author.id',
        'data.0.author.username',
        'data.0.content',
        'data.0.embeds.0.url',
        'secret',
      ]),
    );

    expect(await errorCode(await post('/api/previews', { data: 'nope' }, { key }))).toBe('invalid_body');
    expect(await errorCode(await post('/api/previews', { data: [message()], extra: 1 }, { key }))).toBe('invalid_body');
    expect(await errorCode(await post('/api/previews', { data: [] }, { key }))).toBe('invalid_body');
    const notJson = await call('/api/previews', {
      key,
      method: 'POST',
      body: '{',
      headers: { 'content-type': 'application/json' },
    });
    expect(await errorCode(notJson)).toBe('invalid_json');
    const wrongType = await call('/api/previews', {
      key,
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'text/plain' },
    });
    expect(wrongType.status).toBe(415);
  });

  it('drops unsafe URLs hidden in passthrough fields', async () => {
    const key = await newKey();
    const { id } = await createPreview(key, {
      data: [
        message({
          poll: { question: { text: 'q' }, image_url: 'javascript:alert(1)', other_url: 'https://ok.test/a' },
        }),
      ],
    });
    const content = (await (await call(`/api/previews/${id}/content`)).json()) as {
      messages: { poll: Record<string, unknown> }[];
    };
    expect(content.messages[0].poll.image_url).toBeUndefined();
    expect(content.messages[0].poll.other_url).toBe('https://ok.test/a');
  });

  it('enforces the message count, body size and per-key preview limits', async () => {
    const key = await newKey();
    const tooMany = await post(
      '/api/previews',
      { data: Array.from({ length: 6001 }, () => ({ author: AUTHOR })) },
      { key },
    );
    expect(tooMany.status).toBe(400);
    expect(JSON.stringify(await tooMany.json())).toContain('at most 6000 messages');

    const huge = await post(
      '/api/previews',
      { data: [message({ content: 'x'.repeat(3000) })], pad: 'x'.repeat(4.2 * 1024 * 1024) },
      { key },
    );
    expect(huge.status).toBe(413);
    expect(await errorCode(huge)).toBe('payload_too_large');

    for (let i = 0; i < 3; i++) await createPreview(key);
    const over = await post('/api/previews', { data: [message()] }, { key });
    expect(over.status).toBe(403);
    expect(await errorCode(over)).toBe('quota_exceeded');
  });

  it('enforces the per-key storage quota', async () => {
    const key = await newKey();
    const bulky = (count: number) =>
      Array.from({ length: count }, (_, i) => message({ content: `${i} ${'y'.repeat(1900)}` }));
    // About 2 MB, then 1 MB more: over the 2.5 MiB quota.
    expect((await post('/api/previews', { data: bulky(1000) }, { key })).status).toBe(201);
    const over = await post('/api/previews', { data: bulky(500) }, { key });
    expect(over.status).toBe(403);
    expect(await errorCode(over)).toBe('quota_exceeded');
  });

  it('stores and serves a 5,000-message transcript', async () => {
    const key = await newKey();
    const start = Date.parse('2026-11-01T00:00:00Z');
    const data = Array.from({ length: 5000 }, (_, i) =>
      message({
        author: i % 7 === 0 ? { id: '1000000000000000002', username: 'helper', bot: true } : AUTHOR,
        content: `Message ${i}: the quick brown fox jumps over the lazy dog.`,
        timestamp: new Date(start + i * 90_000).toISOString(),
        ...(i % 50 === 0 ? { embeds: [{ title: `Embed ${i}`, description: 'Details', color: 0x5865f2 }] } : {}),
      }),
    );
    const created = await post('/api/previews', { data }, { key });
    expect(created.status).toBe(201);
    const { id, messageCount, size } = (await created.json()) as { id: string; messageCount: number; size: number };
    expect(messageCount).toBe(5000);
    expect(size).toBeGreaterThan(500_000);

    // Stored gzipped in R2, metadata only in D1.
    const object = await env.PAYLOADS.head(`previews/${id}.json.gz`);
    expect(object?.size).toBeLessThan(size / 4);

    const content = await call(`/api/previews/${id}/content`);
    expect(content.status).toBe(200);
    expect(content.headers.get('content-type')).toContain('application/json');
    const body = (await content.json()) as { id: string; messages: { content: string }[]; options: unknown };
    expect(body.id).toBe(id);
    expect(body.messages).toHaveLength(5000);
    expect(body.messages[4999].content).toBe('Message 4999: the quick brown fox jumps over the lazy dog.');
  });

  it('caps expiresIn at the configured maximum', async () => {
    const key = await newKey();
    const response = await post('/api/previews', { data: [message()], expiresIn: 10 * 365 * 86400 }, { key });
    expect(response.status).toBe(400);
  });
});

describe('interaction options', () => {
  it('stores interactions and allowed origins and serves them with the content', async () => {
    const key = await newKey();
    const { id } = await createPreview(key, {
      options: { interactions: true, allowedOrigins: ['https://app.example.com', 'http://localhost:3000'] },
    });
    const content = (await (await call(`/api/previews/${id}/content`)).json()) as { options: Record<string, unknown> };
    expect(content.options).toMatchObject({
      interactive: false,
      interactions: true,
      allowedOrigins: ['https://app.example.com', 'http://localhost:3000'],
    });
    const summary = (await (await call(`/api/previews/${id}`, { key })).json()) as { options: Record<string, unknown> };
    expect(summary.options.interactions).toBe(true);
  });

  it('rejects anything but bare http(s) origins', async () => {
    const key = await newKey();
    for (const origin of [
      'https://app.example.com/',
      'https://app.example.com/path',
      'javascript:alert(1)',
      'ftp://x.test',
      '*',
    ]) {
      const response = await post(
        '/api/previews',
        { data: [message()], options: { allowedOrigins: [origin] } },
        { key },
      );
      expect(response.status, origin).toBe(400);
      const body = (await response.json()) as { error: { details: { path: string }[] } };
      expect(body.error.details[0].path).toBe('options.allowedOrigins.0');
    }
    const empty = await post('/api/previews', { data: [message()], options: { allowedOrigins: [] } }, { key });
    expect(empty.status).toBe(400);
    const tooMany = Array.from({ length: 11 }, (_, i) => `https://app${i}.example.com`);
    expect(
      (await post('/api/previews', { data: [message()], options: { allowedOrigins: tooMany } }, { key })).status,
    ).toBe(400);
    expect((await post('/api/previews', { data: [message()], options: { interactions: 'yes' } }, { key })).status).toBe(
      400,
    );
  });

  it('defaults the new options for previews stored before they existed', async () => {
    const key = await newKey();
    const { id } = await createPreview(key);
    await env.DB.prepare('UPDATE previews SET options = ? WHERE id = ?')
      .bind(JSON.stringify({ interactive: true, title: 'old', theme: null }), id)
      .run();
    const content = (await (await call(`/api/previews/${id}/content`)).json()) as { options: Record<string, unknown> };
    expect(content.options).toEqual({
      interactive: true,
      interactions: false,
      allowedOrigins: null,
      title: 'old',
      theme: null,
    });
  });

  it('lets the demo be tried with the SDK', async () => {
    const demo = (await (await call('/api/previews/demo/content')).json()) as { options: Record<string, unknown> };
    expect(demo.options.interactions).toBe(true);
  });
});

describe('listing and deleting', () => {
  it('lists only your own previews, paginated', async () => {
    const key = await newKey();
    const other = await newKey();
    const first = await createPreview(key);
    const second = await createPreview(key);
    await createPreview(other);

    const page1 = (await (await call('/api/previews?limit=1', { key })).json()) as {
      previews: { id: string }[];
      nextCursor: string | null;
    };
    expect(page1.previews.map((p) => p.id)).toEqual([second.id]);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = (await (await call(`/api/previews?limit=1&cursor=${page1.nextCursor}`, { key })).json()) as {
      previews: { id: string }[];
      nextCursor: string | null;
    };
    expect(page2.previews.map((p) => p.id)).toEqual([first.id]);
    expect(page2.nextCursor).toBeNull();
    expect((await call('/api/previews?limit=0', { key })).status).toBe(400);
  });

  it("deletes your own previews and 404s on others'", async () => {
    const key = await newKey();
    const other = await newKey();
    const { id } = await createPreview(key);
    const foreign = await call(`/api/previews/${id}`, { key: other, method: 'DELETE' });
    expect(foreign.status).toBe(404);
    expect(await errorCode(foreign)).toBe('not_found');
    expect((await call(`/api/previews/${id}`, { key: other })).status).toBe(404);
    expect((await call(`/api/previews/${id}`, { key })).status).toBe(200);
    expect(await env.PAYLOADS.head(`previews/${id}.json.gz`)).not.toBeNull();
    expect((await call(`/api/previews/${id}`, { key, method: 'DELETE' })).status).toBe(204);
    expect(await env.PAYLOADS.head(`previews/${id}.json.gz`)).toBeNull();
    expect((await call(`/api/previews/${id}`, { key, method: 'DELETE' })).status).toBe(404);
    expect((await call(`/api/previews/${id}/content`)).status).toBe(404);
    expect((await call(`/p/${id}`)).status).toBe(404);
  });
});

describe('secret previews and signed URLs', () => {
  it('needs a valid signature for the page and the data', async () => {
    const key = await newKey();
    const { id, url } = await createPreview(key, { secret: true });
    expect(url).toBeNull();

    const unsigned = await call(`/api/previews/${id}/content`);
    expect(unsigned.status).toBe(403);
    expect(await errorCode(unsigned)).toBe('missing_signature');
    expect((await call(`/p/${id}`)).status).toBe(403);

    const signed = await post(`/api/previews/${id}`, { expiresIn: 600 }, { key });
    expect(signed.status).toBe(200);
    const { url: signedUrl, expiresIn } = (await signed.json()) as { url: string; expiresIn: number };
    expect(expiresIn).toBeLessThanOrEqual(600);
    const query = new URL(signedUrl).search;
    expect((await call(`/p/${id}${query}`)).status).toBe(200);
    // Look params can be added to a signed URL without breaking it.
    expect((await call(`/p/${id}${query}&theme=light`)).status).toBe(200);
    const content = await call(`/api/previews/${id}/content${query}`);
    expect(content.status).toBe(200);
    expect(((await content.json()) as { messages: unknown[] }).messages).toHaveLength(1);

    const params = new URL(signedUrl).searchParams;
    const sig = params.get('sig')!;
    const exp = params.get('exp')!;
    const tamperedSig = `?exp=${exp}&sig=${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`;
    expect(await errorCode(await call(`/api/previews/${id}/content${tamperedSig}`))).toBe('invalid_signature');
    const tamperedExp = `?exp=${Number(exp) + 3600}&sig=${sig}`;
    expect(await errorCode(await call(`/api/previews/${id}/content${tamperedExp}`))).toBe('invalid_signature');
    expect((await call(`/p/${id}${tamperedExp}`)).status).toBe(403);

    // A link signed for another preview doesn't open this one.
    const { id: otherId } = await createPreview(key, { secret: true });
    expect(await errorCode(await call(`/api/previews/${otherId}/content${query}`))).toBe('invalid_signature');
  });

  it('rejects expired signatures', async () => {
    const key = await newKey();
    const { id } = await createPreview(key, { secret: true });
    const exp = Math.floor(Date.now() / 1000) - 10;
    const sig = await hmac(env.SIGNING_SECRET, `v1:${id}:${exp}`);
    const response = await call(`/api/previews/${id}/content?exp=${exp}&sig=${sig}`);
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe('expired_signature');
  });

  it('lets only the owner sign, within the maximum lifetime', async () => {
    const key = await newKey();
    const other = await newKey();
    const { id } = await createPreview(key, { secret: true });
    expect((await post(`/api/previews/${id}`, {}, { key: other })).status).toBe(404);
    expect((await post(`/api/previews/${id}`, { expiresIn: 3601 }, { key })).status).toBe(400);
    const defaults = await call(`/api/previews/${id}`, { key, method: 'POST' });
    expect(defaults.status).toBe(200);
  });

  it('signs public previews harmlessly', async () => {
    const key = await newKey();
    const { id } = await createPreview(key);
    const signed = (await (await post(`/api/previews/${id}`, {}, { key })).json()) as { url: string };
    expect((await call(new URL(signed.url).pathname + new URL(signed.url).search)).status).toBe(200);
  });
});

describe('headers', () => {
  it('frames previews anywhere but never the home page', async () => {
    const home = await call('/');
    expect(home.status).toBe(200);
    const homeCsp = home.headers.get('content-security-policy')!;
    expect(homeCsp).toContain("frame-ancestors 'none'");
    expect(homeCsp).toContain("script-src 'self'");
    expect(homeCsp).not.toContain('unsafe-inline');
    expect(home.headers.get('x-frame-options')).toBe('DENY');

    const preview = await call('/p/demo');
    expect(preview.status).toBe(200);
    expect(preview.headers.get('content-security-policy')).toContain('frame-ancestors *');
    expect(preview.headers.get('x-frame-options')).toBeNull();
    expect(preview.headers.get('referrer-policy')).toBe('no-referrer');

    expect((await call('/nope')).status).toBe(404);
    expect((await call('/docs')).status).toBe(200);
  });

  it('paints the theme and a loading skeleton before the app loads, but only for readable previews', async () => {
    const page = await (await call('/p/demo?theme=light')).text();
    expect(page).toContain('data-boot-theme="light"');
    expect(page).toContain('class="boot"');

    const key = await newKey();
    const { id } = await createPreview(key, { secret: true, options: { theme: 'onyx' } });
    const locked = await call(`/p/${id}`);
    expect(locked.status).toBe(403);
    const html = await locked.text();
    // Neither the skeleton nor the secret preview's own theme leak without a signature.
    expect(html).not.toContain('class="boot"');
    expect(html).toContain('data-boot-theme="dark"');
  });

  it('answers CORS preflights and sends CORS headers on the API only', async () => {
    const preflight = await call('/api/previews', {
      method: 'OPTIONS',
      headers: { origin: 'https://other.test', 'access-control-request-method': 'POST' },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(preflight.headers.get('access-control-allow-headers')).toContain('authorization');
    expect((await call('/api/limits')).headers.get('access-control-allow-origin')).toBe('*');
    expect((await call('/')).headers.get('access-control-allow-origin')).toBeNull();
  });

  it('serves the demo preview and the limits', async () => {
    const demo = (await (await call('/api/previews/demo/content')).json()) as { messages: unknown[] };
    expect(demo.messages.length).toBeGreaterThan(3);
    const limits = (await (await call('/api/limits')).json()) as { maxMessagesPerPreview: number };
    expect(limits.maxMessagesPerPreview).toBe(6000);
  });
});

describe('scheduled sweep', () => {
  it('deletes expired previews and their payloads', async () => {
    const key = await newKey();
    const { id } = await createPreview(key);
    await env.DB.prepare('UPDATE previews SET expires_at = ? WHERE id = ?')
      .bind(Date.now() - 1000, id)
      .run();
    expect((await call(`/api/previews/${id}/content`)).status).toBe(404);
    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController(), env);
    await waitOnExecutionContext(ctx);
    expect(await env.DB.prepare('SELECT 1 FROM previews WHERE id = ?').bind(id).first()).toBeNull();
    expect(await env.PAYLOADS.head(`previews/${id}.json.gz`)).toBeNull();
  });
});
