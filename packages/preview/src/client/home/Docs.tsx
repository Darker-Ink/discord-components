import { Fragment, useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Card, Text } from '@discord-mana/components';
import type { Limits } from '../../shared/api';
import { CodeBlock, InlineCode } from './CodeBlock';
import styles from './Home.module.css';

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  auth: 'key' | 'none' | 'signature';
  summary: ReactNode;
  request?: string;
  response?: string;
}

const origin = window.location.origin;

const CREATE_REQUEST = `curl -X POST ${origin}/api/previews \\
  -H "Authorization: Bearer $DM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": { "messages": [
      {
        "author": { "id": "1000000000000000001", "username": "wumpus", "avatar_url": "https://cdn.example.com/wumpus.png" },
        "content": "Hello from a transcript!",
        "timestamp": "2026-11-26T09:20:10.000Z"
      }
    ] },
    "secret": false,
    "options": { "title": "ticket-1042", "theme": "dark", "interactive": false },
    "expiresIn": 604800
  }'`;

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/previews',
    auth: 'key',
    summary: (
      <>
        Creates a preview. <InlineCode>data</InlineCode> is an array of messages in Discord API format (as the REST API
        returns them) or <InlineCode>{'{ messages: [...] }'}</InlineCode>. Messages are shown oldest first.{' '}
        <InlineCode>secret</InlineCode> previews only open through signed links.{' '}
        <InlineCode>options.interactive</InlineCode> shows buttons and selects enabled (they still do nothing).{' '}
        <InlineCode>expiresIn</InlineCode> is in seconds. Media URLs are used as given: host images yourself.
      </>
    ),
    request: CREATE_REQUEST,
    response: `201 Created
{ "id": "Tq58RezRWP8nnWke", "url": "${origin}/p/Tq58RezRWP8nnWke",
  "secret": false, "messageCount": 1, "size": 179, "expiresAt": "2026-12-03T09:20:10.000Z" }`,
  },
  {
    method: 'POST',
    path: '/api/previews/:id',
    auth: 'key',
    summary: (
      <>
        Signs a link to one of your previews, valid for <InlineCode>expiresIn</InlineCode> seconds. Use it to gate
        secret previews behind your own auth: check the user, then redirect them to the signed URL.
      </>
    ),
    request: `curl -X POST ${origin}/api/previews/oWUy21fQ4CP2O2fv \\
  -H "Authorization: Bearer $DM_KEY" \\
  -H "Content-Type: application/json" -d '{ "expiresIn": 600 }'`,
    response: `{ "url": "${origin}/p/oWUy21fQ4CP2O2fv?exp=1795679683&sig=KqrQhz…",
  "expiresAt": "2026-11-26T09:30:10.000Z", "expiresIn": 600 }`,
  },
  {
    method: 'GET',
    path: '/api/previews',
    auth: 'key',
    summary: (
      <>
        Lists your previews, newest first. Pass <InlineCode>limit</InlineCode> (1 to 100, default 25) and the{' '}
        <InlineCode>nextCursor</InlineCode> of the previous page as <InlineCode>cursor</InlineCode>.
      </>
    ),
    response: `{ "previews": [{ "id": "…", "secret": true, "messageCount": 12, "size": 48211, "url": null,
  "options": { … }, "createdAt": "…", "expiresAt": "…" }], "nextCursor": "1795…" }`,
  },
  { method: 'GET', path: '/api/previews/:id', auth: 'key', summary: 'One of your previews, as in the list.' },
  {
    method: 'DELETE',
    path: '/api/previews/:id',
    auth: 'key',
    summary: (
      <>
        Deletes one of your previews: <InlineCode>204</InlineCode>. Other keys&apos; previews answer{' '}
        <InlineCode>404</InlineCode>, the same as missing ones.
      </>
    ),
  },
  {
    method: 'GET',
    path: '/api/previews/:id/content',
    auth: 'signature',
    summary: (
      <>
        The messages and options the viewer renders. Public previews need nothing; secret ones need the{' '}
        <InlineCode>exp</InlineCode> and <InlineCode>sig</InlineCode> of a signed URL.
      </>
    ),
  },
  {
    method: 'POST',
    path: '/api/keys',
    auth: 'none',
    summary: (
      <>
        Creates a key (what the form above does). Body <InlineCode>{'{ "name"?: string }'}</InlineCode>. Limited per IP
        address.
      </>
    ),
  },
  {
    method: 'GET',
    path: '/api/keys/current',
    auth: 'key',
    summary: 'The key you call with: its name, usage (previews, bytes) and the limits.',
  },
  {
    method: 'DELETE',
    path: '/api/keys/current',
    auth: 'key',
    summary: 'Revokes the key you call with and deletes all of its previews.',
  },
  { method: 'GET', path: '/api/limits', auth: 'none', summary: 'The limits this deployment enforces.' },
];

