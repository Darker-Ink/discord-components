#!/usr/bin/env node
/* global process, console, localStorage */
// Screenshots of the builder's states (selection, popouts, dragging, errors) in every theme, for reviewing the
// design. Run against a running server:
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/tour.mjs http://localhost:5175 [light,ash,dark,onyx]
// Screenshots go to test-results/tour (or TOUR_OUT).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:5175').replace(/\/$/, '');
const THEMES = (process.argv[3] ?? 'light,ash,dark,onyx').split(',');
const OUT = process.env.TOUR_OUT ?? path.join(import.meta.dirname, '..', 'test-results', 'tour');
fs.mkdirSync(OUT, { recursive: true });

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
  await page.locator('[data-builder-canvas]').getByText('Read the docs').click();
  await settle();
  await shot(theme, '06-cv2-button-selected');
  await page.getByRole('button', { name: /^Style/ }).click();
  await settle(400);
  await shot(theme, '07-button-style');
  await page.keyboard.press('Escape');

  // Dragging a gallery in from the palette.
  const item = page.locator('nav[aria-label="Components"] button[aria-label^="Media gallery:"]');
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
  await page.locator('nav[aria-label="Components"] button[aria-label^="Select menu:"]').click();
  await settle(400);
  await page.getByRole('button', { name: 'Options and settings' }).click();
  await settle(400);
  await shot(theme, '10-select-options');
  await page.keyboard.press('Escape');

  // The send tab.
  await page.getByRole('tab', { name: /^Send/ }).click();
  await settle();
  await shot(theme, '11-send');

  // Mobile.
  await page.setViewportSize({ width: 390, height: 844 });
  await start(theme);
  await shot(theme, '12-mobile');
  await page.setViewportSize({ width: 1440, height: 900 });
}

await browser.close();
