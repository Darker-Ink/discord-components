# @discord-mana/preview

A small Cloudflare Worker that renders Discord messages as hosted, embeddable pages. Create an API key on the
home page, `POST` messages in Discord's API format, and get back a URL that renders them with
`@discord-mana/messages`, exactly like the client. Built for ticket transcripts, logs and docs.

- **Worker + SPA** in one Vite project (`@cloudflare/vite-plugin`). The Worker (`src/worker`) serves the JSON API
  and every page; the React app (`src/client`) is the home page and the viewer at `/p/:id`.
- **D1** holds API keys (only a SHA-256 hash of each key's secret), preview metadata and the payloads (gzipped JSON
  in a separate table, so listing never reads them). A preview is capped at 1 MiB of JSON, well under D1's 2 MB
  row limit, and gzip shrinks message JSON several times over, so D1 keeps everything consistent, transactional
  (quota checks and inserts are one statement) and in one binding. R2 would only pay off for payloads far larger
  than this service allows.
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
pnpm db:migrate:remote
openssl rand -base64 32 | npx wrangler secret put SIGNING_SECRET
pnpm deploy                                         # vite build && wrangler deploy
```

Change `API_RATE_LIMITER.namespace_id` in `wrangler.jsonc` if the account already uses `1001`. Rotating
`SIGNING_SECRET` invalidates every signed link (and resets the key-creation counters). After changing bindings or
vars, run `pnpm types` to regenerate `src/worker/env.d.ts`.

## Limits

All are vars in `wrangler.jsonc`; `GET /api/limits` returns the values in effect.

| Var                              | Default             | Meaning                                                  |
| -------------------------------- | ------------------- | -------------------------------------------------------- |
| `MAX_BODY_BYTES`                 | 1048576 (1 MiB)     | Largest request body (hard ceiling 2,000,000).           |
| `MAX_MESSAGES_PER_PREVIEW`       | 200                 | Messages in one preview.                                 |
| `MAX_PREVIEWS_PER_KEY`           | 1000                | Live (unexpired) previews per key.                       |
| `MAX_STORAGE_BYTES_PER_KEY`      | 104857600 (100 MiB) | Combined JSON size of a key's live previews.             |
| `DEFAULT_PREVIEW_TTL_SECONDS`    | 2592000 (30 days)   | Lifetime when the request has no `expiresIn`.            |
| `MAX_PREVIEW_TTL_SECONDS`        | 31536000 (1 year)   | Longest `expiresIn` accepted.                            |
| `DEFAULT_SIGNED_URL_TTL_SECONDS` | 3600 (1 hour)       | Signed link lifetime when signing without `expiresIn`.   |
| `MAX_SIGNED_URL_TTL_SECONDS`     | 604800 (7 days)     | Longest signed link lifetime (never past the preview's). |
| `KEY_CREATION_LIMIT`             | 5                   | Keys one IP may create per window.                       |
| `KEY_CREATION_WINDOW_SECONDS`    | 3600                | The key-creation window.                                 |

Per message, Discord's own caps apply (4000 characters of content, 10 embeds, 10 attachments, 25 fields…). A daily
cron (`17 4 * * *`) deletes expired previews; expired previews stop resolving immediately.

## API

JSON everywhere, CORS enabled on `/api/*`. Authenticate with `Authorization: Bearer dm_<id>_<secret>`. Errors are
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
with date dividers. Interactive components are disabled unless the preview was created with
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

## Tests

- `pnpm test`: API tests in the Workers runtime (`@cloudflare/vitest-plugin`, local D1, small limits from
  `vitest.config.ts`).
- `pnpm test:e2e [base-url]`: Playwright checks of the home page, the viewer in all themes, signed and 403 pages,
  URL params and cross-origin iframes with resize messages. Run it against `pnpm preview` (production build, strict
  CSP); screenshots land in `test-results/e2e`. Set `CHROMIUM_PATH` if Chromium isn't at
  `/opt/pw-browsers/chromium`. Locally created keys count against the per-IP limit; clear it with
  `wrangler d1 execute DB --local --command "DELETE FROM key_creation_windows"`.