const AUTH_LABELS = { key: 'API key', none: 'No auth', signature: 'Public or signed' } as const;

const EndpointCard = ({ endpoint }: { endpoint: Endpoint }) => (
  <Card className={clsx(styles.card, styles.endpoint)}>
    <div className={styles.endpointHead}>
      <span className={clsx(styles.method, styles[`method${endpoint.method}`])}>{endpoint.method}</span>
      <code className={styles.endpointPath}>{endpoint.path}</code>
      <span className={styles.authTag}>{AUTH_LABELS[endpoint.auth]}</span>
    </div>
    <Text variant="body-md/normal" color="text-default" className={styles.prose}>
      {endpoint.summary}
    </Text>
    {endpoint.request != null ? <CodeBlock label="Request" code={endpoint.request} /> : null}
    {endpoint.response != null ? <CodeBlock label="Response" code={endpoint.response} /> : null}
  </Card>
);

EndpointCard.displayName = 'EndpointCard';

const ERRORS: [string, string, string][] = [
  [
    '400',
    'invalid_body, invalid_json, invalid_query',
    'The body or query is malformed; `details` lists each problem with its path.',
  ],
  ['401', 'unauthorized', 'Missing or invalid API key.'],
  ['403', 'quota_exceeded', 'The key holds as many previews or bytes as it may.'],
  ['403', 'missing_signature, invalid_signature, expired_signature', 'A secret preview without a valid signed link.'],
  ['404', 'not_found', 'No such preview, or not yours, or expired.'],
  ['413', 'payload_too_large', 'The body is over the size limit.'],
  ['415', 'unsupported_media_type', 'The body is not sent as application/json.'],
  ['429', 'rate_limited', 'Too many requests (or keys); wait for `Retry-After` seconds.'],
];

interface Param {
  name: string;
  values: string;
  fallback: string;
  description: string;
}

const PARAMS: Param[] = [
  {
    name: 'theme',
    values: 'light, ash, dark, onyx',
    fallback: 'options.theme, then dark',
    description: "Discord's four themes.",
  },
  {
    name: 'spacing',
    values: '0, 4, 8, 16, 24',
    fallback: '16',
    description: 'Space between message groups, in px (Discord’s setting).',
  },
  {
    name: 'density',
    values: 'compact, default, cozy',
    fallback: 'default',
    description: 'UI density of buttons, selects and other components.',
  },
  { name: 'padding', values: '0 to 64', fallback: '16', description: 'Padding around the messages, in px.' },
  {
    name: 'bg',
    values: 'default, transparent',
    fallback: 'default',
    description: 'Transparent lets your page show through the iframe.',
  },
  {
    name: 'fontScale',
    values: '0.75 to 1.5',
    fallback: '1',
    description: 'Scales all text and spacing, like Discord’s font size setting (12px to 24px).',
  },
  {
    name: 'saturation',
    values: '0 to 1',
    fallback: '1',
    description: 'Colour saturation, as in Discord’s accessibility settings.',
  },
  { name: 'chrome', values: '0, 1', fallback: '1 directly, 0 in an iframe', description: 'Shows the channel header.' },
  { name: 'dates', values: '0, 1', fallback: '1', description: 'Shows the date dividers between days.' },
  {
    name: 'reducedMotion',
    values: '0, 1',
    fallback: 'the viewer’s OS setting',
    description: 'Turns animations off (1) or on (0).',
  },
  {
    name: 'exp, sig',
    values: 'from POST /api/previews/:id',
    fallback: '',
    description: 'The signature of a signed link. Other params can be added to a signed URL freely.',
  },
];

