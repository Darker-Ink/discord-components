#!/usr/bin/env node
/* global process, console, localStorage, window, document, Event, Buffer */
// Screenshots of the builder's states (selection, popouts, dragging, errors) in every theme, for reviewing the
// design. Run against a running server:
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/tour.mjs http://localhost:5175 [light,ash,dark,onyx]
// Screenshots go to test-results/tour (or TOUR_OUT).
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:5175').replace(/\/$/, '');
const THEMES = (process.argv[3] ?? 'light,ash,dark,onyx').split(',');
const OUT = process.env.TOUR_OUT ?? path.join(import.meta.dirname, '..', 'test-results', 'tour');
fs.mkdirSync(OUT, { recursive: true });

const FIXTURES = path.join(OUT, 'fixtures');
fs.mkdirSync(FIXTURES, { recursive: true });
fs.writeFileSync(
  path.join(FIXTURES, 'harbor-map.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAIAAACwpMoFAAAA7ElEQVR4nO3RAQkAIQDAwPdTWsD+YAJTiDDuEgw25tofXf/rAO4yOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI4zOM7gOIPjDI473zQCYyX+CQgAAAAASUVORK5CYII=',
    'base64',
  ),
);
fs.writeFileSync(path.join(FIXTURES, 'patch-notes.txt'), 'Update 2.4\n- Harbor map\n- Ranked seasons\n');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const settle = (ms = 300) => page.waitForTimeout(ms);

const start = async (theme, starter) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate((value) => {
    localStorage.clear();
    localStorage.setItem('discord-mana:theme', value);
  }, theme);
  await page.reload({ waitUntil: 'networkidle' });
  if (starter != null) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await page.getByRole('menuitem', { name: starter }).click();
  }
  await settle(500);
};

const shot = async (theme, name) => {
  await page.screenshot({ path: path.join(OUT, `${theme}-${name}.png`) });
  console.log(`${theme}-${name}.png`);
};

const embed = () => page.locator('[data-builder-canvas] [data-builder-kind="embed"]').first();

for (const theme of THEMES) {
  await start(theme);
  await shot(theme, '01-example');

  // An embed selected: its empty parts appear, its toolbar opens.
  await embed().click({ position: { x: 8, y: 6 } });
  await settle();
  await shot(theme, '02-embed-selected');

  // The colour bar opens the client's colour picker.
  await page.locator('[aria-label="Embed colour"]').click();
  await settle(500);
  await shot(theme, '03-embed-colour');
  await page.keyboard.press('Escape');
  await settle();

  // Editing a title in place.
  await embed().locator('[aria-label="Embed title"]').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' **now**', { delay: 10 });
  await settle();
  await shot(theme, '04-editing-title');

  // A field over its limit.
  await page.keyboard.insertText('x'.repeat(260));
  await settle(400);
  await shot(theme, '05-title-too-long');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Escape');
  await settle();

  // A button selected, its style popout open.
  await start(theme, /^Components v2 example/);
  await page.locator('[data-builder-canvas]').getByText('View map').click();
  await settle();
  await shot(theme, '06-cv2-button-selected');
  await page.getByRole('button', { name: /^Style/ }).click();
  await settle(400);
  await shot(theme, '07-button-style');
  await page.keyboard.press('Escape');

  // Dragging a gallery in from the palette.
  const item = page.locator('nav[aria-label="Components"] button[aria-label="Media gallery"]');
  const from = await item.boundingBox();
  const container = await page.locator('[data-builder-kind="container"]').first().boundingBox();
  await page.mouse.move(from.x + 20, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 60, from.y + 30, { steps: 5 });
  await page.mouse.move(container.x + 120, container.y + container.height - 12, { steps: 20 });
  await settle(300);
  await shot(theme, '08-dragging-gallery');
  await page.mouse.up();
  await settle(500);
  await shot(theme, '09-gallery-added');

  // A select menu's options.
  await start(theme, /^Blank message/);
  await page.locator('nav[aria-label="Components"] button[aria-label="Select menu"]').click();
  await settle(400);
  await page.getByRole('button', { name: 'Options and settings' }).click();
  await settle(400);
  await shot(theme, '10-select-options');
  await page.keyboard.press('Escape');

  // The send tab.
  await page.getByRole('tab', { name: /^Send/ }).click();
  await settle();
  await shot(theme, '11-send');

  // Files: attached from the palette, edited from the message, used as an embed's image.
  await start(theme, /^Example$/);
  const chooser = page.waitForEvent('filechooser');
  await page.locator('nav[aria-label="Components"] button[aria-label="File"]').click();
  await (await chooser).setFiles([path.join(FIXTURES, 'harbor-map.png'), path.join(FIXTURES, 'patch-notes.txt')]);
  await settle(700);
  await shot(theme, '12-files');
  await page.locator('[data-builder-canvas]').getByText('patch-notes.txt').click();
  await settle(400);
  await shot(theme, '13-attachment-editor');
  await page.keyboard.press('Escape');
  await embed().click({ position: { x: 8, y: 6 } });
  await page.getByRole('toolbar').getByRole('button', { name: 'Image', exact: true }).click();
  await settle(400);
  await shot(theme, '14-embed-image-from-file');
  await page
    .getByRole('group', { name: 'Attached files' })
    .getByRole('button', { name: /harbor-map/ })
    .click();
  await settle(300);
  await page.keyboard.press('Escape');

  // Silent, mentions and the files' sizes in Send.
  await page.getByRole('tab', { name: /^Send/ }).click();
  await settle();
  const options = page.getByRole('region', { name: 'Message options' });
  await options.getByText('Silent', { exact: true }).click();
  await options.getByText('Limit mentions', { exact: true }).click();
  await options.getByText('Users', { exact: true }).click();
  await options.evaluate((element) => element.scrollIntoView({ block: 'end' }));
  await settle(300);
  await shot(theme, '15-send-options');

  // A poll message, from the mode switch, being edited.
  await page.getByRole('radiogroup', { name: 'Message type' }).getByRole('radio', { name: 'Poll' }).click();
  await settle(400);
  await page.getByRole('group', { name: 'Poll' }).getByRole('textbox', { name: 'Poll question' }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Which map next?', { delay: 5 });
  const poll = page.getByRole('group', { name: 'Poll' });
  await poll.getByRole('textbox', { name: 'Answer 1' }).click();
  await page.keyboard.type('Harbor', { delay: 5 });
  await poll.getByRole('textbox', { name: 'Answer 2' }).click();
  await page.keyboard.type('Desert', { delay: 5 });
  await poll.getByRole('button', { name: 'Answer 1 emoji' }).click();
  await settle(300);
  await page.getByRole('group', { name: 'Common emoji' }).getByRole('button', { name: '🔥' }).click();
  await page.keyboard.press('Escape');
  await settle(300);
  await shot(theme, '16-poll-editing');

  // Components v2: a File component asks for its file.
  await start(theme, /^Components v2 example/);
  const fileChooser = page.waitForEvent('filechooser');
  await page.locator('nav[aria-label="Components"] button[aria-label="File"]').click();
  await (await fileChooser).setFiles([path.join(FIXTURES, 'patch-notes.txt')]);
  await settle(600);
  await shot(theme, '17-cv2-file');
}

