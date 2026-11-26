import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AppRoot } from '@discord-mana/components';
import { LinkIcon } from '@discord-mana/icons';
import type { Limits } from '../../shared/api';
import { CodeBlock, InlineCode } from '../site/CodeBlock';
import { SiteHeader } from '../site/SiteHeader';
import { useSiteTheme } from '../site/useSiteTheme';
import siteStyles from '../site/Site.module.css';
import { THEME_CLASSES } from '../viewParams';
import styles from './Docs.module.css';

const ORIGIN = window.location.origin;

const SECTIONS = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'authentication', title: 'Authentication' },
  { id: 'creating-previews', title: 'Creating previews' },
  { id: 'secret-previews', title: 'Secret previews and signed URLs' },
  { id: 'listing-and-deleting', title: 'Listing and deleting' },
  { id: 'embedding', title: 'Embedding' },
  { id: 'limits', title: 'Limits' },
  { id: 'errors', title: 'Errors' },
] as const;

const Anchor = ({ id }: { id: string }) => (
  <a className={styles.anchor} href={`#${id}`} aria-label="Link to this section">
    <LinkIcon size="xs" color="currentColor" />
  </a>
);

Anchor.displayName = 'Anchor';

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section className={styles.section} aria-labelledby={id}>
    <h2 id={id} className={styles.h2}>
      {title}
      <Anchor id={id} />
    </h2>
    {children}
  </section>
);

Section.displayName = 'Section';

const H3 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h3 id={id} className={styles.h3}>
    {children}
    <Anchor id={id} />
  </h3>
);

H3.displayName = 'H3';

const Endpoint = ({ method, path, auth }: { method: 'GET' | 'POST' | 'DELETE'; path: string; auth: string }) => (
  <div className={styles.endpoint}>
    <span className={clsx(styles.method, styles[`method${method}`])}>{method}</span>
    <code className={styles.endpointPath}>{path}</code>
    <span className={styles.endpointAuth}>{auth}</span>
  </div>
);

Endpoint.displayName = 'Endpoint';

type FieldRow = [name: string, type: string, description: ReactNode];