const RESIZE_SNIPPET = `window.addEventListener('message', (event) => {
  if (event.origin !== '${origin}') return;
  const { type, id, height } = event.data ?? {};
  if (type !== 'discord-mana:resize') return;
  // \`id\` is the preview id, for pages with several previews.
  document.querySelector(\`iframe[data-preview="\${id}"]\`).style.height = height + 'px';
});`;

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${+(bytes / 1024 / 1024).toFixed(1)} MiB` : `${+(bytes / 1024).toFixed(1)} KiB`;

const formatDuration = (seconds: number) => {
  if (seconds % 86400 === 0) return seconds === 86400 ? '1 day' : `${seconds / 86400} days`;
  if (seconds % 3600 === 0) return seconds === 3600 ? '1 hour' : `${seconds / 3600} hours`;
  return `${Math.round(seconds / 60)} minutes`;
};

const useLimits = () => {
  const [limits, setLimits] = useState<Limits | null>(null);
  useEffect(() => {
    fetch('/api/limits')
      .then((response) => (response.ok ? (response.json() as Promise<Limits>) : null))
      .then(setLimits)
      .catch(() => setLimits(null));
  }, []);
  return limits;
};

const LimitsTable = () => {
  const limits = useLimits();
  if (limits == null) return null;
  const rows: [string, string][] = [
    ['Request body', formatBytes(limits.maxBodyBytes)],
    ['Messages per preview', String(limits.maxMessagesPerPreview)],
    ['Live previews per key', String(limits.maxPreviewsPerKey)],
    ['Storage per key', formatBytes(limits.maxStorageBytesPerKey)],
    [
      'Preview lifetime',
      `${formatDuration(limits.defaultPreviewTtlSeconds)} by default, up to ${formatDuration(limits.maxPreviewTtlSeconds)}`,
    ],
    [
      'Signed link lifetime',
      `${formatDuration(limits.defaultSignedUrlTtlSeconds)} by default, up to ${formatDuration(limits.maxSignedUrlTtlSeconds)}`,
    ],
    ['New keys per IP address', `${limits.keyCreationLimit} per ${formatDuration(limits.keyCreationWindowSeconds)}`],
  ];
  return (
    <table className={styles.table} data-testid="limits">
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

LimitsTable.displayName = 'LimitsTable';

export const ApiDocs = () => (
  <div className={styles.stackLarge}>
    <Text variant="body-md/normal" color="text-muted" className={styles.prose}>
      JSON in, JSON out, CORS enabled. Authenticate with <InlineCode>Authorization: Bearer dm_…</InlineCode>. Errors
      look like <InlineCode>{'{ "error": { "code", "message", "details"? } }'}</InlineCode>.
    </Text>
    <div className={styles.endpoints}>
      {ENDPOINTS.map((endpoint) => (
        <EndpointCard key={`${endpoint.method} ${endpoint.path}`} endpoint={endpoint} />
      ))}
    </div>
    <div>
      <Text variant="heading-md/semibold" color="text-strong" tag="h3" className={styles.subheading}>
        Errors
      </Text>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Status</th>
            <th>Code</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {ERRORS.map(([status, code, when]) => (
            <tr key={code}>
              <td>{status}</td>
              <td>
                {code.split(', ').map((part, index) => (
                  <Fragment key={part}>
                    {index > 0 ? ' ' : null}
                    <InlineCode>{part}</InlineCode>
                  </Fragment>
                ))}
              </td>
              <td>{when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

ApiDocs.displayName = 'ApiDocs';

export const EmbeddingDocs = () => (
  <div className={styles.stackLarge}>
    <Text variant="body-md/normal" color="text-muted" className={styles.prose}>
      Preview pages can be framed by any site. Add these query params to a preview URL to change its look. Unknown or
      out-of-range values fall back to the default.
    </Text>
    <table className={styles.table} data-testid="params">
      <thead>
        <tr>
          <th>Param</th>
          <th>Values</th>
          <th>Default</th>
          <th>What it does</th>
        </tr>
      </thead>
      <tbody>
        {PARAMS.map((param) => (
          <tr key={param.name}>
            <td>
              <InlineCode>{param.name}</InlineCode>
            </td>
            <td>{param.values}</td>
            <td>{param.fallback}</td>
            <td>{param.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div>
      <Text variant="heading-md/semibold" color="text-strong" tag="h3" className={styles.subheading}>
        Auto height
      </Text>
      <Text variant="body-md/normal" color="text-muted" className={styles.prose}>
        Inside an iframe, a preview posts <InlineCode>{"{ type: 'discord-mana:resize', id, height }"}</InlineCode> to
        its parent whenever its height changes. Size the iframe from it:
      </Text>
    </div>
    <CodeBlock code={RESIZE_SNIPPET} />
  </div>
);

EmbeddingDocs.displayName = 'EmbeddingDocs';

export const LimitsDocs = () => (
  <div className={styles.stackLarge}>
    <Text variant="body-md/normal" color="text-muted" className={styles.prose}>
      Expired previews stop resolving right away and are swept daily. Media is never re-hosted: image, video and avatar
      URLs load straight from wherever you host them (https only), so keep them reachable as long as the preview lives.
    </Text>
    <LimitsTable />
  </div>
);

LimitsDocs.displayName = 'LimitsDocs';
