import { getLimits } from './config';
import { HttpError, errorResponse, json, noContent, preflight, readJson } from './http';
import { authenticate, consumeKeyCreation, createKey, getKeyUsage, revokeKey } from './keys';
import { servePage } from './pages';
import {
  createPreview,
  deletePreview,
  getOwnPreview,
  getPreviewContent,
  listPreviews,
  signPreview,
  sweepExpired,
} from './previews';
import { parseKeyBody } from './validate';

const methodNotAllowed = (allowed: string) =>
  new HttpError(405, 'method_not_allowed', 'Method not allowed.', undefined, { allow: allowed });

const handleApi = async (request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> => {
  const limits = getLimits(env);
  const { pathname } = url;
  const method = request.method;
  if (method === 'OPTIONS') return preflight();

  if (pathname === '/api/limits') {
    if (method !== 'GET') throw methodNotAllowed('GET');
    return json(limits);
  }

  if (pathname === '/api/keys') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    const name = parseKeyBody(await readJson(request, 4096));
    const headers = await consumeKeyCreation(request, env, limits);
    return json(await createKey(env, name), 201, headers);
  }

  if (pathname === '/api/keys/current') {
    const key = await authenticate(request, env, ctx);
    if (method === 'GET') {
      return json({
        id: key.id,
        name: key.name,
        createdAt: new Date(key.created_at).toISOString(),
        lastUsedAt: key.last_used_at != null ? new Date(key.last_used_at).toISOString() : null,
        usage: await getKeyUsage(env, key.id),
        limits,
      });
    }
    if (method === 'DELETE') {
      await revokeKey(env, key.id);
      return noContent();
    }
    throw methodNotAllowed('GET, DELETE');
  }

  if (pathname === '/api/previews') {
    if (method === 'POST') {
      const key = await authenticate(request, env, ctx);
      const body = await readJson(request, limits.maxBodyBytes);
      return json(await createPreview(env, key, body, limits, url.origin), 201);
    }
    if (method === 'GET') return json(await listPreviews(env, await authenticate(request, env, ctx), url));
    throw methodNotAllowed('GET, POST');
  }

  const content = /^\/api\/previews\/([^/]+)\/content$/.exec(pathname);
  if (content != null) {
    if (method !== 'GET') throw methodNotAllowed('GET');
    const response = json(await getPreviewContent(env, decodeURIComponent(content[1]), url, limits));
    response.headers.set('referrer-policy', 'no-referrer');
    return response;
  }

  const preview = /^\/api\/previews\/([^/]+)$/.exec(pathname);
  if (preview != null) {
    const id = decodeURIComponent(preview[1]);
    const key = await authenticate(request, env, ctx);
    if (method === 'GET') return json(await getOwnPreview(env, key, id, url.origin));
    if (method === 'POST') {
      return json(await signPreview(env, key, id, await readJson(request, 4096), limits, url.origin));
    }
    if (method === 'DELETE') {
      await deletePreview(env, key, id);
      return noContent();
    }
    throw methodNotAllowed('GET, POST, DELETE');
  }

  throw new HttpError(404, 'not_found', 'No such API route.');
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, ctx, url);
      } catch (error) {
        if (error instanceof HttpError) return errorResponse(error);
        console.error('Unhandled API error', error);
        return errorResponse(new HttpError(500, 'internal_error', 'Something went wrong.'));
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    return servePage(request, env);
  },

  async scheduled(_controller, env) {
    await sweepExpired(env);
  },
} satisfies ExportedHandler<Env>;
