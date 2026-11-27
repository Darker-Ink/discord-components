#!/usr/bin/env node
/* global process, console, document, window, navigator, localStorage, fetch, URL, getComputedStyle, Buffer, FormData, Blob, atob, DataTransfer, File */
// End-to-end checks of the builder site in a real browser, against a running server:
//   pnpm --filter @discord-mana/builder-site dev
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/e2e.mjs http://localhost:5175
// With the playground running too (`pnpm dev`, 5173), the message built here is also checked pixel by pixel
// against <Message> (scripts/builder-parity.mjs). Screenshots go to test-results/e2e (or E2E_OUT).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:5175').replace(/\/$/, '');
const PLAYGROUND = process.env.OURS_URL ?? 'http://localhost:5173';
const OUT = process.env.E2E_OUT ?? path.join(import.meta.dirname, '..', 'test-results', 'e2e');
const REPO = path.resolve(import.meta.dirname, '../../..');
const THEMES = ['light', 'ash', 'dark', 'onyx'];
const WEBHOOK = 'https://discord.com/api/webhooks/123456789012345678/e2e-token_abc';
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
// E2E_ONLY=<regex> runs just the matching steps (for iterating on one part).
const ONLY = process.env.E2E_ONLY != null ? new RegExp(process.env.E2E_ONLY) : null;
const step = async (name, fn) => {
  if (ONLY != null && !ONLY.test(name)) return;
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL ${name}\n       ${String(error.message).slice(0, 1500).split('\n').join('\n       ')}`);
  }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const settle = (ms = 250) => page.waitForTimeout(ms);

// ---------------------------------------------------------------------------------------------------------
// Helpers

const paletteItem = (label) => page.locator(`nav[aria-label="Components"] button[aria-label="${label}"]`);
const embeds = () => page.locator('[data-builder-canvas] [data-builder-kind="embed"]');
const fields = (embed) => embed.locator('[data-builder-kind="embedField"]');

/** Presses at a point and drags to another in small steps, like a hand would. */
const drag = async (from, to) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 16 });
  await settle(150);
  await page.mouse.move(to.x, to.y + 1, { steps: 2 });
  await settle(150);
  await page.mouse.up();
  await settle();
};

const center = async (locator) => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Drags a palette item to a point on the canvas. */
const dragFromPalette = async (label, to) => drag(await center(paletteItem(label)), to);

// Clicking the channel outside the message clears the selection.
const deselect = async () => {
  await page.getByRole('heading', { name: /^Welcome to #/ }).click();
  await settle();
};

const openTab = async (name) => {
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
  await settle();
};

const readJSON = async () => {
  await openTab('JSON');
  return JSON.parse(await page.locator('textarea[aria-label="Message JSON"]').inputValue());
};

const startFrom = async (label) => {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('menuitem', { name: new RegExp(label) }).click();
  await settle(400);
};

const typeInto = async (locator, text) => {
  await locator.click();
  await settle(150);
  await page.keyboard.type(text, { delay: 5 });
  await settle(150);
};

// Files: fixtures written once, attached through the browser's file chooser.
const FIXTURES = path.join(OUT, 'fixtures');
fs.mkdirSync(FIXTURES, { recursive: true });
// Two small PNGs and a text file.
fs.writeFileSync(
  path.join(FIXTURES, 'harbor map.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAIAAACwpMoFAAAA7ElEQVR4nO3RAQkAIQDAwPdTWsD+YAJTiDDuEgw25tofXf/rAO4yOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI473zQCYyX+CQgAAAAASUVORK5CYII=',
    'base64',
  ),
);
fs.writeFileSync(path.join(FIXTURES, 'patch-notes.txt'), 'Update 2.4\n- Harbor map\n');
fs.writeFileSync(
  path.join(FIXTURES, 'icon.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAY0lEQVR4nO3PQQ3AIADAQMAKrvCHz4ngcVnSU9DOfc/4s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgfeojAaJiNktnAAAAAElFTkSuQmCC',
    'base64',
  ),
);
const fixture = (name) => path.join(FIXTURES, name);

/** Clicks something that opens the file chooser, and picks these files. */
const chooseFiles = async (target, trigger, names) => {
  const chooser = target.waitForEvent('filechooser');
  await trigger();
  await (await chooser).setFiles(names.map(fixture));
  await target.waitForTimeout(500);
};

/** The parts of a multipart/form-data body: `{ name, filename, body }`. */
const parseMultipart = (request) => {
  const type = request.headers()['content-type'] ?? '';
  const boundary = /boundary=(.+)$/.exec(type)?.[1];
  if (boundary == null) return null;
  const raw = request.postDataBuffer().toString('latin1');
  return raw
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => {
      const [head, ...rest] = part.replace(/^\r\n/, '').split('\r\n\r\n');
      const body = rest.join('\r\n\r\n').replace(/\r\n$/, '');
      return {
        name: /name="([^"]+)"/.exec(head)?.[1],
        filename: /filename="([^"]+)"/.exec(head)?.[1],
        body,
      };
    });
};

// ---------------------------------------------------------------------------------------------------------

console.log(`builder e2e against ${BASE}`);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await shot('00-start');

const EXPECTED_CLASSIC = {
  content: 'Hello from the e2e test',
  embeds: [
    { title: 'Second embed' },
    {
      title: 'First embed',
      description: 'Description one',
      fields: [
        { name: 'Beta', value: 'Two' },
        { name: 'Alpha', value: 'One' },
      ],
    },
  ],
};

await step('builds a classic message by typing in place', async () => {
  await startFrom('Blank message');
  await typeInto(page.locator('[aria-label="Message content"]'), 'Hello from the e2e test');
  // Click an item to add it: the new embed is selected and its title focused.
  await paletteItem('Embed').click();
  await settle(400);
  await page.keyboard.type('First embed', { delay: 5 });
  const first = embeds().nth(0);
  await typeInto(first.locator('[aria-label="Embed description"]'), 'Description one');
  for (const [name, value] of [
    ['Alpha', 'One'],
    ['Beta', 'Two'],
  ]) {
    await first.getByRole('button', { name: 'Field', exact: true }).click();
    await settle(400);
    await page.keyboard.type(name, { delay: 5 });
    await typeInto(fields(first).last().locator('[aria-label="Field value"]'), value);
  }
  // Drag a second embed in, under the first.
  const box = await first.boundingBox();
  await dragFromPalette('Embed', { x: box.x + 80, y: box.y + box.height + 6 });
  await settle(300);
  await page.keyboard.type('Second embed', { delay: 5 });
  await deselect();
  await shot('01-classic-built');
  const json = await readJSON();
  assert.deepEqual(json, {
    content: 'Hello from the e2e test',
    embeds: [
      {
        title: 'First embed',
        description: 'Description one',
        fields: [
          { name: 'Alpha', value: 'One' },
          { name: 'Beta', value: 'Two' },
        ],
      },
      { title: 'Second embed' },
    ],
  });
});

await step('reorders fields by dragging', async () => {
  const first = embeds().nth(0);
  const alpha = fields(first).nth(0);
  const beta = fields(first).nth(1);
  const a = await alpha.boundingBox();
  const b = await beta.boundingBox();
  // Grab the field's free right edge (not its text) and drop it above the first field.
  await drag({ x: b.x + b.width - 4, y: b.y + 4 }, { x: a.x + a.width / 2, y: a.y + 2 });
  await deselect();
  const names = await fields(embeds().nth(0)).locator('[aria-label="Field name"]').allInnerTexts();
  assert.deepEqual(names, ['Beta', 'Alpha']);
});

await step('reorders embeds by dragging', async () => {
  const one = await embeds().nth(0).boundingBox();
  const two = await embeds().nth(1).boundingBox();
  // The embed's own padding is a handle; drop it above the first embed.
  await drag({ x: two.x + 8, y: two.y + 3 }, { x: one.x + one.width / 2, y: one.y - 2 });
  await deselect();
  await shot('02-classic-reordered');
  assert.deepEqual(await readJSON(), EXPECTED_CLASSIC);
});

await step('shows an error when a limit is exceeded, and undo clears it', async () => {
  await openTab('Issues');
  const title = embeds().nth(1).locator('[aria-label="Embed title"]');
  await title.click();
  await settle(150);
  await page.keyboard.press('End');
  await page.keyboard.insertText('x'.repeat(250));
  await settle(400);
  await shot('03-limit-exceeded');
  const pill = page.locator('[data-builder-ui][data-severity="error"]').filter({ hasText: /\/256/ });
  assert.equal(await pill.count(), 1, 'a counter over the limit');
  assert.match(await pill.innerText(), /^261\/256$/);
  assert.match(await page.getByRole('tab', { name: /^Issues/ }).innerText(), /\(1\)/);
  const issue = page.locator('button', { hasText: /256/ }).first();
  assert.ok(await issue.isVisible(), 'the issue is listed');
  // Clicking the issue goes to the text at fault.
  await deselect();
  await issue.click();
  await settle(500);
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.closest('[data-builder-field]')?.getAttribute('data-builder-field'),
    ),
    'title',
  );
  await page.keyboard.press('Control+z');
  await settle(400);
  await deselect();
  assert.deepEqual(await readJSON(), EXPECTED_CLASSIC);
});

let exported = null;
await step('exports JSON (copy and download) that matches the expected payload', async () => {
  await openTab('JSON');
  await page.getByRole('button', { name: 'Copy' }).click();
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  assert.deepEqual(copied, EXPECTED_CLASSIC);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);
  const file = path.join(OUT, 'message.json');
  await download.saveAs(file);
  exported = file;
  assert.equal(download.suggestedFilename(), 'message.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), EXPECTED_CLASSIC);
  await shot('04-json');
});

await step('imports the JSON back (file) and shows invalid JSON clearly', async () => {
  await startFrom('Blank message');
  assert.equal(await embeds().count(), 0);
  await openTab('JSON');
  await page.locator('input[type="file"]').setInputFiles(exported);
  await settle(500);
  assert.equal(await embeds().count(), 2);
  assert.deepEqual(await readJSON(), EXPECTED_CLASSIC);
  const textarea = page.locator('textarea[aria-label="Message JSON"]');
  await textarea.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(',', { delay: 5 });
  await settle(500);
  await shot('05-json-invalid');
  const alert = page.getByRole('alert');
  assert.match(await alert.innerText(), /Invalid JSON at line \d+, column \d+/);
  // The message keeps its last valid version.
  assert.equal(await embeds().count(), 2);
  await page.keyboard.press('Backspace');
  await settle(500);
  assert.equal(await page.getByRole('alert').count(), 0);
});

await step('converts to Components v2 and builds a container with a section, gallery and action row', async () => {
  await page.getByRole('radio', { name: 'Components v2' }).click();
  await settle(500);
  const canvas = page.locator('[data-builder-canvas]');
  // Add a container at the end of the message.
  const last = canvas.locator('[data-builder-kind="container"]').last();
  const lastBox = await last.boundingBox();
  await dragFromPalette('Container', { x: lastBox.x + 100, y: lastBox.y + lastBox.height + 6 });
  await page.keyboard.type('Container text', { delay: 5 });
  await deselect();
  const container = canvas.locator('[data-builder-kind="container"]').last();
  const inside = async () => {
    const box = await container.boundingBox();
    return { x: box.x + 60, y: box.y + box.height - 6 };
  };
  await dragFromPalette('Section', await inside());
  await page.keyboard.type('Section text', { delay: 5 });
  await deselect();
  await dragFromPalette('Media gallery', await inside());
  // The gallery's first item: set its URL from the item strip.
  await page.locator('[aria-label="Gallery items"] button').first().click();
  await settle(300);
  await page.keyboard.type(`${BASE}/favicon.svg`, { delay: 2 });
  await page.keyboard.press('Escape');
  await deselect();
  await dragFromPalette('Action row', await inside());
  await deselect();
  const row = container.locator('[data-builder-kind="actionRow"]');
  // A new node's first text is focused: here, the button's label.
  await dragFromPalette('Link button', await center(row));
  await page.waitForFunction(() => document.activeElement?.closest('[data-builder-kind="button"]') != null);
  await settle(150);
  await page.keyboard.press('End');
  await page.keyboard.type(' here', { delay: 5 });
  await page.keyboard.press('Enter');
  await deselect();
  await shot('06-cv2-built');
  const json = await readJSON();
  assert.equal(json.flags & (1 << 15), 1 << 15, 'IS_COMPONENTS_V2');
  assert.equal(json.content, undefined);
  assert.equal(json.embeds, undefined);
  const built = json.components.at(-1);
  assert.equal(built.type, 17);
  assert.deepEqual(
    built.components.map((component) => component.type),
    [10, 9, 12, 1],
  );
  assert.equal(built.components[0].content, 'Container text');
  assert.equal(built.components[1].components[0].content, 'Section text');
  assert.equal(built.components[2].items[0].media.url, `${BASE}/favicon.svg`);
  assert.deepEqual(built.components[3].components, [
    { type: 2, style: 5, label: 'Link here', url: 'https://discord.com' },
  ]);
  fs.writeFileSync(path.join(OUT, 'built-cv2.json'), JSON.stringify(json, null, 2));
});

await step('sends to a (mocked) webhook and shows Discord’s answer', async () => {
  const requests = [];
  let fail = false;
  await page.route('https://discord.com/api/webhooks/**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        json: {
          id: '123456789012345678',
          name: 'E2E Hook',
          avatar: null,
          channel_id: '223456789012345678',
          application_id: null,
        },
      });
      return;
    }
    requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON() });
    if (fail) {
      await route.fulfill({
        status: 400,
        json: {
          code: 50035,
          message: 'Invalid Form Body',
          errors: { components: { 0: { type: { _errors: [{ code: 'X', message: 'Value is not valid.' }] } } } },
        },
      });
    } else {
      await route.fulfill({ json: { id: '323456789012345678', channel_id: '223456789012345678', content: '' } });
    }
  });
  await openTab('Send');
  await page.locator('input[type="password"]').first().fill(WEBHOOK);
  await settle(800);
  assert.match(await page.locator('[data-builder-canvas]').innerText(), /E2E Hook/, 'previews the webhook’s name');
  const payload = await page.evaluate(() => JSON.parse(localStorage.getItem('discord-mana-builder:draft')));
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Message 323456789012345678').waitFor();
  await shot('07-sent');
  assert.equal(requests.length, 1);
  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/api/webhooks/123456789012345678/e2e-token_abc');
  assert.equal(url.searchParams.get('wait'), 'true');
  assert.equal(url.searchParams.get('with_components'), 'true');
  assert.deepEqual(requests[0].body, payload);
  fail = true;
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText(/Discord refused the message \(400, code 50035\)/).waitFor();
  assert.match(await page.locator('form + div').innerText(), /components\.0\.type/);
  await shot('08-send-error');
  // The URL is not remembered unless asked.
  assert.equal(await page.evaluate(() => localStorage.getItem('discord-mana-builder:webhook')), null);
  await page.unroute('https://discord.com/api/webhooks/**');
});

await step('autosaves the draft and restores it after a reload', async () => {
  const before = await readJSON();
  await page.reload({ waitUntil: 'networkidle' });
  await settle(400);
  assert.deepEqual(await readJSON(), before);
});

await step('shares the message in the URL hash', async () => {
  await page.getByRole('button', { name: 'Share' }).click();
  await settle(300);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /#m=/);
  const json = await readJSON();
  await startFrom('Blank message');
  await settle(500);
  await page.goto('about:blank');
  await page.goto(link, { waitUntil: 'networkidle' });
  await settle(600);
  assert.deepEqual(await readJSON(), json);
  assert.equal(new URL(page.url()).hash, '');
});

await step('keyboard: select, move with Alt+arrows, duplicate and delete', async () => {
  await startFrom('^Example');
  await deselect();
  const field = embeds().nth(0).locator('[data-builder-kind="embedField"]').nth(1);
  await field.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await settle();
  let names = await fields(embeds().nth(0)).locator('[aria-label="Field name"]').allInnerTexts();
  assert.deepEqual(names, ['Fixed', 'New']);
  await page.keyboard.press('Control+d');
  await settle();
  assert.equal(await fields(embeds().nth(0)).count(), 3);
  await page.keyboard.press('Delete');
  await settle();
  assert.equal(await fields(embeds().nth(0)).count(), 2);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await settle();
  names = await fields(embeds().nth(0)).locator('[aria-label="Field name"]').allInnerTexts();
  assert.deepEqual(names, ['New', 'Fixed']);
});

await step('keyboard drag: Space picks up, arrows move, Space drops', async () => {
  const field = embeds().nth(0).locator('[data-builder-kind="embedField"]').nth(1);
  await field.focus();
  await page.keyboard.press('Space');
  await settle();
  await page.keyboard.press('ArrowUp');
  await settle();
  await shot('09-keyboard-drag');
  const announced = await page.locator('[data-live-announcer]').innerText();
  assert.match(announced, /Picked up Field “Fixed”/);
  assert.match(announced, /goes first in Embed/);
  await page.keyboard.press('Space');
  await settle(400);
  const names = await fields(embeds().nth(0)).locator('[aria-label="Field name"]').allInnerTexts();
  assert.deepEqual(names, ['Fixed', 'New']);
  await page.keyboard.press('Control+z');
});

await step('context menu: right-click a node', async () => {
  await deselect();
  await embeds()
    .nth(0)
    .click({ button: 'right', position: { x: 6, y: 4 } });
  await settle(300);
  await shot('10-context-menu');
  assert.ok(await page.getByRole('menuitem', { name: /Duplicate/ }).isVisible());
  await page.keyboard.press('Escape');
});

await step('files: attach, show in the message and use one as an embed image', async () => {
  await startFrom('^Example$');
  await deselect();
  await chooseFiles(page, () => paletteItem('File').click(), ['harbor map.png', 'patch-notes.txt']);
  const canvas = page.locator('[data-builder-canvas]');
  assert.match(await canvas.innerText(), /patch-notes\.txt/, 'the text file shows as a file card');
  assert.ok((await canvas.locator('img[src^="blob:"]').count()) >= 1, 'the image shows in the mosaic');
  let json = await readJSON();
  assert.deepEqual(json.attachments, [
    { id: 0, filename: 'harbor_map.png' },
    { id: 1, filename: 'patch-notes.txt' },
  ]);
  // The embed's image, picked from the attached files.
  await embeds()
    .nth(0)
    .click({ position: { x: 6, y: 4 } });
  await page.getByRole('toolbar').getByRole('button', { name: 'Image', exact: true }).click();
  await settle(300);
  await page
    .getByRole('group', { name: 'Attached files' })
    .getByRole('button', { name: /harbor_map\.png/ })
    .click();
  await settle(400);
  await shot('20-embed-image-attachment');
  await page.keyboard.press('Escape');
  json = await readJSON();
  assert.equal(json.embeds[0].image.url, 'attachment://harbor_map.png');
  assert.ok((await embeds().nth(0).locator('img[src^="blob:"]').count()) >= 1, 'the embed shows the attached image');
});

await step('files: rename, spoiler and alt text update the message and its references', async () => {
  await deselect();
  await openTab('Send');
  const files = page.getByRole('region', { name: 'Files' });
  await files.getByRole('button', { name: /harbor_map\.png/ }).click();
  await settle(300);
  const editor = page.getByRole('dialog', { name: 'File' });
  await editor.getByLabel('Name').fill('harbor.png');
  await editor.getByLabel('Name').press('Enter');
  await editor.getByLabel('Alt text').fill('The new harbor map');
  await editor.getByText('Spoiler').click();
  await settle(300);
  await shot('21-attachment-editor');
  await page.keyboard.press('Escape');
  const json = await readJSON();
  assert.deepEqual(json.attachments[0], {
    id: 0,
    filename: 'SPOILER_harbor.png',
    description: 'The new harbor map',
  });
  assert.equal(json.embeds[0].image.url, 'attachment://SPOILER_harbor.png', 'the embed follows the rename');
  // Undo puts the name (and the reference) back, and the bytes are still there.
  await deselect();
  await page.keyboard.press('Control+z');
  await settle(200);
  const undone = await readJSON();
  assert.equal(undone.attachments[0].filename, 'harbor.png');
  assert.equal(undone.embeds[0].image.url, 'attachment://harbor.png');
  await page.keyboard.press('Control+Shift+z');
  await settle(200);
});

await step('message options: silent, no link previews, text-to-speech and allowed mentions', async () => {
  await openTab('Send');
  const options = page.getByRole('region', { name: 'Message options' });
  await options.getByText('Silent', { exact: true }).click();
  await options.getByText('Hide link previews', { exact: true }).click();
  await options.getByText('Text-to-speech', { exact: true }).click();
  await options.getByText('Limit mentions', { exact: true }).click();
  await settle(200);
  await options.getByText('Users', { exact: true }).click();
  await options.getByLabel('Only these roles').fill('123456789012345678, <@&223456789012345678>');
  await settle(300);
  await shot('22-message-options');
  const json = await readJSON();
  assert.equal(json.flags, 4 | 4096);
  assert.equal(json.tts, true);
  assert.deepEqual(json.allowed_mentions, { parse: ['users'], roles: ['123456789012345678', '223456789012345678'] });
  // Listing users while parsing all users is a conflict the core reports.
  await openTab('Send');
  await options.getByText('Users', { exact: true }).click();
  await options.getByLabel('Only these users').fill('323456789012345678');
  await settle(200);
  const conflict = await readJSON();
  assert.deepEqual(conflict.allowed_mentions.users, ['323456789012345678']);
});

await step('sends files as multipart: payload_json plus files[n]', async () => {
  const requests = [];
  await page.route('https://discord.com/api/webhooks/**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        json: { id: '123456789012345678', name: 'E2E Hook', avatar: null, channel_id: '2', application_id: null },
      });
      return;
    }
    requests.push({ url: request.url(), parts: parseMultipart(request) });
    await route.fulfill({ json: { id: '423456789012345678', channel_id: '223456789012345678', content: '' } });
  });
  // Clear the users list again (it conflicts with parsing users).
  await openTab('Send');
  await page.getByRole('region', { name: 'Message options' }).getByText('Users', { exact: true }).click();
  await settle(200);
  await page.locator('input[type="password"]').first().fill(WEBHOOK);
  await settle(600);
  // The route sees the multipart structure; the files' bytes (blobs) are read from the FormData itself.
  await page.evaluate(() => {
    const original = window.fetch;
    window.__forms = [];
    window.fetch = async (input, init) => {
      if (init?.body instanceof FormData) {
        const entries = [];
        for (const [name, value] of init.body) {
          entries.push(
            value instanceof Blob
              ? {
                  name,
                  filename: value.name,
                  size: value.size,
                  text: value.name.endsWith('.txt') ? await value.text() : null,
                }
              : { name },
          );
        }
        window.__forms.push(entries);
      }
      return original(input, init);
    };
  });
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Message 423456789012345678').waitFor();
  assert.equal(requests.length, 1);
  const parts = requests[0].parts;
  assert.ok(parts != null, 'a multipart body');
  const payload = JSON.parse(parts.find((part) => part.name === 'payload_json').body);
  assert.deepEqual(payload.attachments, [
    { id: 0, filename: 'SPOILER_harbor.png', description: 'The new harbor map' },
    { id: 1, filename: 'patch-notes.txt' },
  ]);
  assert.equal(payload.embeds[0].image.url, 'attachment://SPOILER_harbor.png');
  assert.equal(payload.flags, 4 | 4096);
  assert.equal(payload.tts, true);
  assert.deepEqual(payload.allowed_mentions.parse, ['users']);
  assert.equal(payload.poll, undefined);
  const files = parts.filter((part) => part.name?.startsWith('files['));
  assert.deepEqual(
    files.map((part) => [part.name, part.filename]),
    [
      ['files[0]', 'SPOILER_harbor.png'],
      ['files[1]', 'patch-notes.txt'],
    ],
  );
  const [form] = await page.evaluate(() => window.__forms);
  const sent = form.filter((entry) => entry.name.startsWith('files['));
  assert.equal(sent[0].size, fs.statSync(fixture('harbor map.png')).size);
  assert.equal(sent[1].text, 'Update 2.4\n- Harbor map\n');
  await shot('25-sent-with-files');
  await page.unroute('https://discord.com/api/webhooks/**');
});

await step('a poll message: the mode switch makes one (and nothing else), edited in place', async () => {
  await deselect();
  await page.getByRole('radiogroup', { name: 'Message type' }).getByRole('radio', { name: 'Poll' }).click();
  await settle(400);
  // The palette has nothing to add to a poll.
  assert.equal(await page.locator('nav[aria-label="Components"] button').count(), 0);
  const poll = page.getByRole('group', { name: 'Poll' });
  // The first line of the message became the question; replace it.
  await poll.getByRole('textbox', { name: 'Poll question' }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Which map next?', { delay: 5 });
  await typeInto(poll.getByRole('textbox', { name: 'Answer 1' }), 'Harbor');
  await typeInto(poll.getByRole('textbox', { name: 'Answer 2' }), 'Desert');
  await poll.getByRole('button', { name: 'Add answer' }).click();
  await settle(300);
  await page.keyboard.type('Glacier', { delay: 5 });
  await poll.getByRole('button', { name: 'Answer 1 emoji' }).click();
  await settle(300);
  await page.getByRole('group', { name: 'Common emoji' }).getByRole('button', { name: '🔥' }).click();
  await page.keyboard.press('Escape');
  await poll.getByRole('button', { name: '24 hours' }).click();
  await page.getByRole('radio', { name: '3 days' }).click();
  await poll.getByRole('button', { name: 'Multiple answers' }).click();
  await settle(300);
  await shot('23-poll-editing');
  await deselect();
  await settle(300);
  await shot('24-poll');
  const json = await readJSON();
  assert.deepEqual(json.poll, {
    question: { text: 'Which map next?' },
    answers: [
      { poll_media: { text: 'Harbor', emoji: { name: '🔥' } } },
      { poll_media: { text: 'Desert' } },
      { poll_media: { text: 'Glacier' } },
    ],
    duration: 72,
    allow_multiselect: true,
  });
  // A poll goes alone: no content, embeds, components or files came along. Silent and mentions still apply.
  assert.equal(json.content, undefined);
  assert.equal(json.embeds, undefined);
  assert.equal(json.components, undefined);
  assert.equal(json.attachments, undefined);
  assert.equal(json.flags, 4 | 4096);
  await openTab('Issues');
  assert.match(await page.getByRole('tabpanel').innerText(), /No issues/);
  // A poll sent alone goes as JSON, not multipart.
  const bodies = [];
  await page.route('https://discord.com/api/webhooks/**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ json: { id: '1', name: 'E2E Hook', avatar: null, channel_id: '2', application_id: null } });
      return;
    }
    bodies.push(request.postDataJSON());
    await route.fulfill({ json: { id: '523456789012345678', channel_id: '2', content: '' } });
  });
  await openTab('Send');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByText('Message 523456789012345678').waitFor();
  assert.deepEqual(bodies[0].poll, json.poll);
  await page.unroute('https://discord.com/api/webhooks/**');
  // Undo goes back through the poll's edits to the message it came from.
  await deselect();
  for (let index = 0; index < 40 && (await readJSON()).embeds == null; index++) {
    await page.keyboard.press('Control+z');
    await settle(80);
  }
  const before = await readJSON();
  assert.equal(before.poll, undefined);
  assert.equal(before.embeds.length, 1);
  assert.equal(before.attachments.length, 2);
});

await step('Components v2: a File component and a gallery item pick attached files', async () => {
  await startFrom('Blank Components v2');
  await deselect();
  await chooseFiles(page, () => paletteItem('File').click(), ['patch-notes.txt']);
  let json = await readJSON();
  assert.deepEqual(json.attachments, [{ id: 0, filename: 'patch-notes.txt' }]);
  assert.equal(json.components.at(-1).type, 13);
  assert.equal(json.components.at(-1).file.url, 'attachment://patch-notes.txt');
  assert.match(await page.locator('[data-builder-canvas]').innerText(), /patch-notes\.txt/);
  // Dropping an image attaches it and shows it in a gallery.
  await deselect();
  const data = fs.readFileSync(fixture('icon.png')).toString('base64');
  const transfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'icon.png', { type: 'image/png' }));
    return dt;
  }, data);
  const canvas = page.locator('[data-builder-canvas]');
  await canvas.dispatchEvent('dragenter', { dataTransfer: transfer });
  await canvas.dispatchEvent('dragover', { dataTransfer: transfer });
  await settle(100);
  await shot('26-file-drag');
  await canvas.dispatchEvent('drop', { dataTransfer: transfer });
  await settle(600);
  json = await readJSON();
  assert.deepEqual(
    json.attachments.map((attachment) => attachment.filename),
    ['patch-notes.txt', 'icon.png'],
  );
  const gallery = json.components.find((component) => component.type === 12);
  assert.equal(gallery?.items[0].media.url, 'attachment://icon.png');
  assert.ok((await canvas.locator('img[src^="blob:"]').count()) >= 1, 'the gallery shows the dropped image');
  await shot('27-cv2-files');
  // An attachment nothing shows gets the core's warning: delete the gallery that showed the image.
  await page.locator('[data-builder-canvas] [data-builder-kind="mediaGallery"]').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('Delete');
  await settle(300);
  await openTab('Issues');
  assert.match(await page.getByRole('tabpanel').innerText(), /icon\.png isn't shown/);
});

await step('every theme renders on desktop', async () => {
  await startFrom('^Example$');
  for (const theme of THEMES) {
    await page.evaluate((value) => localStorage.setItem('discord-mana:theme', value), theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'networkidle' });
    await settle(400);
    await shot(`theme-${theme}-desktop`);
    await embeds()
      .nth(0)
      .click({ position: { x: 6, y: 4 } });
    await settle(300);
    await shot(`theme-${theme}-desktop-selected`);
  }
  await page.evaluate(() => localStorage.setItem('discord-mana:theme', 'dark'));
  await page.setViewportSize({ width: 1440, height: 900 });
});

// ---------------------------------------------------------------------------------------------------------
// Phones: device emulation (touch, mobile viewport), one fresh context per device.

/** A long press, then a drag, with real touch events (Playwright's touchscreen only taps). */
const touchDrag = async (target, from, to) => {
  const cdp = await target.context().newCDPSession(target);
  const point = (x, y) => [{ x: Math.round(x), y: Math.round(y), radiusX: 4, radiusY: 4, force: 1, id: 0 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
  await target.waitForTimeout(550);
  const steps = 16;
  for (let index = 1; index <= steps; index++) {
    const x = from.x + ((to.x - from.x) * index) / steps;
    const y = from.y + ((to.y - from.y) * index) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, y) });
    await target.waitForTimeout(16);
  }
  await target.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await target.waitForTimeout(400);
  await cdp.detach();
};

const PHONES = [
  { name: 'iPhone 13', slug: 'iphone-13' },
  { name: 'Pixel 7', slug: 'pixel-7' },
];

for (const phone of PHONES) {
  const mobile = await browser.newContext({ ...devices[phone.name] });
  await mobile.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const m = await mobile.newPage();
  const mobileErrors = [];
  m.on('pageerror', (error) => mobileErrors.push(error.message));
  const mshot = (name) => m.screenshot({ path: path.join(OUT, `${phone.slug}-${name}.png`) });
  const mEmbed = () => m.locator('[data-builder-canvas] [data-builder-kind="embed"]').first();
  const mFields = () => mEmbed().locator('[data-builder-kind="embedField"]');
  const fieldNames = () => mFields().locator('[aria-label="Field name"]').allInnerTexts();
  const done = async () => {
    const button = m.getByRole('button', { name: 'Done', exact: true });
    if (await button.isVisible()) await button.tap();
    await m.waitForTimeout(250);
  };
  const openSheet = async (name) => {
    await m
      .locator('nav[aria-label="Message tools"]')
      .getByRole('button', { name: new RegExp(`^${name}`) })
      .tap();
    await m.waitForTimeout(400);
  };
  const closeSheet = async () => {
    await m.getByRole('dialog').getByRole('button', { name: 'Close' }).tap();
    await m.waitForTimeout(300);
  };
  const mJSON = async () => {
    await openSheet('JSON');
    const json = JSON.parse(await m.locator('textarea[aria-label="Message JSON"]').inputValue());
    await closeSheet();
    return json;
  };

  await m.goto(BASE, { waitUntil: 'networkidle' });
  await m.evaluate(() => localStorage.clear());
  await m.reload({ waitUntil: 'networkidle' });
  await m.waitForTimeout(400);

  await step(`${phone.name}: no sideways scroll, tab bar in reach`, async () => {
    await mshot('01-start');
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${overflow}px of sideways scroll`);
    for (const name of ['Add', 'Issues', 'JSON', 'Send']) {
      const box = await m
        .locator('nav[aria-label="Message tools"]')
        .getByRole('button', { name: new RegExp(`^${name}`) })
        .boundingBox();
      assert.ok(box.height >= 44 && box.width >= 44, `${name} is ${box.width}x${box.height}`);
    }
  });

  await step(`${phone.name}: tap a title and type`, async () => {
    await mEmbed().locator('[aria-label="Embed title"]').tap();
    await m.waitForTimeout(400);
    await m.keyboard.press('End');
    await m.keyboard.type(' hotfix', { delay: 10 });
    await mshot('02-editing-title');
    await m.locator('[data-builder-canvas]').locator('[aria-label="Message content"]').tap();
    await m.waitForTimeout(300);
    await done();
    assert.equal((await mJSON()).embeds[0].title, 'Update 2.4 hotfix');
  });

  await step(`${phone.name}: add a field from the Add sheet`, async () => {
    const box = await mEmbed().boundingBox();
    await mEmbed().tap({ position: { x: box.width - 6, y: 4 } });
    await m.waitForTimeout(300);
    await openSheet('Add');
    await mshot('03-add-sheet');
    await m.getByRole('dialog').getByRole('button', { name: 'Field', exact: true }).tap();
    await m.waitForTimeout(500);
    await m.keyboard.type('Notes', { delay: 10 });
    await m.waitForTimeout(200);
    await mshot('04-field-added');
    await done();
    assert.deepEqual(await fieldNames(), ['New', 'Fixed', 'Notes']);
  });

  await step(`${phone.name}: long-press drag to reorder, and Move up in the bar`, async () => {
    // Tap outside to finish editing; then a long press on the field's text picks it up.
    const canvas = await m.locator('[data-builder-canvas]').boundingBox();
    await m.locator('[data-builder-canvas]').tap({ position: { x: canvas.width / 2, y: canvas.height - 16 } });
    await m.waitForTimeout(300);
    assert.equal(await m.evaluate(() => document.activeElement?.isContentEditable ?? false), false);
    const first = await mFields().nth(0).boundingBox();
    const third = await mFields().nth(2).boundingBox();
    await touchDrag(
      m,
      { x: third.x + third.width - 6, y: third.y + 6 },
      { x: first.x + first.width / 2, y: first.y + 2 },
    );
    await done();
    assert.deepEqual(await fieldNames(), ['Notes', 'New', 'Fixed']);
    await mFields()
      .nth(2)
      .tap({ position: { x: 4, y: 4 } });
    await m.waitForTimeout(300);
    await mshot('05-dock');
    const dock = m.getByRole('toolbar');
    for (const button of await dock.getByRole('button').all()) {
      const box = await button.boundingBox();
      if (box != null && box.width > 0) assert.ok(box.height >= 36, `toolbar button ${box.height}px tall`);
    }
    await dock.getByRole('button', { name: 'Move up' }).tap();
    await m.waitForTimeout(300);
    assert.deepEqual(await fieldNames(), ['Notes', 'Fixed', 'New']);
    await done();
  });

  await step(`${phone.name}: More menu, Issues and JSON sheets`, async () => {
    await m.getByRole('button', { name: 'More', exact: true }).tap();
    await m.waitForTimeout(300);
    await mshot('06-more-menu');
    assert.ok(await m.getByRole('menuitem', { name: 'Copy link' }).isVisible());
    await m.keyboard.press('Escape');
    await m
      .getByRole('button', { name: 'More', exact: true })
      .tap()
      .catch(() => undefined);
    await m.waitForTimeout(200);
    await openSheet('Issues');
    await mshot('07-issues-sheet');
    await closeSheet();
    await openSheet('JSON');
    await mshot('08-json-sheet');
    await closeSheet();
  });

  await step(`${phone.name}: send from the Send sheet to a mocked webhook`, async () => {
    const requests = [];
    await m.route('https://discord.com/api/webhooks/**', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          json: { id: '123456789012345678', name: 'Phone Hook', avatar: null, channel_id: '1', application_id: null },
        });
        return;
      }
      requests.push(request.postDataJSON());
      await route.fulfill({ json: { id: '423456789012345678', channel_id: '1', content: '' } });
    });
    await openSheet('Send');
    const input = m.locator('input[type="password"]').first();
    await input.tap();
    const fontSize = await input.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(fontSize >= 16, `inputs are ${fontSize}px (phones zoom in on smaller ones)`);
    await input.fill(WEBHOOK);
    await m.waitForTimeout(800);
    await mshot('09-send-sheet');
    await m.getByRole('dialog').getByRole('button', { name: 'Send', exact: true }).tap();
    await m.getByText('Message 423456789012345678').waitFor();
    await mshot('10-sent');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].embeds[0].title, 'Update 2.4 hotfix');
    await closeSheet();
  });

  await step(`${phone.name}: attach a file from the Add sheet and edit it`, async () => {
    await m.unroute('https://discord.com/api/webhooks/**');
    await openSheet('Add');
    await chooseFiles(m, () => m.getByRole('dialog').getByRole('button', { name: 'File', exact: true }).tap(), [
      'harbor map.png',
      'patch-notes.txt',
    ]);
    await m.waitForTimeout(400);
    if (await m.getByRole('dialog', { name: 'Add' }).isVisible()) await closeSheet();
    const canvas = m.locator('[data-builder-canvas]');
    assert.match(await canvas.innerText(), /patch-notes\.txt/);
    await mshot('11-attached');
    // Tapping the file opens its editor, inside the screen.
    await canvas.getByText('patch-notes.txt').tap();
    await m.waitForTimeout(400);
    const editor = m.getByRole('dialog', { name: 'File' });
    const box = await editor.boundingBox();
    const viewport = m.viewportSize();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1, 'the editor fits the screen');
    await mshot('12-attachment-editor');
    await editor.getByText('Spoiler').tap();
    await m.waitForTimeout(300);
    await m.keyboard.press('Escape');
    await m.waitForTimeout(200);
  });

  await step(`${phone.name}: the Send sheet lists files, options and mentions`, async () => {
    await openSheet('Send');
    const sheet = m.getByRole('dialog');
    assert.match(await sheet.getByRole('region', { name: 'Files' }).innerText(), /SPOILER|patch-notes/);
    await sheet.getByText('Limit mentions', { exact: true }).tap();
    await m.waitForTimeout(300);
    await sheet.getByRole('region', { name: 'Files' }).scrollIntoViewIfNeeded();
    await mshot('13-send-files');
    await sheet.getByRole('region', { name: 'Message options' }).scrollIntoViewIfNeeded();
    await mshot('14-send-options');
    await closeSheet();
  });

  await step(`${phone.name}: switch to a poll from the header`, async () => {
    await m.getByRole('radiogroup', { name: 'Message type' }).getByRole('radio', { name: 'Poll' }).tap();
    await m.waitForTimeout(500);
    const tabs = m.locator('nav[aria-label="Message tools"]');
    assert.equal(await tabs.getByRole('button', { name: /^Add/ }).count(), 0, 'no Add tab for a poll');
    const poll = m.getByRole('group', { name: 'Poll' });
    await poll.getByRole('textbox', { name: 'Poll question' }).tap();
    await m.keyboard.press('Control+a');
    await m.keyboard.type('Which map next?', { delay: 10 });
    await poll.getByRole('textbox', { name: 'Answer 1' }).tap();
    await m.keyboard.type('Harbor', { delay: 10 });
    await poll.getByRole('textbox', { name: 'Answer 2' }).tap();
    await m.keyboard.type('Desert', { delay: 10 });
    await m.waitForTimeout(300);
    await mshot('15-poll');
    const json = await m.evaluate(() => JSON.parse(localStorage.getItem('discord-mana-builder:draft') ?? '{}'));
    assert.equal(json.poll?.question?.text, 'Which map next?');
    assert.equal(json.embeds, undefined);
  });

  await step(`${phone.name}: no page errors`, async () => {
    assert.deepEqual(
      mobileErrors.map((error) => error.slice(0, 300)),
      [],
    );
  });
  await mobile.close();
}

