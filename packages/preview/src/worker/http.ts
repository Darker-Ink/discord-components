import type { ApiErrorBody } from '../shared/api';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly headers?: HeadersInit,
  ) {
    super(message);
  }
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-expose-headers': 'retry-after, x-ratelimit-limit, x-ratelimit-remaining',
  'access-control-max-age': '86400',
};

const API_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  ...CORS_HEADERS,
};

export const json = (body: unknown, status = 200, headers?: HeadersInit) => {
  const response = new Response(JSON.stringify(body), { status, headers: API_HEADERS });
  if (headers != null) for (const [name, value] of new Headers(headers)) response.headers.set(name, value);
  return response;
};

/** A JSON body that is already serialised (e.g. streamed from storage). */
export const rawJson = (body: ReadableStream, headers?: HeadersInit) => {
  const response = new Response(body, { status: 200, headers: API_HEADERS });
  if (headers != null) for (const [name, value] of new Headers(headers)) response.headers.set(name, value);
  return response;
};

export const noContent = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const preflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const errorResponse = (error: HttpError) => {
  const body: ApiErrorBody = {
    error: { code: error.code, message: error.message, ...(error.details != null ? { details: error.details } : {}) },
  };
  return json(body, error.status, error.headers);
};

export const notFound = (what = 'Preview') => new HttpError(404, 'not_found', `${what} not found.`);

/** Reads a JSON body, refusing anything over `maxBytes` before and while reading it. */
export const readJson = async (request: Request, maxBytes: number): Promise<unknown> => {
  const tooLarge = () =>
    new HttpError(413, 'payload_too_large', `Request body is larger than ${maxBytes} bytes.`, { maxBytes });
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge();
  if (request.body == null) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  if (size === 0) return undefined;
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the body as JSON (Content-Type: application/json).');
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body is not valid JSON.');
  }
};
