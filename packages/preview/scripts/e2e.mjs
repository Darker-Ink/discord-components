#!/usr/bin/env node
/* global process, console, fetch, URL, navigator, document, window, getComputedStyle */
// End-to-end checks of the preview site in a real browser. Run against a running server:
//   pnpm --filter @discord-mana/preview build && pnpm --filter @discord-mana/preview exec vite preview --port 5181
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/e2e.mjs http://localhost:5181
// Screenshots go to test-results/e2e (or E2E_OUT).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:5181').replace(/\/$/, '');
const OUT = process.env.E2E_OUT ?? path.join(import.meta.dirname, '..', 'test-results', 'e2e');
const THEMES = ['light', 'ash', 'dark', 'onyx'];
const THEME_CLASSES = { light: 'theme-light', ash: 'theme-dark', dark: 'theme-darker', onyx: 'theme-midnight' };
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL ${name}\n       ${error.stack?.split('\n').slice(0, 3).join('\n       ')}`);
  }
};

const api = async (method, route, { key, body } = {}) => {
  const response = await fetch(BASE + route, {
    method,
    headers: {
      ...(key != null ? { authorization: `Bearer ${key}` } : {}),
      ...(body != null ? { 'content-type': 'application/json' } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text !== '' ? JSON.parse(text) : null };
};

const AUTHOR = {
  id: '1000000000000000001',
  username: 'wumpus',
  global_name: 'Wumpus',
  avatar_url: `${BASE}/example/avatar.png`,
};
const BOT = { id: '1000000000000000002', username: 'Helper', bot: true, avatar_url: `${BASE}/example/icon.png` };

const MESSAGES = [
  { author: AUTHOR, content: 'First message of the transcript', timestamp: '2026-11-24T10:00:00.000Z' },
  { author: AUTHOR, content: 'Grouped with the first one', timestamp: '2026-11-24T10:01:00.000Z' },
  {
    author: BOT,
    content: 'Here is an embed and a button',
    timestamp: '2026-11-25T12:00:00.000Z',
    embeds: [{ title: 'Embed title', description: 'Embed description', color: 0x5865f2, url: 'https://example.com' }],
    components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Press me', custom_id: 'press' }] }],
  },
  {
    author: AUTHOR,
    content: 'With an image attachment',
    timestamp: '2026-11-25T12:05:00.000Z',
    attachments: [
      { filename: 'shot.png', url: `${BASE}/example/landscape.png`, width: 1280, height: 720, size: 140222 },
    ],
  },
];

// A page on another origin that frames previews and records what they post.
const startScratchServer = () =>
  new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const src = new URL(request.url, 'http://x').searchParams.get('src') ?? '';
      response.setHeader('content-type', 'text/html');
      response.end(`<!doctype html><html><body style="margin:0;background:#f0e6ff;padding:24px">
<h1 style="font:600 16px sans-serif">Scratch page</h1>
<iframe id="frame" src="${src.replaceAll('"', '&quot;')}" style="width:720px;border:0;height:50px"></iframe>
<script>
  window.resizes = [];
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'discord-mana:resize') return;
    window.resizes.push({ origin: event.origin, ...event.data });
    document.getElementById('frame').style.height = event.data.height + 'px';
  });