const Fields = ({
  rows,
  head = ['Field', 'Type', 'Description'],
  testId,
}: {
  rows: FieldRow[];
  head?: string[];
  testId?: string;
}) => (
  <div className={styles.tableWrap}>
    <table className={siteStyles.table} data-testid={testId}>
      <thead>
        <tr>
          {head.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, type, description]) => (
          <tr key={name}>
            <td>
              <InlineCode>{name}</InlineCode>
            </td>
            <td className={styles.type}>{type}</td>
            <td>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

Fields.displayName = 'Fields';

const curl = (method: string, path: string, body?: string) =>
  [
    `curl${method === 'GET' ? '' : ` -X ${method}`} ${ORIGIN}${path}`,
    `  -H "Authorization: Bearer $MANA_PREVIEW_KEY"`,
    ...(body != null ? ['  -H "Content-Type: application/json"', `  -d '${body}'`] : []),
  ].join(' \\\n');

const js = (method: string, path: string, body?: string, result = 'const data = await response.json();') =>
  [
    `const response = await fetch('${ORIGIN}${path}', {`,
    ...(method !== 'GET' ? [`  method: '${method}',`] : []),
    '  headers: {',
    '    Authorization: `Bearer ${process.env.MANA_PREVIEW_KEY}`,',
    ...(body != null ? ["    'Content-Type': 'application/json',"] : []),
    '  },',
    ...(body != null ? [`  body: JSON.stringify(${body}),`] : []),
    '});',
    result,
  ].join('\n');

const CREATE_BODY = `{
  "data": [
    {
      "author": {
        "id": "1000000000000000001",
        "username": "wumpus",
        "global_name": "Wumpus",
        "avatar_url": "https://cdn.example.com/avatars/wumpus.png"
      },
      "content": "Hello from a transcript!",
      "timestamp": "2026-11-26T09:20:10.000Z"
    }
  ],
  "options": { "title": "ticket-1042" }
}`;

const CREATE_BODY_JS = `{
    data: messages, // e.g. what GET /channels/{id}/messages returned
    secret: true,
    options: { title: 'ticket-1042' },
    expiresIn: 60 * 60 * 24 * 30,
  }`;

const CREATE_RESPONSE = `{
  "id": "Tq58RezRWP8nnWke",
  "url": "${ORIGIN}/p/Tq58RezRWP8nnWke",
  "secret": false,
  "messageCount": 1,
  "size": 214,
  "expiresAt": "2026-12-26T09:20:10.000Z"
}`;

const GATE_SNIPPET = `// Your server: check who is asking, then send them to a short-lived link.
app.get('/transcripts/:ticket', async (req, res) => {
  const ticket = await db.tickets.find(req.params.ticket);
  if (!ticket || !req.user.canView(ticket)) return res.sendStatus(404);

  const response = await fetch(\`${ORIGIN}/api/previews/\${ticket.previewId}\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.MANA_PREVIEW_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 300 }),
  });
  const { url } = await response.json();
  res.redirect(url);
});`;

const IFRAME_SNIPPET = `<iframe
  src="${ORIGIN}/p/Tq58RezRWP8nnWke?theme=light&bg=transparent"
  title="Ticket transcript"
  style="width: 100%; height: 480px; border: 0"
></iframe>`;

const RESIZE_SNIPPET = `window.addEventListener('message', (event) => {
  if (event.origin !== '${ORIGIN}') return;
  const { type, id, height } = event.data ?? {};
  if (type !== 'discord-mana:resize') return;
  // id is the preview's id, for pages that embed several.
  const frame = document.querySelector(\`iframe[data-preview="\${id}"]\`);
  if (frame) frame.style.height = \`\${height}px\`;
});`;

const ERRORS: [string, string, string][] = [
  ['400', 'invalid_body, invalid_json, invalid_query', 'The body or query is malformed.'],
  ['401', 'unauthorized', 'The key is missing or wrong.'],
  ['403', 'quota_exceeded', 'The key already holds as many previews or bytes as it may.'],
  ['403', 'missing_signature, invalid_signature, expired_signature', 'A secret preview without a working signed URL.'],
  ['404', 'not_found', 'No such preview, it expired, or it belongs to another key.'],
  ['405', 'method_not_allowed', 'The route exists, but not with that method.'],
  ['413', 'payload_too_large', 'The body is over the size limit.'],
  ['415', 'unsupported_media_type', 'The body isn’t sent as application/json.'],
  ['429', 'rate_limited', 'Too many requests or new keys. Wait for the seconds in Retry-After.'],
];

const formatBytes = (bytes: number) =>
  bytes >= 1024 ** 3
    ? `${+(bytes / 1024 ** 3).toFixed(1)} GiB`
    : bytes >= 1024 ** 2
      ? `${+(bytes / 1024 ** 2).toFixed(1)} MiB`
      : `${+(bytes / 1024).toFixed(1)} KiB`;

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
  const rows: [string, string, string][] = [
    ['Request body', formatBytes(limits.maxBodyBytes), 'MAX_BODY_BYTES'],
    ['Messages per preview', limits.maxMessagesPerPreview.toLocaleString(), 'MAX_MESSAGES_PER_PREVIEW'],
    ['Live previews per key', limits.maxPreviewsPerKey.toLocaleString(), 'MAX_PREVIEWS_PER_KEY'],
    ['Storage per key', formatBytes(limits.maxStorageBytesPerKey), 'MAX_STORAGE_BYTES_PER_KEY'],
    [
      'Preview lifetime',
      `${formatDuration(limits.defaultPreviewTtlSeconds)}, up to ${formatDuration(limits.maxPreviewTtlSeconds)}`,
      'DEFAULT_ / MAX_PREVIEW_TTL_SECONDS',
    ],
    [
      'Signed link lifetime',
      `${formatDuration(limits.defaultSignedUrlTtlSeconds)}, up to ${formatDuration(limits.maxSignedUrlTtlSeconds)}`,
      'DEFAULT_ / MAX_SIGNED_URL_TTL_SECONDS',
    ],
    [
      'New keys per IP address',
      `${limits.keyCreationLimit} per ${formatDuration(limits.keyCreationWindowSeconds)}`,
      'KEY_CREATION_LIMIT',
    ],
  ];
  return (
    <div className={styles.tableWrap}>
      <table className={siteStyles.table} data-testid="limits">
        <thead>
          <tr>
            <th>Limit</th>
            <th>On this site</th>
            <th>Setting</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value, setting]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{value}</td>
              <td className={styles.type}>{setting}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

LimitsTable.displayName = 'LimitsTable';

/** The section whose heading was scrolled past last. */
const useActiveSection = () => {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    const update = () => {
      let current: string = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const element = document.getElementById(id);
        if (element != null && element.getBoundingClientRect().top < 120) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActive(atBottom ? SECTIONS[SECTIONS.length - 1].id : current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return active;
};

const Sidebar = () => {
  const active = useActiveSection();
  return (
    <nav className={styles.sidebar} aria-label="Documentation">
      <ul className={styles.toc}>
        {SECTIONS.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={clsx(styles.tocLink, { [styles.tocLinkActive]: active === id })}
              aria-current={active === id ? 'location' : undefined}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

Sidebar.displayName = 'Sidebar';

const Content = () => (
  <article className={styles.content}>
    <header className={styles.intro}>
      <h1 className={styles.h1}>Documentation</h1>
      <p className={styles.lead}>
        mana preview turns Discord messages into a page that looks exactly like the client. Your bot sends the messages;
        you get back a URL to share, redirect to or embed.
      </p>
      <details className={styles.mobileToc}>
        <summary>On this page</summary>
        <ul>
          {SECTIONS.map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
            </li>
          ))}
        </ul>
      </details>
    </header>

    <Section id="getting-started" title="Getting started">
      <ol className={styles.steps}>
        <li>
          <a href="/#key">Create an API key</a> on the home page. It&apos;s shown once, so store it with your bot&apos;s
          other secrets.
        </li>
        <li>
          Send the messages to <InlineCode>POST /api/previews</InlineCode>, in the same format Discord&apos;s API
          returns them.
        </li>
        <li>
          Open the <InlineCode>url</InlineCode> in the response, link to it, or put it in an iframe.
        </li>
      </ol>
      <CodeBlock
        samples={[
          { label: 'curl', code: curl('POST', '/api/previews', CREATE_BODY) },
          {
            label: 'JavaScript',
            code: js('POST', '/api/previews', CREATE_BODY_JS, 'const { id, url } = await response.json();'),
          },
        ]}
      />
      <p className={styles.p}>
        Every response is JSON and every API route allows cross-origin requests, but keep your key on a server: anyone
        holding it can create and delete previews in your name.
      </p>
    </Section>

    <Section id="authentication" title="Authentication">
      <p className={styles.p}>
        Send the key in the <InlineCode>Authorization</InlineCode> header of every request except the public ones (
        <InlineCode>GET /api/previews/:id/content</InlineCode> and <InlineCode>GET /api/limits</InlineCode>). Keys look
        like <InlineCode>dm_</InlineCode> followed by an id and a secret; only a hash of the secret is stored, so a lost
        key can&apos;t be shown again.
      </p>
      <CodeBlock
        samples={[{ label: 'HTTP', code: 'Authorization: Bearer dm_TNuHQ3FNDXT0_JtJp8WybZez8F2RGbVvC2QSjkzlsXhXC' }]}
      />
      <H3 id="current-key">Check or revoke a key</H3>
      <Endpoint method="GET" path="/api/keys/current" auth="API key" />
      <p className={styles.p}>The key&apos;s name, when it was last used, its usage and the limits that apply.</p>
      <Endpoint method="DELETE" path="/api/keys/current" auth="API key" />
      <p className={styles.p}>
        Revokes the key and deletes every preview it created. Answers <InlineCode>204</InlineCode>.
      </p>
    </Section>

    <Section id="creating-previews" title="Creating previews">
      <Endpoint method="POST" path="/api/previews" auth="API key" />
      <Fields
        rows={[
          [
            'data',
            'array or object',
            <>
              The messages: an array, or <InlineCode>{'{ "messages": [...] }'}</InlineCode>. Required.
            </>,
          ],
          [
            'secret',
            'boolean',
            <>
              Only open through <a href="#secret-previews">signed URLs</a>. Default <InlineCode>false</InlineCode>.
            </>,
          ],
          [
            'options.title',
            'string',
            'Shown as the channel name in the header and the page title. Up to 100 characters.',
          ],
          ['options.theme', 'string', 'Default theme: light, ash, dark or onyx. The theme URL param overrides it.'],
          [
            'options.interactive',
            'boolean',
            'Shows buttons and selects as enabled. Clicking them still does nothing. Default false.',
          ],
          ['expiresIn', 'integer', 'Seconds until the preview is deleted. Defaults to the preview lifetime below.'],
        ]}
      />
      <H3 id="message-format">Message format</H3>
      <p className={styles.p}>
        Messages use Discord&apos;s API format, so you can pass what <InlineCode>GET /channels/:id/messages</InlineCode>{' '}
        or a gateway event gave you. Content, embeds, attachments, reactions, replies and Components v2 all render. Text
        is shown as written; markdown isn&apos;t parsed.
      </p>
      <ul className={styles.list}>
        <li>
          <InlineCode>author.id</InlineCode> (a snowflake) and <InlineCode>author.username</InlineCode> are required.
        </li>
        <li>
          Missing <InlineCode>id</InlineCode>, <InlineCode>timestamp</InlineCode> and <InlineCode>type</InlineCode> are
          filled in. Messages are shown oldest first, whatever order you send them in.
        </li>
        <li>
          Media is never copied. Images, videos and avatars load from the URLs you give, so host them somewhere that
          lasts as long as the preview. Set <InlineCode>author.avatar_url</InlineCode> to use your own avatar image.
        </li>
        <li>Only http and https URLs are accepted; anything else is rejected or dropped.</li>
      </ul>
      <CodeBlock title="201 Created" samples={[{ label: 'JSON', code: CREATE_RESPONSE }]} />
      <p className={styles.p}>
        <InlineCode>url</InlineCode> is <InlineCode>null</InlineCode> for secret previews.
      </p>
    </Section>

    <Section id="secret-previews" title="Secret previews and signed URLs">
      <p className={styles.p}>
        A secret preview only opens through a signed URL that expires. Use it to keep transcripts behind your own login:
        when someone asks for one, check they may see it, then redirect them to a fresh signed URL.
      </p>
      <Endpoint method="POST" path="/api/previews/:id" auth="API key" />
      <Fields
        rows={[
          [
            'expiresIn',
            'integer',
            'Seconds the link works for. Defaults to the signed link lifetime below and never outlives the preview.',
          ],
        ]}
      />
      <CodeBlock
        samples={[
          { label: 'curl', code: curl('POST', '/api/previews/oWUy21fQ4CP2O2fv', '{ "expiresIn": 300 }') },
          {
            label: 'JavaScript',
            code: js(
              'POST',
              '/api/previews/oWUy21fQ4CP2O2fv',
              '{ expiresIn: 300 }',
              'const { url } = await response.json();',
            ),
          },
        ]}
      />
      <CodeBlock
        title="200 OK"
        samples={[
          {
            label: 'JSON',
            code: `{
  "url": "${ORIGIN}/p/oWUy21fQ4CP2O2fv?exp=1795679683&sig=KqrQhzfKWkJzRzzSshygjOK16ESOgahcY7xmJEcHeOo",
  "expiresAt": "2026-11-26T09:25:10.000Z",
  "expiresIn": 300
}`,
          },
        ]}
      />
      <H3 id="gating">Gate previews behind your login</H3>
      <CodeBlock samples={[{ label: 'JavaScript', code: GATE_SNIPPET }]} />
      <p className={styles.p}>
        Without a valid signature the page shows a &ldquo;This preview is private&rdquo; screen and the data endpoint
        answers <InlineCode>403</InlineCode>. You can add the look params below to a signed URL; the signature only
        covers the preview and the expiry. Public previews can be signed too, which changes nothing.
      </p>
    </Section>

    <Section id="listing-and-deleting" title="Listing and deleting">
      <Endpoint method="GET" path="/api/previews" auth="API key" />
      <p className={styles.p}>Your previews, newest first.</p>
      <Fields
        head={['Query', 'Type', 'Description']}
        rows={[
          ['limit', 'integer', 'Previews per page, 1 to 100. Default 25.'],
          [
            'cursor',
            'string',
            <>
              The <InlineCode>nextCursor</InlineCode> of the previous page.
            </>,
          ],
        ]}
      />
      <CodeBlock
        title="200 OK"
        samples={[
          {
            label: 'JSON',
            code: `{
  "previews": [
    {
      "id": "Tq58RezRWP8nnWke",
      "secret": false,
      "messageCount": 1204,
      "size": 913402,
      "options": { "interactive": false, "title": "ticket-1042", "theme": null },
      "createdAt": "2026-11-26T09:20:10.000Z",
      "expiresAt": "2026-12-26T09:20:10.000Z",
      "url": "${ORIGIN}/p/Tq58RezRWP8nnWke"
    }
  ],
  "nextCursor": "1795673210000.Tq58RezRWP8nnWke"
}`,
          },
        ]}
      />
      <Endpoint method="GET" path="/api/previews/:id" auth="API key" />
      <p className={styles.p}>One of your previews, in the same shape.</p>
      <Endpoint method="DELETE" path="/api/previews/:id" auth="API key" />
      <p className={styles.p}>
        Deletes one of your previews and answers <InlineCode>204</InlineCode>. Previews made with another key answer{' '}
        <InlineCode>404</InlineCode>, exactly like ones that don&apos;t exist.
      </p>
      <CodeBlock
        samples={[
          { label: 'curl', code: curl('DELETE', '/api/previews/Tq58RezRWP8nnWke') },
          { label: 'JavaScript', code: js('DELETE', '/api/previews/Tq58RezRWP8nnWke', undefined, '// 204 No Content') },
        ]}
      />
    </Section>

    <Section id="embedding" title="Embedding">
      <p className={styles.p}>
        Any site can show a preview in an iframe. Inside an iframe the channel header is hidden unless you add{' '}
        <InlineCode>chrome=1</InlineCode>.
      </p>
      <CodeBlock samples={[{ label: 'HTML', code: IFRAME_SNIPPET }]} />
      <H3 id="auto-height">Auto height</H3>
      <p className={styles.p}>
        Whenever its height changes, the preview posts{' '}
        <InlineCode>{"{ type: 'discord-mana:resize', id, height }"}</InlineCode> to the page around it. Size the iframe
        from that message and it never needs a scrollbar, even for long transcripts, which render as you scroll.
      </p>
      <CodeBlock samples={[{ label: 'JavaScript', code: RESIZE_SNIPPET }]} />
      <H3 id="url-params">URL params</H3>
      <p className={styles.p}>
        Add these to any preview URL. Values that are unknown or out of range fall back to the default.
      </p>
      <Fields
        head={['Param', 'Values', 'Description']}
        testId="params"
        rows={[
          [
            'theme',
            'light, ash, dark, onyx',
            <>Discord&apos;s four themes. Default: the preview&apos;s theme, else dark.</>,
          ],
          ['spacing', '0, 4, 8, 16, 24', 'Space between message groups in pixels, like Discord’s setting. Default 16.'],
          ['density', 'compact, default, cozy', 'Density of buttons, selects and other controls. Default default.'],
          ['padding', '0 to 64', 'Padding around the messages in pixels. Default 16.'],
          ['bg', 'default, transparent', 'transparent lets your page show through.'],
          ['fontScale', '0.75 to 1.5', 'Scales text and spacing, like Discord’s font size (12 to 24 px). Default 1.'],
          ['saturation', '0 to 1', 'Colour saturation, as in Discord’s accessibility settings. Default 1.'],
          ['chrome', '0, 1', 'Channel header and welcome. Default 1 on its own page, 0 in an iframe.'],
          ['dates', '0, 1', 'Date dividers between days. Default 1.'],
          ['welcome', '0, 1', 'The “Welcome to #channel!” start of the transcript. Default: same as chrome.'],
          ['reducedMotion', '0, 1', 'Turns animations off or on. Default: the viewer’s system setting.'],
        ]}
      />
    </Section>

    <Section id="limits" title="Limits">
      <p className={styles.p}>
        These are the limits on this site; <InlineCode>GET /api/limits</InlineCode> returns them as JSON. If you run
        your own copy, each is a setting in <InlineCode>wrangler.jsonc</InlineCode>. Expired previews stop loading right
        away and are deleted daily.
      </p>
      <LimitsTable />
    </Section>

    <Section id="errors" title="Errors">
      <p className={styles.p}>
        Errors come with a status code and a body like this. <InlineCode>details</InlineCode> lists every validation
        problem with the path of the field.
      </p>
      <CodeBlock
        title="400 Bad Request"
        samples={[
          {
            label: 'JSON',
            code: `{
  "error": {
    "code": "invalid_body",
    "message": "Request body is invalid.",
    "details": [{ "path": "data.0.author.id", "message": "Expected a snowflake (a numeric string)" }]
  }
}`,
          },
        ]}
      />
      <div className={styles.tableWrap}>
        <table className={siteStyles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Code</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {ERRORS.map(([status, codes, when]) => (
              <tr key={codes}>
                <td>{status}</td>
                <td className={styles.codes}>
                  {codes.split(', ').map((code) => (
                    <InlineCode key={code}>{code}</InlineCode>
                  ))}
                </td>
                <td>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  </article>
);

Content.displayName = 'Content';

export const Docs = () => {
  const [theme, setTheme] = useSiteTheme();
  useEffect(() => {
    document.title = 'Docs · mana preview';
    // The SPA renders after the browser tried to scroll to the hash, so do it once the content exists.
    if (window.location.hash.length > 1) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, []);
  return (
    <AppRoot theme={THEME_CLASSES[theme]}>
      <div className={siteStyles.page}>
        <SiteHeader page="docs" theme={theme} onThemeChange={setTheme} />
        <div className={styles.layout}>
          <Sidebar />
          <Content />
        </div>
      </div>
    </AppRoot>
  );
};

Docs.displayName = 'Docs';