// Phones (touch, device emulation): the key flows in every theme.
/**
 * Stands in for the on-screen keyboard, which emulation doesn't have: the visual viewport shrinks (as it does
 * when a phone's keyboard opens) and a keyboard-shaped panel covers what it would.
 */
const fakeKeyboard = (page, dark) =>
  page.evaluate((isDark) => {
    const viewport = window.visualViewport;
    const height = Math.round(window.innerHeight * 0.6);
    Object.defineProperty(viewport, 'height', { configurable: true, get: () => height });
    viewport.dispatchEvent(new Event('resize'));
    const keyboard = document.createElement('div');
    keyboard.id = 'fake-keyboard';
    Object.assign(keyboard.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      height: `${window.innerHeight - height}px`,
      background: isDark ? '#2b2b2e' : '#d1d3d9',
      zIndex: '10000',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '10px 4px',
      boxSizing: 'border-box',
    });
    for (const row of ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', ' ']) {
      const line = document.createElement('div');
      Object.assign(line.style, { display: 'flex', gap: '6px', justifyContent: 'center' });
      for (const key of row === ' ' ? ['space'] : row.split('')) {
        const cap = document.createElement('div');
        cap.textContent = key;
        Object.assign(cap.style, {
          flex: key === 'space' ? '0 0 60%' : '0 0 8%',
          height: '42px',
          borderRadius: '5px',
          background: isDark ? '#6b6b6e' : '#fff',
          color: isDark ? '#fff' : '#000',
          font: '20px system-ui',
          display: 'grid',
          placeItems: 'center',
        });
        line.append(cap);
      }
      keyboard.append(line);
    }
    document.body.append(keyboard);
  }, dark);

const closeKeyboard = (page) =>
  page.evaluate(() => {
    document.getElementById('fake-keyboard')?.remove();
    delete window.visualViewport.height;
    window.visualViewport.dispatchEvent(new Event('resize'));
    document.activeElement?.blur?.();
  });

