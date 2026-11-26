import type { CreatedKey, Limits } from '../shared/api';
import { hmacSign, randomBase62, sha256Hex, timingSafeEqualHex } from './crypto';
import { HttpError } from './http';

// Keys look like `dm_<12-char id>_<32-char secret>`: the id finds the row, the secret is checked against its
// stored SHA-256 hash in constant time. Neither part is ever logged or stored in the clear.
const KEY_RE = /^dm_([0-9A-Za-z]{12})_([0-9A-Za-z]{32})$/;
const DUMMY_HASH = '0'.repeat(64);

export interface ApiKeyRow {
  id: string;
  name: string | null;
  secret_hash: string;
  created_at: number;
  last_used_at: number | null;
}

const unauthorized = (message: string) =>
  new HttpError(401, 'unauthorized', message, undefined, { 'www-authenticate': 'Bearer realm="api"' });

export const authenticate = async (request: Request, env: Env, ctx: ExecutionContext): Promise<ApiKeyRow> => {
  const header = request.headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+(\S+)\s*$/i.exec(header)?.[1];
  if (bearer == null) throw unauthorized('Send your API key as `Authorization: Bearer <key>`.');
  const parsed = KEY_RE.exec(bearer);
  const row =
    parsed != null
      ? await env.DB.prepare('SELECT id, name, secret_hash, created_at, last_used_at FROM api_keys WHERE id = ?')
          .bind(parsed[1])
          .first<ApiKeyRow>()
      : null;
  // Hash and compare even when the key is malformed or unknown, so all failures take the same path.
  const hash = await sha256Hex(parsed?.[2] ?? bearer);
  const matches = timingSafeEqualHex(hash, row?.secret_hash ?? DUMMY_HASH);
  if (row == null || !matches) throw unauthorized('Invalid API key.');

  if (env.API_RATE_LIMITER != null) {
    const { success } = await env.API_RATE_LIMITER.limit({ key: row.id });
    if (!success) {
      throw new HttpError(429, 'rate_limited', 'Too many requests for this API key. Slow down.', undefined, {
        'retry-after': '60',
      });
    }
  }

  const now = Date.now();
  if (row.last_used_at == null || now - row.last_used_at > 60_000) {
    ctx.waitUntil(env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(now, row.id).run());
  }
  return row;
};

const clientIp = (request: Request) =>
  request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? 'unknown';

/** Counts a key creation against the caller's IP in a fixed window stored in D1; throws 429 over the limit. */
export const consumeKeyCreation = async (request: Request, env: Env, limits: Limits) => {
  const ip = clientIp(request);
  // A keyed hash, so the table never holds raw IPs and can't be reversed by hashing the IPv4 space.
  const ipHash = env.SIGNING_SECRET ? await hmacSign(env.SIGNING_SECRET, `ip:${ip}`) : await sha256Hex(`ip:${ip}`);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const window = limits.keyCreationWindowSeconds;
  const windowStart = nowSeconds - (nowSeconds % window);
  const row = await env.DB.prepare(
    `INSERT INTO key_creation_windows (ip_hash, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT (ip_hash, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(ipHash, windowStart)
    .first<{ count: number }>();
  const used = row?.count ?? 1;
  const remaining = Math.max(0, limits.keyCreationLimit - used);
  const headers = {
    'x-ratelimit-limit': String(limits.keyCreationLimit),
    'x-ratelimit-remaining': String(remaining),
  };
  if (used > limits.keyCreationLimit) {
    const retryAfter = windowStart + window - nowSeconds;
    throw new HttpError(
      429,
      'rate_limited',
      `Too many API keys created from this address. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      { limit: limits.keyCreationLimit, windowSeconds: window },
      { ...headers, 'retry-after': String(retryAfter) },
    );
  }
  return headers;
};

export const createKey = async (env: Env, name: string | null): Promise<CreatedKey> => {
  const id = randomBase62(12);
  const secret = randomBase62(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO api_keys (id, secret_hash, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, await sha256Hex(secret), name, now)
    .run();
  return { id, key: `dm_${id}_${secret}`, name, createdAt: new Date(now).toISOString() };
};

export const getKeyUsage = async (env: Env, keyId: string) => {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS previews, COALESCE(SUM(size), 0) AS bytes FROM previews WHERE key_id = ? AND expires_at > ?',
  )
    .bind(keyId, Date.now())
    .first<{ previews: number; bytes: number }>();
  return { previews: row?.previews ?? 0, bytes: row?.bytes ?? 0 };
};

/** Deletes a key with every preview it created. */
export const revokeKey = (env: Env, keyId: string) =>
  env.DB.batch([
    env.DB.prepare('DELETE FROM preview_payloads WHERE preview_id IN (SELECT id FROM previews WHERE key_id = ?)').bind(
      keyId,
    ),
    env.DB.prepare('DELETE FROM previews WHERE key_id = ?').bind(keyId),
    env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(keyId),
  ]);