await step('a 360px phone and a 768px tablet don’t scroll sideways', async () => {
  for (const [width, height, name] of [
    [360, 740, 'phone-360'],
    [768, 1024, 'tablet-768'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 700 });
    const tab = await context.newPage();
    await tab.goto(BASE, { waitUntil: 'networkidle' });
    await tab.waitForTimeout(400);
    await tab.screenshot({ path: path.join(OUT, `${name}.png`) });
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${name}: ${overflow}px of sideways scroll`);
    await context.close();
  }
});

await step('no page errors', async () => {
  assert.deepEqual(
    errors.map((error) => error.slice(0, 300)),
    [],
  );
});

const reachable = async (url) => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const ok = await fetch(url.replace('localhost', host)).then(
      (response) => response.ok,
      () => false,
    );
    if (ok) return true;
  }
  return false;
};
const playgroundUp = await reachable(PLAYGROUND);

// The playground's "Tag builder" story: a MessageBuilder restricted to text in one container.
if (playgroundUp) {
  await step('restrictions: a tag builder offers only what it allows, and removes what it doesn’t', async () => {
    const context = await browser.newContext({ viewport: { width: 1300, height: 800 } });
    const tag = await context.newPage();
    await tag.goto(`${PLAYGROUND}/?embed&collection=messages&story=builder-tag&theme=darker`, {
      waitUntil: 'networkidle',
    });
    await tag.waitForTimeout(500);
    const palette = await tag
      .locator('nav[aria-label="Components"] button')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
    assert.deepEqual(palette, ['Container', 'Text', 'Separator']);
    assert.equal(await tag.getByRole('radiogroup', { name: 'Message type' }).count(), 0, 'no mode switch');
    await tag.getByRole('tab', { name: /^JSON/ }).click();
    await tag.waitForTimeout(200);
    const disallowed = {
      flags: 1 << 15,
      username: 'Someone else',
      components: [
        {
          type: 17,
          components: [
            { type: 10, content: 'Allowed text' },
            { type: 12, items: [{ media: { url: 'https://example.com/a.png' } }] },
            { type: 1, components: [{ type: 2, style: 1, label: 'Nope', custom_id: 'nope' }] },
          ],
        },
        { type: 17, components: [{ type: 10, content: 'A second container' }] },
      ],
    };
    await tag.locator('textarea[aria-label="Message JSON"]').fill(JSON.stringify(disallowed));
    await tag.waitForTimeout(600);
    await tag.getByRole('tab', { name: /^Issues/ }).click();
    await tag.waitForTimeout(300);
    await tag.screenshot({ path: path.join(OUT, 'tag-builder-restricted.png') });
    assert.match(await tag.getByText(/aren’t allowed here/).innerText(), /\d+ parts aren’t allowed here/);
    await tag.getByRole('button', { name: 'Remove', exact: true }).click();
    await tag.waitForTimeout(400);
    await tag.screenshot({ path: path.join(OUT, 'tag-builder-cleaned.png') });
    assert.equal(await tag.getByText(/allowed here/).count(), 0);
    await tag.getByRole('tab', { name: /^JSON/ }).click();
    const cleaned = JSON.parse(await tag.locator('textarea[aria-label="Message JSON"]').inputValue());
    assert.equal(cleaned.username, undefined);
    // One container is allowed: the gallery and buttons go, the second container's text is kept outside it.
    assert.deepEqual(
      cleaned.components.map((component) => component.type),
      [17, 10],
    );
    assert.deepEqual(
      cleaned.components[0].components.map((component) => component.type),
      [10],
    );
    await context.close();
  });
}

await browser.close();

// The message built above, checked against <Message> pixel by pixel (needs the playground).

if (playgroundUp && exported != null && fs.existsSync(path.join(OUT, 'built-cv2.json'))) {
  await step('the built message renders exactly like <Message> (all themes)', async () => {
    const output = execFileSync(
      'node',
      [
        'scripts/builder-parity.mjs',
        '--payload',
        exported,
        '--payload',
        path.join(OUT, 'built-cv2.json'),
        '--out',
        path.join(OUT, 'parity'),
      ],
      { cwd: REPO, encoding: 'utf8' },
    );
    console.log(output.trimEnd().replace(/^/gm, '       '));
  });
} else console.log('  skip parity (start the playground with `pnpm dev`)');

console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
