import { DEMO_PREVIEW_ID, readOptions, THEMES, type PreviewTheme } from '../shared/api';
import { PUBLIC_ORIGIN } from '../shared/links';
import { SKELETON_HTML } from '../shared/skeleton';
import { checkAccess, findPreview } from './previews';

declare const __RELAXED_CSP__: boolean;

// Users host their own media, so previews load images and video from any https origin. Nothing else is
// fetched from elsewhere: scripts, styles, fonts and API calls are same-origin only.
const BASE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

export const HOME_CSP = [...BASE_CSP, "frame-src 'self'", "frame-ancestors 'none'"].join('; ');
export const PREVIEW_CSP = [...BASE_CSP, "frame-src 'none'", 'frame-ancestors *'].join('; ');

// The dev server injects inline scripts (React Refresh) and connects a websocket for HMR.
const DEV_HOME_CSP = "frame-ancestors 'none'";
const DEV_PREVIEW_CSP = 'frame-ancestors *';

const withHeaders = (response: Response, status: number, headers: Record<string, string>) => {
  const out = new Response(response.body, { status, statusText: '', headers: response.headers });
  for (const [name, value] of Object.entries(headers)) out.headers.set(name, value);
  return out;
};

// Pages the SPA serves; any other path gets its not-found page with a 404.
const SPA_ROUTES = new Set(['/', '/index.html', '/docs', '/docs/']);

const PREVIEW_PATH_RE = /^\/p\/([^/]+)\/?$/;

/** Serves the SPA (and static files) with the security headers of the page asked for. */
export const servePage = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(request);
  const isHtml = (asset.headers.get('content-type') ?? '').startsWith('text/html');
  if (!isHtml) {
    const response = new Response(asset.body, asset);
    response.headers.set('x-content-type-options', 'nosniff');
    if (url.pathname.startsWith('/sdk/')) {
      // The SDK is imported as a module by other sites.
      response.headers.set('access-control-allow-origin', '*');
      if (url.pathname.endsWith('.d.ts')) response.headers.set('content-type', 'text/plain; charset=utf-8');
    }
    return response;
  }

  const common = { 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' };
  const preview = PREVIEW_PATH_RE.exec(url.pathname);
  if (preview == null) {
    const found = SPA_ROUTES.has(url.pathname);
    const path = url.pathname.startsWith('/docs') ? '/docs' : '/';
    const page = new HTMLRewriter()
      .on('meta[property="og:url"]', {
        element: (element) => {
          if (found) element.setAttribute('content', PUBLIC_ORIGIN + path);
          else element.remove();
        },
      })
      .transform(asset);
    const response = withHeaders(page, found ? asset.status : 404, {
      ...common,
      'content-security-policy': __RELAXED_CSP__ ? DEV_HOME_CSP : HOME_CSP,
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
    });
    response.headers.delete('content-length');
    return response;
  }

  // The page itself is the SPA shell; its status mirrors what the content endpoint will answer so crawlers,
  // monitors and `curl` see the truth. The shell holds no preview data.
  const id = decodeURIComponent(preview[1]);
  let status = 200;
  let theme: PreviewTheme | null = null;
  if (id !== DEMO_PREVIEW_ID) {
    const row = await findPreview(env, id);
    status = row == null ? 404 : (await checkAccess(env, row, url)) === 'ok' ? 200 : 403;
    if (status === 200 && row != null) theme = readOptions(row.options).theme;
  }
  const param = url.searchParams.get('theme')?.toLowerCase();
  const bootTheme = THEMES.find((name) => name === param) ?? theme ?? 'dark';
  // Paint the theme's background and a loading skeleton straight away, before the app's JS has loaded.
  const page = new HTMLRewriter()
    .on('html', {
      element: (element) => {
        element.setAttribute('data-page', 'viewer');
        element.setAttribute('data-boot-theme', bootTheme);
        if (url.searchParams.get('bg') === 'transparent') element.setAttribute('data-boot-bg', 'transparent');
      },
    })
    // A preview is its own page, not the site's home.
    .on('meta[property="og:url"]', {
      element: (element) => {
        element.remove();
      },
    })
    .on('#root', {
      element: (element) => {
        if (status === 200) element.setInnerContent(SKELETON_HTML, { html: true });
      },
    })
    .transform(asset);
  const response = withHeaders(page, status, {
    ...common,
    'content-security-policy': __RELAXED_CSP__ ? DEV_PREVIEW_CSP : PREVIEW_CSP,
    // Signed URLs carry their signature in the query; never send it on to media hosts.
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex',
  });
  response.headers.delete('x-frame-options');
  response.headers.delete('content-length');
  return response;
};
