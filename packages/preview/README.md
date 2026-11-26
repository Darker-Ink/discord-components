# @discord-mana/preview

A small Cloudflare Worker that renders Discord messages as hosted, embeddable pages. Create an API key on the
home page, `POST` messages in Discord's API format, and get back a URL that renders them with
`@discord-mana/messages`, exactly like the client. Built for ticket transcripts, logs and docs.

Live at https://preview.discord-mana.dev (docs at https://preview.discord-mana.dev/docs).

- **Worker + SPA** in one Vite project (`@cloudflare/vite-plugin`). The Worker (`src/worker`) serves the JSON API
  and every page; the React app (`src/client`) is the home page, the docs at `/docs` and the viewer at `/p/:id`.
- **D1** holds API keys (only a SHA-256 hash of each key's secret) and preview metadata. The quota checks and the
  insert are one statement, so concurrent requests can't overshoot a key's limits.
- **R2** (`PAYLOADS`) holds each preview's messages as one gzipped JSON object, `previews/<id>.json.gz`. Payloads
  can be large (10 MiB of JSON by default), far past D1's 2 MB row limit, and the content endpoint streams the
  object straight into the response without parsing it.
- **The viewer** renders long transcripts in chunks of 50 messages near the viewport (grouping and date dividers
  are worked out for the whole transcript first), with spacers of the measured height elsewhere. It works with the
  page's own scrolling and inside auto-height iframes, where the parent page scrolls.
- **First paint**: the Worker writes the theme and a message skeleton (`public/boot.css`) into the preview page's
  HTML, so an iframe never sits blank while the JS loads. Home, docs and viewer are separate chunks, and the Rive
  runtime behind expressive buttons (which messages never use) is split out and loaded on demand
  (`lazyExpressiveButton` in `vite.config.ts`).
- **Key creation** is limited per IP with a fixed-window counter in D1 (the IP is stored as a keyed HMAC). The
  Workers rate limiting binding only offers 10 or 60 second windows and counts per location; "5 keys an hour" needs
  an exact, global count. The binding (`API_RATE_LIMITER`, 120 requests a minute per key) still guards the
  authenticated API against bursts.
- **Signed URLs** are `/p/:id?exp=<unix seconds>&sig=<base64url HMAC-SHA256("v1:<id>:<exp>")>` with the
  `SIGNING_SECRET` Worker secret, verified with `crypto.subtle.verify` (constant time).

## Setup

```sh
pnpm install
cd packages/preview
cp .dev.vars.example .dev.vars          # local SIGNING_SECRET
pnpm db:migrate:local                   # create the local D1 tables
pnpm dev                                # prints the local URL
```

## Deploy

```sh
npx wrangler login
npx wrangler d1 create discord-mana-preview        # put the printed database_id into wrangler.jsonc
npx wrangler r2 bucket create discord-mana-preview-payloads
pnpm db:migrate:remote
openssl rand -base64 32 | npx wrangler secret put SIGNING_SECRET
pnpm deploy                                         # vite build && wrangler deploy
```

`wrangler.jsonc` routes the Worker to `preview.discord-mana.dev` as a Custom Domain. The `discord-mana.dev` zone has
to be on the same Cloudflare account; the first deploy creates the DNS record and certificate (don't add a record for
`preview` yourself). From the repo root, `pnpm deploy:preview` does the same as `pnpm deploy` here.

Creating a 10 MiB preview parses and validates every message, which takes well over the 10 ms of CPU time the
Workers Free plan allows; use Workers Paid (or lower `MAX_BODY_BYTES`). A 5,000-message, 2 MB transcript takes
about 0.2 s locally. Change `API_RATE_LIMITER.namespace_id` in `wrangler.jsonc` if the account already uses `1001`. Rotating
`SIGNING_SECRET` invalidates every signed link (and resets the key-creation counters). After changing bindings or
vars, run `pnpm types` to regenerate `src/worker/env.d.ts`.

## Limits

All are vars in `wrangler.jsonc`; `GET /api/limits` returns the values in effect.

| Var                              | Default            | Meaning                                                  |
| -------------------------------- | ------------------ | -------------------------------------------------------- |
| `MAX_BODY_BYTES`                 | 10485760 (10 MiB)  | Largest request body (at most 100 MiB).                  |
| `MAX_MESSAGES_PER_PREVIEW`       | 10000              | A sanity cap; the body size is the real limit.           |
| `MAX_PREVIEWS_PER_KEY`           | 1000               | Live (unexpired) previews per key.                       |
| `MAX_STORAGE_BYTES_PER_KEY`      | 1073741824 (1 GiB) | Combined JSON size of a key's live previews.             |
| `DEFAULT_PREVIEW_TTL_SECONDS`    | 2592000 (30 days)  | Lifetime when the request has no `expiresIn`.            |
| `MAX_PREVIEW_TTL_SECONDS`        | 31536000 (1 year)  | Longest `expiresIn` accepted.                            |
| `DEFAULT_SIGNED_URL_TTL_SECONDS` | 3600 (1 hour)      | Signed link lifetime when signing without `expiresIn`.   |
| `MAX_SIGNED_URL_TTL_SECONDS`     | 604800 (7 days)    | Longest signed link lifetime (never past the preview's). |
| `KEY_CREATION_LIMIT`             | 5                  | Keys one IP may create per window.                       |
| `KEY_CREATION_WINDOW_SECONDS`    | 3600               | The key-creation window.                                 |

Per message, Discord's own caps apply (4000 characters of content, 10 embeds, 10 attachments, 25 fields…). A daily
cron (`17 4 * * *`) deletes expired previews (rows and R2 objects); expired previews stop resolving immediately.

## API

The base URL is `https://preview.discord-mana.dev`. JSON everywhere, CORS enabled on `/api/*`. Authenticate with `Authorization: Bearer dm_<id>_<secret>`. Errors are
`{ "error": { "code", "message", "details"? } }`.

| Method   | Path                         | Auth              | Does                                                                                    |
| -------- | ---------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `POST`   | `/api/keys`                  | none (IP limited) | Creates a key: `{ name? }` → `201 { id, key, name, createdAt }`. The key is shown once. |
| `GET`    | `/api/keys/current`          | key               | The calling key, its usage (`previews`, `bytes`) and the limits.                        |
| `DELETE` | `/api/keys/current`          | key               | Revokes the key and deletes all its previews → `204`.                                   |
| `POST`   | `/api/previews`              | key               | Creates a preview → `201 { id, url, secret, messageCount, size, expiresAt }`.           |
| `GET`    | `/api/previews?limit&cursor` | key               | Your previews, newest first → `{ previews, nextCursor }` (limit 1–100, default 25).     |
| `GET`    | `/api/previews/:id`          | key               | One of your previews.                                                                   |
| `POST`   | `/api/previews/:id`          | key               | Signs a link: `{ expiresIn? }` → `{ url, expiresAt, expiresIn }`.                       |
| `DELETE` | `/api/previews/:id`          | key               | Deletes one of your previews → `204`. Others' previews are `404`.                       |
| `GET`    | `/api/previews/:id/content`  | public / signed   | What the viewer renders. Secret previews need `exp` and `sig`.                          |
| `GET`    | `/api/limits`                | none              | The limits in effect.                                                                   |

`POST /api/previews` body:

```jsonc
{
  "data": { "messages": [/* APIMessage */] }, // or the array itself
  "secret": false, // true: only signed links open it; `url` is null
  "options": {
    "interactive": false, // true: buttons and selects look enabled (clicking does nothing)
    "interactions": false, // true: the embedding page handles interactions (see Interactions)
    "allowedOrigins": ["https://app.example.com"], // optional: who may handle them
    "title": "ticket-1042", // channel-style header and page title
    "theme": "dark", // default theme: light | ash | dark | onyx
  },
  "expiresIn": 604800, // seconds
}
```

Messages are validated against the fields `<Message>` reads (author `id` must be a snowflake, `username` is
required, URLs must be absolute http(s)); unknown fields pass through. Missing `id`, `channel_id`, `timestamp` and
`type` are filled in, messages are sorted by timestamp, and unfurled media without `proxy_url`, `loading_state` or
`content_type` get them (from the URL's extension). Media is never re-hosted: host images yourself and set
`author.avatar_url` for avatars. Any `*url` field with a non-http(s) scheme is dropped.

Status codes: `400 invalid_body | invalid_json | invalid_query`, `401 unauthorized`,
`403 quota_exceeded | missing_signature | invalid_signature | expired_signature`, `404 not_found`,
`405 method_not_allowed`, `413 payload_too_large`, `415 unsupported_media_type`, `429 rate_limited` (with
`Retry-After`).

## Viewer and embedding

`/p/:id` renders the messages inside `AppRoot`, grouped like a channel (same author within 7 minutes, same day)
with date dividers, under a channel header and Discord's "Welcome to #channel!" start. Interactive components are disabled unless the preview was created with
`options.interactive`, and even then nothing is sent anywhere.

Preview pages send `Content-Security-Policy: … frame-ancestors *` and `Referrer-Policy: no-referrer`, so any site
can frame them and signatures never leak to media hosts. The home page and API keep `frame-ancestors 'none'`.

| Param           | Values                 | Default                    |
| --------------- | ---------------------- | -------------------------- |
| `theme`         | light, ash, dark, onyx | `options.theme`, then dark |
| `spacing`       | 0, 4, 8, 16, 24        | 16 (px between groups)     |
| `density`       | compact, default, cozy | default                    |
| `padding`       | 0–64                   | 16 (px)                    |
| `bg`            | default, transparent   | default                    |
| `fontScale`     | 0.75–1.5               | 1                          |
| `saturation`    | 0–1                    | 1                          |
| `chrome`        | 0, 1                   | 1 directly, 0 in an iframe |
| `dates`         | 0, 1                   | 1                          |
| `welcome`       | 0, 1                   | same as `chrome`           |
| `reducedMotion` | 0, 1                   | the viewer's OS setting    |

Compact message display isn't offered: the messages package renders the cozy layout only. Look params can be
added to a signed URL; the signature only covers the id and expiry.

Inside an iframe the page posts `{ type: 'discord-mana:resize', id, height }` to its parent whenever its height
changes:

```js
window.addEventListener('message', (event) => {
  if (event.data?.type === 'discord-mana:resize') iframe.style.height = `${event.data.height}px`;
});
```

## Interactions

Previews created with `options.interactions: true` and embedded with `?interactions=1` send component clicks,
select changes and modal submissions to the embedding page (`postMessage` events `discord-mana:interaction` and
`discord-mana:modal-submit`, with `data` in the API's interaction data shapes), and take commands back:
`append-message`, `update-message`, `delete-message`, `open-modal`, `set-loading`, `ack`, `interaction-failed`, `configure`
and `ping`, all prefixed `discord-mana:`. Commands are validated with the API's message and modal schemas (the
validation code only loads on pages that use interactions); invalid ones are dropped with a console warning.
Nothing is stored and nothing leaves the browser. Like Discord, an interaction nobody answers within 3 seconds
fails; `set-loading` extends that to 15 minutes. Both are configurable, in ms: `connectPreview`'s
`timeouts: { response, deferred }` (sent as a `configure` command) or the `responseTimeout` / `deferredTimeout`
URL params; `0`, `Infinity` or `none` never fail, other values are clamped to 100 ms to 24 hours. `options.allowedOrigins` (up to 10 origins) limits which parent
pages receive events and may send commands.

`public/sdk/connect-preview.js` (with `connect-preview.d.ts`) is a dependency-free helper, served with CORS at
`https://preview.discord-mana.dev/sdk/connect-preview.js`: `connectPreview(iframe, { onInteraction, onModalSubmit, onReady })` returns
`{ appendMessage, updateMessage, deleteMessage, openModal, setLoading, ack, fail, disconnect }`. `/docs#interactions`
has a full example.

## Tests

- `pnpm test`: API tests in the Workers runtime (`@cloudflare/vitest-plugin`, local D1 and R2, test limits from
  `vitest.config.ts`), including a 5,000-message preview.
- `pnpm test:e2e [base-url]`: Playwright checks of the home page, the docs and the viewer in all four themes, signed,
  403 and 404 pages, URL params, a 5,000-message transcript at the top level and in a cross-origin auto-height
  iframe, interactions from a parent page on another origin (clicks, selects, a modal, loading and failures,
  invalid commands, `allowedOrigins`), and phone-width layouts. Run it against `pnpm preview` (production build, strict
  CSP); screenshots land in `test-results/e2e`. Set `CHROMIUM_PATH` if Chromium isn't at
  `/opt/pw-browsers/chromium`. Locally created keys count against the per-IP limit; clear it with
  `wrangler d1 execute DB --local --command "DELETE FROM key_creation_windows"`.