for (const theme of THEMES) {
  for (const [device, size] of [
    ['iPhone 13', { width: 390, height: 844 }],
    ['Pixel 7', { width: 360, height: 740 }],
  ]) {
    const context = await browser.newContext({ ...devices[device], viewport: size });
    const phone = await context.newPage();
    const name = `${theme}-phone-${size.width}`;
    const snap = async (label) => {
      await phone.screenshot({ path: path.join(OUT, `${name}-${label}.png`) });
      console.log(`${name}-${label}.png`);
    };
    const tab = (label) =>
      phone.locator('nav[aria-label="Message tools"]').getByRole('button', { name: new RegExp(`^${label}`) });
    const sheet = () => phone.getByRole('dialog').last();
    const closeSheet = async () => {
      await phone.getByRole('dialog').getByRole('button', { name: 'Close' }).first().tap();
      await phone.waitForTimeout(250);
    };
    await phone.goto(BASE, { waitUntil: 'networkidle' });
    await phone.evaluate((value) => {
      localStorage.clear();
      localStorage.setItem('discord-mana:theme', value);
    }, theme);
    await phone.reload({ waitUntil: 'networkidle' });
    await phone.waitForTimeout(500);
    await snap('01-message');
    const embed = phone.locator('[data-builder-kind="embed"]').first();
    const embedBox = await embed.boundingBox();
    await embed.tap({ position: { x: embedBox.width - 6, y: 4 } });
    await phone.waitForTimeout(400);
    await snap('02-selected');
    await phone.locator('[data-builder-kind="embed"] [aria-label="Embed title"]').tap();
    await phone.waitForTimeout(400);
    await snap('03-editing');
    await fakeKeyboard(phone, theme !== 'light');
    await phone.waitForTimeout(500);
    await snap('04-keyboard');
    await closeKeyboard(phone);
    await phone.waitForTimeout(300);
    await phone.getByRole('button', { name: 'Done', exact: true }).tap();
    await phone.waitForTimeout(250);

    // Add: the sheet, then a file and a poll from it.
    await tab('Add').tap();
    await phone.waitForTimeout(450);
    await snap('05-add');
    const chooser = phone.waitForEvent('filechooser');
    await sheet().getByRole('button', { name: 'File', exact: true }).tap();
    await (await chooser).setFiles([path.join(FIXTURES, 'harbor-map.png'), path.join(FIXTURES, 'patch-notes.txt')]);
    await phone.waitForTimeout(700);
    if (await phone.getByRole('dialog', { name: 'Add' }).isVisible()) await closeSheet();
    await snap('06-attached');
    await phone.locator('[data-builder-canvas]').getByText('patch-notes.txt').tap();
    await phone.waitForTimeout(450);
    await snap('07-attachment-editor');
    await phone.keyboard.press('Escape');
    await phone.waitForTimeout(250);

    // The ⋯ menu of the selected embed (the docked bar's More).
    await embed.tap({ position: { x: (await embed.boundingBox()).width - 6, y: 4 } });
    await phone.waitForTimeout(300);
    await phone.getByRole('toolbar').getByRole('button', { name: 'More' }).tap();
    await phone.waitForTimeout(350);
    await snap('08-node-menu');
    await phone.keyboard.press('Escape');
    await phone.getByRole('button', { name: 'Done', exact: true }).tap();
    await phone.waitForTimeout(250);

    for (const [label, file] of [
      ['Issues', '09-issues'],
      ['JSON', '10-json'],
    ]) {
      await tab(label).tap();
      await phone.waitForTimeout(450);
      await snap(file);
      await closeSheet();
    }
    // Send: delivery, then the files and the message's options further down.
    await tab('Send').tap();
    await phone.waitForTimeout(450);
    await snap('11-send');
    const options = sheet().getByRole('region', { name: 'Message options' });
    await options.getByText('Silent', { exact: true }).tap();
    await options.getByText('Limit mentions', { exact: true }).tap();
    await phone.waitForTimeout(200);
    await options.getByText('Users', { exact: true }).tap();
    await sheet()
      .getByRole('region', { name: 'Files' })
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await phone.waitForTimeout(300);
    await snap('12-send-files');
    await options.evaluate((element) => element.scrollIntoView({ block: 'end' }));
    await phone.waitForTimeout(300);
    await snap('13-send-mentions');
    await closeSheet();
    await phone.locator('header').getByRole('button', { name: 'More', exact: true }).tap();
    await phone.waitForTimeout(350);
    await snap('14-more');
    await phone.keyboard.press('Escape');
    await phone.waitForTimeout(250);

    // A poll message, from the header's mode switch (the Add tab goes away).
    await phone.getByRole('radiogroup', { name: 'Message type' }).getByRole('radio', { name: 'Poll' }).tap();
    await phone.waitForTimeout(500);
    const poll = phone.getByRole('group', { name: 'Poll' });
    await poll.getByRole('textbox', { name: 'Poll question' }).tap();
    await phone.keyboard.press('Control+a');
    await phone.keyboard.type('Which map next?', { delay: 5 });
    await poll.getByRole('textbox', { name: 'Answer 1' }).tap();
    await phone.keyboard.type('Harbor', { delay: 5 });
    await poll.getByRole('textbox', { name: 'Answer 2' }).tap();
    await phone.keyboard.type('Desert', { delay: 5 });
    await phone.waitForTimeout(300);
    await snap('15-poll-editing');
    // A tap on the empty canvas leaves the poll.
    const canvas = phone.locator('[data-builder-canvas]');
    const canvasBox = await canvas.boundingBox();
    await canvas.tap({ position: { x: canvasBox.width / 2, y: canvasBox.height - 12 } });
    await phone.waitForTimeout(300);
    await snap('16-poll');
    await context.close();
  }
}

await browser.close();
