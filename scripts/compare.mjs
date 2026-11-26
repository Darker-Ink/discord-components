// Renders a playground story in our playground and in Discord's (reference server) and diffs them.
//
//   node scripts/compare.mjs <collection>/<story> [--theme light|dark|darker|midnight|all]
//                            [--prop key=value]... [--dom] [--styles <selector>] [--out dir] [--clock <time>]
//
// Needs both servers running: `pnpm dev` (5173) and `node scripts/reference/server.mjs` (5174).
// Set CHROMIUM_PATH if playwright-core can't find a browser on its own.
//
// Output: ref/ours/diff PNGs per theme and the share of differing pixels. --dom prints both DOM trees
// with CSS-module hashes stripped; --styles prints computed styles of the first match in each.
// --clock fixes Date on both pages (any Date-parsable time, e.g. 2026-11-26T12:00) for stories that start
// from "today".
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const REF = process.env.REF_URL ?? 'http://localhost:5174';
const THEMES = ['light', 'dark', 'darker', 'midnight'];

const args = process.argv.slice(2);
const target = args.shift();
if (!target?.includes('/')) {
  console.error('usage: compare.mjs <collection>/<story> [--theme t|all] [--prop k=v]... [--dom] [--styles sel]');
  process.exit(1);
}
const [collection, story] = target.split('/');
const props = new URLSearchParams();
let themes = ['darker'];
let dom = false;
let stylesSelector = null;
let out = path.resolve('.cache/compare');
let clock = null;
while (args.length) {
  const flag = args.shift();
  if (flag === '--theme') {
    const value = args.shift();
    themes = value === 'all' ? THEMES : [value];
  } else if (flag === '--prop') {
    const [key, ...rest] = args.shift().split('=');
    props.set(key, rest.join('='));
  } else if (flag === '--dom') dom = true;
  else if (flag === '--styles') stylesSelector = args.shift();
  else if (flag === '--out') out = path.resolve(args.shift());
  else if (flag === '--clock') clock = new Date(args.shift());
}
fs.mkdirSync(out, { recursive: true });

const normalizeHtml = (html) =>
  html
    .replace(/\b([\w-]+?)_[\w-]{6}\b/g, '$1')
    .replace(/ style="padding: 24px;"/, '')
    .replace(/></g, '>\n<');

const STYLE_PROPS = [
  'display',
  'position',
  'box-sizing',
  'width',
  'height',
  'min-width',
  'min-height',
  'padding',
  'margin',
  'gap',
  'border',
  'border-radius',
  'outline',
  'background-color',
  'background-image',
  'color',
  'opacity',
  'box-shadow',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'align-items',
  'justify-content',
  'flex-direction',
  'transform',
  'transition',
  'cursor',
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Discord sniffs the browser from the user agent (e.g. webp support); present a regular Chrome.
const userAgent = (
  await browser.newPage().then(async (p) => {
    const ua = await p.evaluate(() => navigator.userAgent);
    await p.close();
    return ua;
  })
).replace('HeadlessChrome', 'Chrome');
const capture = async (url) => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1, userAgent });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (clock) await page.clock.setFixedTime(clock);
  await page.goto(url);
  const root = page.locator('[data-story]');
  await root.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  // Layers promoted with will-change can keep a mid-animation raster scale, which shows up as
  // anti-aliasing noise that differs between runs.
  await page.addStyleTag({ content: '* { will-change: auto !important; }' });
  await page.waitForTimeout(50);
  const box = await root.boundingBox();
  const shot = await page.screenshot({
    clip: { x: 0, y: 0, width: 1000, height: Math.max(1, Math.ceil(box.y + box.height)) },
  });
  const html = await root.evaluate((el) => el.outerHTML);
  const styles = stylesSelector
    ? await page.evaluate(
        ([sel, keys]) => {
          const el = document.querySelector(`[data-story] ${sel}`);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue(k)]));
        },
        [stylesSelector, STYLE_PROPS],
      )
    : null;
  await page.close();
  return { png: PNG.sync.read(shot), html, styles, errors };
};

const pad = (png, width, height) => {
  if (png.width === width && png.height === height) return png;
  const padded = new PNG({ width, height, fill: true });
  PNG.bitblt(png, padded, 0, 0, png.width, png.height, 0, 0);
  return padded;
};

for (const theme of themes) {
  const query = new URLSearchParams(props);
  query.set('theme', theme);
  const ref = await capture(`${REF}/story/${collection}/${story}?${query}`);
  const ours = await capture(`${OURS}/?embed&collection=${collection}&story=${story}&${query}`);
  const width = Math.max(ref.png.width, ours.png.width);
  const height = Math.max(ref.png.height, ours.png.height);
  const a = pad(ref.png, width, height);
  const b = pad(ours.png, width, height);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
  const base = path.join(out, `${collection}-${story}-${theme}`);
  fs.writeFileSync(`${base}-ref.png`, PNG.sync.write(a));
  fs.writeFileSync(`${base}-ours.png`, PNG.sync.write(b));
  fs.writeFileSync(`${base}-diff.png`, PNG.sync.write(diff));
  const percent = ((changed / (width * height)) * 100).toFixed(3);
  console.log(
    `${theme}: ${changed} px differ (${percent}%) ref ${ref.png.height}px tall, ours ${ours.png.height}px -> ${base}-*.png`,
  );
  for (const [name, result] of [
    ['ref', ref],
    ['ours', ours],
  ]) {
    if (result.errors.length) console.log(`  ${name} errors: ${result.errors.join(' | ')}`);
  }
  if (dom) {
    console.log('--- ref DOM\n' + normalizeHtml(ref.html));
    console.log('--- our DOM\n' + normalizeHtml(ours.html));
  }
  if (stylesSelector) {
    for (const key of STYLE_PROPS) {
      const r = ref.styles?.[key];
      const o = ours.styles?.[key];
      if (r !== o) console.log(`  ${key}: ref=${r} ours=${o}`);
    }
    if (!ref.styles || !ours.styles)
      console.log(`  selector ${stylesSelector} missing in ${!ref.styles ? 'ref' : 'ours'}`);
  }
}
await browser.close();
