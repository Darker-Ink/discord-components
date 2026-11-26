const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const encoder = new TextEncoder();

/** A uniformly random base62 string (rejection sampling, so no modulo bias). */
export const randomBase62 = (length: number) => {
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < 248) out += BASE62[byte % 62];
      if (out.length === length) break;
    }
  }
  return out;
};

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
};

export const sha256Hex = async (value: string) => toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

/** Compares two hex digests of equal length without leaking where they differ. */
export const timingSafeEqualHex = (a: string, b: string) => {
  const left = fromHex(a);
  const right = fromHex(b);
  if (left.byteLength !== right.byteLength) return false;
  return crypto.subtle.timingSafeEqual(left, right);
};

const base64url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const fromBase64url = (value: string) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const hmacKeys = new Map<string, Promise<CryptoKey>>();

const hmacKey = (secret: string) => {
  let key = hmacKeys.get(secret);
  if (key == null) {
    key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    hmacKeys.set(secret, key);
  }
  return key;
};

export const hmacSign = async (secret: string, message: string) =>
  base64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message)));

/** Verifies with `crypto.subtle.verify`, which compares in constant time. */
export const hmacVerify = async (secret: string, message: string, signature: string) => {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64url(signature);
  } catch {
    return false;
  }
  if (bytes.byteLength !== 32) return false;
  return crypto.subtle.verify('HMAC', await hmacKey(secret), bytes, encoder.encode(message));
};

export const gzipJson = async (value: unknown) => {
  const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

export const gunzipJson = async <T>(data: ArrayBuffer | Uint8Array | number[]): Promise<T> => {
  const bytes = data instanceof ArrayBuffer || data instanceof Uint8Array ? data : new Uint8Array(data);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return (await new Response(stream).json()) as T;
};
