import { DEMO_PREVIEW_ID, readOptions, type Limits, type PreviewContent, type PreviewSummary } from '../shared/api';
import { EXAMPLE_MESSAGES, withOrigin } from '../shared/example';
import { gzipText, hmacSign, hmacVerify, randomBase62 } from './crypto';
import { HttpError, notFound } from './http';
import type { ApiKeyRow } from './keys';
import { parseCreateBody, parseSignBody } from './validate';

export interface PreviewRow {
  id: string;
  key_id: string;
  secret: number;
  message_count: number;
  size: number;
  options: string;
  created_at: number;
  expires_at: number;
}

const PREVIEW_COLUMNS = 'id, key_id, secret, message_count, size, options, created_at, expires_at';
const ID_RE = /^[0-9A-Za-z]{16}$/;

export const previewPath = (id: string) => `/p/${id}`;

/** Where a preview's messages live in the PAYLOADS bucket: gzipped JSON of the normalized message array. */
export const payloadKey = (id: string) => `previews/${id}.json.gz`;

/** Deletes payloads from R2, at most 1000 keys per call as R2 allows. */
export const deletePayloads = async (env: Env, ids: string[]) => {
  for (let i = 0; i < ids.length; i += 1000) await env.PAYLOADS.delete(ids.slice(i, i + 1000).map(payloadKey));
};

const toSummary = (row: PreviewRow, origin: string): PreviewSummary => ({
  id: row.id,
  secret: row.secret === 1,
  messageCount: row.message_count,
  size: row.size,
  options: readOptions(row.options),
  createdAt: new Date(row.created_at).toISOString(),
  expiresAt: new Date(row.expires_at).toISOString(),
  url: row.secret === 1 ? null : origin + previewPath(row.id),
});

/** A live (unexpired) preview by id, or null. */
export const findPreview = async (env: Env, id: string) => {
  if (!ID_RE.test(id)) return null;
  const row = await env.DB.prepare(`SELECT ${PREVIEW_COLUMNS} FROM previews WHERE id = ? AND expires_at > ?`)
    .bind(id, Date.now())
    .first<PreviewRow>();
  return row ?? null;
};

/** The caller's own preview; others' previews are indistinguishable from missing ones. */
const findOwnPreview = async (env: Env, key: ApiKeyRow, id: string) => {
  const row = await findPreview(env, id);
  if (row == null || row.key_id !== key.id) throw notFound();
  return row;
};

const signingSecret = (env: Env) => {
  if (!env.SIGNING_SECRET) {
    throw new HttpError(500, 'not_configured', 'The signing secret is not configured on this deployment.');
  }
  return env.SIGNING_SECRET;
};

const signedMessage = (id: string, exp: number) => `v1:${id}:${exp}`;

export type AccessResult = 'ok' | 'missing_signature' | 'expired_signature' | 'invalid_signature';

/** Checks the `exp`/`sig` query params of a request for a secret preview. */
export const checkAccess = async (env: Env, row: PreviewRow, url: URL): Promise<AccessResult> => {
  if (row.secret !== 1) return 'ok';
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  if (exp == null || sig == null) return 'missing_signature';
  if (!/^\d{1,12}$/.test(exp)) return 'invalid_signature';
  if (!env.SIGNING_SECRET) return 'invalid_signature';
  if (!(await hmacVerify(env.SIGNING_SECRET, signedMessage(row.id, Number(exp)), sig))) return 'invalid_signature';
  if (Number(exp) * 1000 <= Date.now()) return 'expired_signature';
  return 'ok';
};