</script></body></html>`);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const main = async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const pickTheme = async (theme) => {
    await page.getByRole('radio', { name: theme[0].toUpperCase() + theme.slice(1) }).click();
    assert.ok(await page.evaluate((cls) => document.documentElement.classList.contains(cls), THEME_CLASSES[theme]));
  };

  let key;
  console.log('Home page');
  await step('creates an API key and copies it with a toast', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByLabel('Create an API key').fill('e2e');
    await page.getByRole('button', { name: 'Create key' }).click();
    const created = page.locator('[data-testid=key-created]');
    const input = created.locator('input[readonly]');
    await input.waitFor();
    key = await input.inputValue();
    assert.match(key, /^dm_[0-9A-Za-z]{12}_[0-9A-Za-z]{32}$/);
    await created.getByRole('button', { name: 'Copy' }).click();
    await page.getByRole('log').getByText('API key copied to clipboard').first().waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), key);
    await page.screenshot({ path: path.join(OUT, 'home-key-created.png') });
  });

  await step('renders the home page and its live example in all four themes', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    for (const theme of THEMES) {
      await pickTheme(theme);
      const frame = page.frameLocator('[data-testid=example-frame]');
      await frame.getByText('Confirmed, all good now. Thank you!').waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `home-${theme}.png`) });
    }
    await pickTheme('dark');
  });

  console.log('Docs');
  await step('has a sidebar, anchors, tabbed code and copy buttons', async () => {
    await page.goto(`${BASE}/docs`, { waitUntil: 'networkidle' });
    const links = page.getByRole('navigation', { name: 'Documentation' }).getByRole('link');
    assert.equal(await links.count(), 8);
    await links.filter({ hasText: 'Embedding' }).click();
    await page.waitForFunction(() => window.location.hash === '#embedding');
    await page.waitForTimeout(400);
    assert.equal(
      await page.getByRole('navigation', { name: 'Documentation' }).locator('[aria-current=location]').innerText(),
      'Embedding',
    );
    const top = await page.locator('#embedding').evaluate((element) => element.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 200, `heading at ${top}`);

    await page.getByRole('tab', { name: 'JavaScript' }).first().click();
    const selected = await page.locator('[role=tab][aria-selected=true]').allInnerTexts();
    assert.ok(selected.length > 2 && selected.every((label) => label === 'JavaScript'), selected.join());
    await page.getByRole('button', { name: 'Copy code' }).first().click();
    await page.getByRole('log').getByText('Code copied to clipboard').first().waitFor();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /fetch\(/);
    await page.getByRole('tab', { name: 'curl' }).first().click();
  });

  await step('documents every URL param and the limits', async () => {
    const params = await page.locator('[data-testid=params] tbody tr td:first-child').allInnerTexts();
    for (const name of [
      'theme',
      'spacing',
      'density',
      'padding',
      'bg',
      'fontScale',
      'saturation',
      'chrome',
      'dates',
      'welcome',
    ]) {
      assert.ok(params.includes(name), `missing ${name}`);
    }
    assert.ok((await page.locator('[data-testid=limits] tbody tr').count()) >= 6);
  });

  await step('renders the docs in all four themes', async () => {
    for (const theme of THEMES) {
      await pickTheme(theme);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `docs-${theme}.png`) });
    }
    await page.evaluate(() => document.getElementById('url-params').scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'docs-url-params-onyx.png') });
    await pickTheme('dark');
  });

  console.log('API');
  let publicId;
  let secretId;
  let interactiveId;
  await step('creates public, secret and interactive previews with the key', async () => {
    const created = await api('POST', '/api/previews', {
      key,
      body: { data: MESSAGES, options: { title: 'e2e-transcript' } },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    publicId = created.body.id;
    const secret = await api('POST', '/api/previews', { key, body: { data: { messages: MESSAGES }, secret: true } });
    assert.equal(secret.status, 201);
    assert.equal(secret.body.url, null);
    secretId = secret.body.id;
    const interactive = await api('POST', '/api/previews', {
      key,
      body: { data: MESSAGES.slice(2, 3), options: { interactive: true } },
    });
    interactiveId = interactive.body.id;
  });

  console.log('Viewer');
  await step('renders the preview in all four themes', async () => {
    for (const theme of THEMES) {
      await page.goto(`${BASE}/p/${publicId}?theme=${theme}`, { waitUntil: 'networkidle' });
      await page.getByText('With an image attachment').waitFor();
      assert.ok(await page.evaluate((cls) => document.documentElement.classList.contains(cls), THEME_CLASSES[theme]));
      await page.getByText('Welcome to #e2e-transcript!').waitFor();
      await page.screenshot({ path: path.join(OUT, `preview-${theme}.png`), fullPage: true });
    }
  });

  await step('groups messages and shows date dividers', async () => {
    const headers = await page.locator('[id^=message-username-] [data-text]').allInnerTexts();
    // Two Wumpus messages one minute apart share a header; the bot and the next day start new groups.
    assert.deepEqual(headers, ['Wumpus', 'Helper', 'Wumpus']);
    assert.equal(await page.locator('[role=separator][aria-label]').count(), 2);
    assert.equal(await page.title(), '#e2e-transcript');
  });

  await step('disables interactive components by default', async () => {
    assert.ok(await page.getByRole('button', { name: 'Press me' }).isDisabled());
  });

  await step('opt-in interactive components stay display-only', async () => {
    const requests = [];
    const listener = (request) => requests.push(request.url());
    await page.goto(`${BASE}/p/${interactiveId}`, { waitUntil: 'networkidle' });
    page.on('request', listener);
    const button = page.getByRole('button', { name: 'Press me' });
    assert.ok(await button.isEnabled());
    await button.click();
    await page.waitForTimeout(300);
    page.off('request', listener);
    assert.deepEqual(requests, []);
  });

  await step('secret previews show a 403 page without a valid signature', async () => {
    const response = await page.goto(`${BASE}/p/${secretId}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 403);
    await page.getByRole('heading', { name: 'This preview is private' }).waitFor();
    await page.screenshot({ path: path.join(OUT, 'preview-403.png') });
    const tampered = await page.goto(`${BASE}/p/${secretId}?exp=9999999999&sig=AAAA`, { waitUntil: 'networkidle' });
    assert.equal(tampered.status(), 403);
    await page.getByRole('heading', { name: "This link isn't valid" }).waitFor();
  });

  await step('secret previews open through a signed URL', async () => {
    const signed = await api('POST', `/api/previews/${secretId}`, { key, body: { expiresIn: 300 } });
    assert.equal(signed.status, 200);
    const response = await page.goto(`${signed.body.url}&theme=light`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByText('First message of the transcript').waitFor();
  });

  await step('missing previews show a 404 page', async () => {
    const response = await page.goto(`${BASE}/p/AAAAAAAAAAAAAAAA`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 404);
    await page.getByRole('heading', { name: 'Preview not found' }).waitFor();
    await page.screenshot({ path: path.join(OUT, 'preview-404.png') });
  });

  await step('applies the URL params', async () => {
    await page.goto(
      `${BASE}/p/${publicId}?spacing=0&fontScale=1.25&padding=0&dates=0&chrome=0&density=compact&saturation=0.3`,
      { waitUntil: 'networkidle' },
    );
    await page.getByText('First message of the transcript').waitFor();
    const state = await page.evaluate(() => ({
      classes: [...document.documentElement.classList],
      fontSize: getComputedStyle(document.documentElement).fontSize,
      padding: getComputedStyle(document.querySelector('main')).padding,
      separators: document.querySelectorAll('[role=separator][aria-label]').length,
      header: document.querySelector('section[class*=title], [class*=headerBar], h1') != null,
    }));
    assert.ok(state.classes.includes('group-spacing-0'));
    assert.ok(state.classes.includes('density-compact'));
    assert.ok(state.classes.includes('low-saturation'));
    assert.equal(state.fontSize, '20px');
    assert.equal(state.padding, '0px');
    assert.equal(state.separators, 0);
    assert.equal(await page.getByText('e2e-transcript').count(), 0);
    await page.screenshot({ path: path.join(OUT, 'preview-params.png'), fullPage: true });
  });

  console.log('iframes');
  const scratch = await startScratchServer();
  const scratchOrigin = `http://127.0.0.1:${scratch.address().port}`;
  await step('embeds in a cross-origin iframe and reports its height', async () => {
    const src = `${BASE}/p/${publicId}?theme=light&bg=transparent`;
    await page.goto(`${scratchOrigin}/?src=${encodeURIComponent(src)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.resizes.some((r) => r.height > 200));
    const resizes = await page.evaluate(() => window.resizes);
    const last = resizes[resizes.length - 1];
    assert.equal(last.id, publicId);
    assert.equal(last.origin, BASE);
    const frameHeight = await page.evaluate(() => document.getElementById('frame').offsetHeight);
    assert.equal(frameHeight, last.height);
    const frame = page.frameLocator('#frame');
    // No channel header inside an iframe unless chrome=1, and the page shows through.
    assert.equal(await frame.getByText('e2e-transcript').count(), 0);
    const background = await frame.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
    assert.equal(background, 'rgba(0, 0, 0, 0)');
    await page.screenshot({ path: path.join(OUT, 'iframe-scratch.png'), fullPage: true });
  });

  let bigId;
  await step('stores a 5,000-message transcript and renders it windowed', async () => {
    const start = Date.parse('2026-10-01T08:00:00Z');
    const data = Array.from({ length: 5000 }, (_, i) => ({
      author: [AUTHOR, BOT][Math.floor(i / 5) % 2],
      content: `Message ${i + 1}: ${'status ok. '.repeat(1 + (i % 4))}`,
      timestamp: new Date(start + i * 120_000).toISOString(),
      ...(i % 60 === 7 ? { embeds: [{ title: `Report ${i + 1}`, description: 'All good.', color: 0x5865f2 }] } : {}),
    }));
    const created = await api('POST', '/api/previews', { key, body: { data, options: { title: 'ops-log' } } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    bigId = created.body.id;
    const started = Date.now();
    await page.goto(`${BASE}/p/${bigId}`, { waitUntil: 'networkidle' });
    await page.getByText('Message 1: ').first().waitFor();
    console.log(`       (first messages visible after ${Date.now() - started} ms)`);
    await page.getByText('5,000 messages').waitFor();
    // Only the chunks near the viewport are real messages.
    assert.ok((await page.locator('[role=article]').count()) <= 200);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByText('Message 5000: ').waitFor();
    await page.screenshot({ path: path.join(OUT, 'preview-5000-end.png') });
  });

  await step('sizes a cross-origin iframe to a 5,000-message transcript', async () => {
    const src = `${BASE}/p/${bigId}?theme=ash`;
    await page.goto(`${scratchOrigin}/?src=${encodeURIComponent(src)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.resizes.some((r) => r.height > 50_000));
    const frame = page.frameLocator('#frame');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, 'iframe-5000-middle.png') });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await frame.getByText('Message 5000: ').waitFor({ timeout: 10_000 });
    const last = await page.evaluate(() => window.resizes[window.resizes.length - 1]);
    assert.equal(await page.evaluate(() => document.getElementById('frame').offsetHeight), last.height);
    await page.screenshot({ path: path.join(OUT, 'iframe-5000-end.png') });
  });

  await step('the home page refuses to be framed', async () => {
    await page.goto(`${scratchOrigin}/?src=${encodeURIComponent(BASE + '/')}`, { waitUntil: 'networkidle' });
    const framed = page.frames().find((frame) => frame !== page.mainFrame());
    const blocked =
      framed == null || framed.url().startsWith('chrome-error://') || (await framed.content()).length < 200;
    assert.ok(blocked, 'home page rendered inside a frame');
  });
  scratch.close();

  console.log('Mobile');
  await step('home, docs and viewer fit a phone screen', async () => {
    const phone = await context.newPage();
    await phone.setViewportSize({ width: 390, height: 844 });
    for (const [name, url] of [
      ['home', BASE],
      ['docs', `${BASE}/docs`],
      ['preview', `${BASE}/p/${publicId}`],
      ['preview-403', `${BASE}/p/${secretId}`],
    ]) {
      await phone.goto(url, { waitUntil: 'networkidle' });
      await phone.waitForTimeout(1000);
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `${name} scrolls sideways by ${overflow}px`);
      await phone.screenshot({ path: path.join(OUT, `mobile-${name}.png`) });
    }
    await phone.close();
  });

  await step('no console errors (CSP violations included)', async () => {
    const relevant = consoleErrors.filter(
      (text) =>
        !/Failed to load resource: the server responded with a status of (403|404)/.test(text) &&
        !/frame-ancestors|Refused to display/.test(text),
    );
    assert.deepEqual(relevant, []);
  });

  await browser.close();
  console.log(failures === 0 ? '\nAll e2e checks passed.' : `\n${failures} e2e check(s) failed.`);
  console.log(`Screenshots: ${OUT}`);
  process.exit(failures === 0 ? 0 : 1);
};

await main();