export const createPreview = async (env: Env, key: ApiKeyRow, body: unknown, limits: Limits, origin: string) => {
  const now = new Date();
  const input = parseCreateBody(body, limits, now);
  const json = JSON.stringify(input.messages);
  const size = new TextEncoder().encode(json).byteLength;
  const id = randomBase62(16);
  const createdAt = now.getTime();
  const expiresAt = createdAt + input.expiresIn * 1000;

  // The quota checks and the insert are one statement, so concurrent requests can't overshoot the limits.
  const insert = await env.DB.prepare(
    `INSERT INTO previews (id, key_id, secret, message_count, size, options, created_at, expires_at)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8
     WHERE (SELECT COUNT(*) FROM previews WHERE key_id = ?2 AND expires_at > ?7) < ?9
       AND (SELECT COALESCE(SUM(size), 0) FROM previews WHERE key_id = ?2 AND expires_at > ?7) + ?5 <= ?10`,
  )
    .bind(
      id,
      key.id,
      input.secret ? 1 : 0,
      input.messages.length,
      size,
      JSON.stringify(input.options),
      createdAt,
      expiresAt,
      limits.maxPreviewsPerKey,
      limits.maxStorageBytesPerKey,
    )
    .run();
  if (insert.meta.changes !== 1) {
    throw new HttpError(403, 'quota_exceeded', 'This API key has reached its preview or storage limit.', {
      maxPreviewsPerKey: limits.maxPreviewsPerKey,
      maxStorageBytesPerKey: limits.maxStorageBytesPerKey,
    });
  }
  // The row reserves the quota first; if the upload fails, it is released again.
  try {
    await env.PAYLOADS.put(payloadKey(id), await gzipText(json), {
      httpMetadata: { contentType: 'application/json', contentEncoding: 'gzip' },
    });
  } catch (error) {
    await env.DB.prepare('DELETE FROM previews WHERE id = ?').bind(id).run();
    throw error;
  }
  return {
    id,
    url: input.secret ? null : origin + previewPath(id),
    secret: input.secret,
    messageCount: input.messages.length,
    size,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

export const listPreviews = async (env: Env, key: ApiKeyRow, url: URL) => {
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam == null ? 25 : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(400, 'invalid_query', '`limit` must be an integer from 1 to 100.');
  }
  const cursorParam = url.searchParams.get('cursor');
  let cursor: { createdAt: number; id: string } | null = null;
  if (cursorParam != null) {
    const match = /^(\d{1,15})\.([0-9A-Za-z]{16})$/.exec(cursorParam);
    if (match == null) throw new HttpError(400, 'invalid_query', '`cursor` is invalid.');
    cursor = { createdAt: Number(match[1]), id: match[2] };
  }
  const now = Date.now();
  const { results } = await (
    cursor == null
      ? env.DB.prepare(
          `SELECT ${PREVIEW_COLUMNS} FROM previews WHERE key_id = ? AND expires_at > ?
         ORDER BY created_at DESC, id DESC LIMIT ?`,
        ).bind(key.id, now, limit + 1)
      : env.DB.prepare(
          `SELECT ${PREVIEW_COLUMNS} FROM previews WHERE key_id = ? AND expires_at > ?
           AND (created_at < ? OR (created_at = ? AND id < ?))
         ORDER BY created_at DESC, id DESC LIMIT ?`,
        ).bind(key.id, now, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1)
  ).all<PreviewRow>();
  const page = results.slice(0, limit);
  const last = page[page.length - 1];
  return {
    previews: page.map((row) => toSummary(row, url.origin)),
    nextCursor: results.length > limit && last != null ? `${last.created_at}.${last.id}` : null,
  };
};

export const getOwnPreview = async (env: Env, key: ApiKeyRow, id: string, origin: string) =>
  toSummary(await findOwnPreview(env, key, id), origin);

export const signPreview = async (
  env: Env,
  key: ApiKeyRow,
  id: string,
  body: unknown,
  limits: Limits,
  origin: string,
) => {
  const expiresIn = parseSignBody(body, limits);
  const row = await findOwnPreview(env, key, id);
  const secret = signingSecret(env);
  // A link never outlives the preview it points to.
  const exp = Math.min(Math.floor(Date.now() / 1000) + expiresIn, Math.floor(row.expires_at / 1000));
  const sig = await hmacSign(secret, signedMessage(row.id, exp));
  const url = new URL(previewPath(row.id), origin);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', sig);
  return {
    url: url.toString(),
    expiresAt: new Date(exp * 1000).toISOString(),
    expiresIn: exp - Math.floor(Date.now() / 1000),
  };
};

export const deletePreview = async (env: Env, key: ApiKeyRow, id: string) => {
  const deleted = await env.DB.prepare('DELETE FROM previews WHERE id = ? AND key_id = ?').bind(id, key.id).run();
  if (deleted.meta.changes !== 1) throw notFound();
  await deletePayloads(env, [id]);
};

const accessError = (result: Exclude<AccessResult, 'ok'>) =>
  new HttpError(
    403,
    result,
    result === 'missing_signature'
      ? 'This preview is private. Open it through a signed link.'
      : result === 'expired_signature'
        ? 'This signed link has expired.'
        : 'This signed link is invalid.',
  );

const encoder = new TextEncoder();

/**
 * What the viewer renders: public previews to anyone, secret ones only with a valid signature. The stored messages
 * are streamed straight from R2 into the response (decompressed, never parsed), so large transcripts cost the
 * Worker almost no CPU or memory.
 */
export const getPreviewContent = async (
  env: Env,
  ctx: ExecutionContext,
  id: string,
  url: URL,
  limits: Limits,
): Promise<ReadableStream | PreviewContent> => {
  if (id === DEMO_PREVIEW_ID) {
    // Normalized like any preview, but not held to the deployment's message limit.
    const demoLimits = {
      ...limits,
      maxMessagesPerPreview: Math.max(limits.maxMessagesPerPreview, EXAMPLE_MESSAGES.length),
    };
    const demo = parseCreateBody({ data: withOrigin(EXAMPLE_MESSAGES, url.origin) }, demoLimits, new Date());
    return {
      id,
      messages: demo.messages,
      // The demo can be tried with the interactions SDK (`/p/demo?interactions=1`).
      options: readOptions({ interactions: true, title: 'support-tickets' }),
      createdAt: '2026-11-26T09:20:10.000Z',
      expiresAt: null,
    };
  }
  const row = await findPreview(env, id);
  if (row == null) throw notFound();
  const access = await checkAccess(env, row, url);
  if (access !== 'ok') throw accessError(access);
  const object = await env.PAYLOADS.get(payloadKey(row.id));
  if (object == null) throw notFound();

  const head: Omit<PreviewContent, 'messages'> = {
    id: row.id,
    options: readOptions(row.options),
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
  // `{ ...head, "messages": <stored array> }`, assembled as a stream.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const pump = async () => {
    const writer = writable.getWriter();
    try {
      await writer.write(encoder.encode(`${JSON.stringify(head).slice(0, -1)},"messages":`));
      const reader = object.body.pipeThrough(new DecompressionStream('gzip')).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.write(encoder.encode('}'));
      await writer.close();
    } catch (error) {
      await writer.abort(error);
    }
  };
  ctx.waitUntil(pump());
  return readable;
};

export const sweepExpired = async (env: Env) => {
  const now = Date.now();
  // In batches, so a backlog never runs into the Worker's limits.
  for (;;) {
    const { results } = await env.DB.prepare('SELECT id FROM previews WHERE expires_at <= ? ORDER BY id LIMIT 1000')
      .bind(now)
      .all<{ id: string }>();
    if (results.length === 0) break;
    await deletePayloads(
      env,
      results.map((row) => row.id),
    );
    // The same rows as selected (D1 caps bound parameters at 100, so no `IN (?, ?, …)` list).
    await env.DB.prepare(
      'DELETE FROM previews WHERE id IN (SELECT id FROM previews WHERE expires_at <= ? ORDER BY id LIMIT 1000)',
    )
      .bind(now)
      .run();
    if (results.length < 1000) break;
  }
  await env.DB.prepare('DELETE FROM key_creation_windows WHERE window_start < ?')
    .bind(Math.floor(now / 1000) - 86400)
    .run();
};
