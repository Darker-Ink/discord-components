// Renders a message fixture with Discord's original modules (reference server) and with ours (playground)
// and diffs pixels, DOM and computed styles.
//
//   node scripts/compare-messages.mjs <group>/<fixture> [--theme light|dark|darker|midnight|all]
//                                     [--dom] [--styles <selector>] [--hover <selector>] [--click <selector>]
//                                     [--out dir]
//   node scripts/compare-messages.mjs <group> [...]          every fixture of the group
//
// Fixtures live in scripts/fixtures/<group>/<fixture>.json:
//   { "story": "<our playground story id>", "data": { ... } }
// Our side opens ?embed&collection=messages&story=<story>&fixture=<group>/<fixture>; the story loads the same JSON.
// The reference side runs scripts/fixtures/<group>/reference.js in the reference page: an async function
// `(ref, data) => ReactElement` that boots Discord's modules and builds the element to render.
//
// "{{assets}}" in a fixture stands for the playground's /messages folder (packages/playground/public/messages),
// so both sides load the same images.
//
// Needs both servers: `pnpm dev` (5173) and `node scripts/reference/server.mjs` (5174).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const REF = process.env.REF_URL ?? 'http://localhost:5174';
const THEMES = ['light', 'dark', 'darker', 'midnight'];
const FIXTURES = path.resolve('scripts/fixtures');

const args = process.argv.slice(2);
const target = args.shift();
if (target == null) {
  console.error('usage: compare-messages.mjs <group>[/<fixture>] [--theme t|all] [--dom] [--styles sel] [--hover sel]');
  process.exit(1);
}
let themes = ['darker'];
let dom = false;
let stylesSelector = null;
let hover = null;
let click = null;
let out = path.resolve('.cache/compare');
while (args.length) {
  const flag = args.shift();
  if (flag === '--theme') {
    const value = args.shift();
    themes = value === 'all' ? THEMES : [value];
  } else if (flag === '--dom') dom = true;
  else if (flag === '--styles') stylesSelector = args.shift();
  else if (flag === '--hover') hover = args.shift();
  else if (flag === '--click') click = args.shift();
  else if (flag === '--out') out = path.resolve(args.shift());
}
fs.mkdirSync(out, { recursive: true });

const [group, only] = target.split('/');
const groupDir = path.join(FIXTURES, group);
const names = only
  ? [only]
  : fs
      .readdirSync(groupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5));
const referenceSource = fs.readFileSync(path.join(groupDir, 'reference.js'), 'utf8').trim().replace(/;$/, '');

// Strips CSS-module hashes: Discord's `name_AbC12x` and Vite's `_name_1a2b3_7`.
const normalizeHtml = (html) =>
  html
    .replace(/(?<=["\s])_([\w/-]+?)_[a-z0-9]{5}_\d+(?=["\s])/g, '$1')
    .replace(/(?<=["\s])([\w/-]+?)_[\w-]{6}(?=["\s])/g, '$1')
    .replace(/ style="padding: 24px;"/, '')
    .replace(/\buid_\w+/g, 'uid')
    // React's useId counter depends on how many hooks ran before; only the wiring matters.
    .replace(/\b_r_[0-9a-z]+_/g, '_r_')
    // Bundled SVG assets: Discord serves them from /assets, Vite inlines them (same files, copied from the build).
    .replace(/src="(?:\/assets\/[0-9a-f]+\.svg|data:image\/svg\+xml[^"]*)"/g, 'src="{svg}"')
    .replace(/></g, '>\n<');

const STYLE_PROPS = [
  'display',
  'position',
  'box-sizing',
  'width',
  'height',
  'max-width',
  'min-width',
  'padding',
  'margin',
  'gap',
  'grid-template-columns',
  'grid-column',
  'border',
  'border-left',
  'border-radius',
  'background-color',
  'color',
  'opacity',
  'filter',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'white-space',
  'justify-self',
  'object-fit',
  'transform',
  'cursor',
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const settle = async (page) => {
  const root = page.locator('[data-story]');
  await root.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  // Lazy images load after mount; wait for every <img> that has a source.
  await page
    .waitForFunction(() => [...document.querySelectorAll('[data-story] img')].every((img) => img.complete), null, {
      timeout: 10000,
    })
    .catch(() => {});
  await page.waitForTimeout(400);
  if (hover) {
    await page.hover(`[data-story] ${hover}`).catch((e) => console.log(`  hover failed: ${e.message}`));
    await page.waitForTimeout(400);
  }
  if (click) {
    await page.click(`[data-story] ${click}`).catch((e) => console.log(`  click failed: ${e.message}`));
    await page.waitForTimeout(600);
  }
  return root;
};

const capture = async (page, errors) => {
  const root = await settle(page);
  const box = await root.boundingBox();
  const shot = await page.screenshot({
    clip: { x: 0, y: 0, width: 1000, height: Math.max(1, Math.ceil(box.y + box.height)) },
    animations: 'disabled',
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
  return { png: PNG.sync.read(shot), html, styles, errors };
};

// Discord sniffs the browser from the user agent (e.g. to request webp from the media proxy); headless
// Chromium's "HeadlessChrome" isn't recognised, so present a regular Chrome.
const userAgent = (
  await browser.newContext().then((c) => c.newPage().then((p) => p.evaluate(() => navigator.userAgent)))
).replace('HeadlessChrome', 'Chrome');

const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1, userAgent });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, errors };
};

const captureRef = async (fixture, theme) => {
  const { page, errors } = await newPage();
  await page.goto(`${REF}/`);
  await page.evaluate(
    async ([source, data, storyId, theme]) => {
      ref.setTheme(theme);
      const render = (0, eval)(`(${source}\n)`);
      const element = await render(ref, data);
      // Translations load lazily per chunk; wait for the English strings of every loaded loader.
      const loaders = new Set();
      for (const module of Object.values(window.__ref.req.c)) {
        const exports = module.exports;
        if (exports == null || typeof exports !== 'object') continue;
        for (const key of Object.keys(exports)) {
          let value;
          try {
            value = exports[key];
          } catch {
            continue;
          }
          if (
            value != null &&
            typeof value === 'object' &&
            Object.getOwnPropertyNames(value).includes('localeImportMap')
          )
            loaders.add(value);
        }
      }
      await Promise.all([...loaders].map((loader) => Promise.resolve(loader.waitForDefaultLocale()).catch(() => {})));
      const h = ref.React.createElement;
      await ref.render(h('div', { 'data-story': storyId, style: { padding: 24 } }, element));
    },
    [referenceSource, fixture.data, fixture.story, theme],
  );
  const result = await capture(page, errors);
  await page.close();
  return result;
};

const captureOurs = async (fixture, name, theme) => {
  const { page, errors } = await newPage();
  await page.goto(`${OURS}/?embed&collection=messages&story=${fixture.story}&fixture=${group}/${name}&theme=${theme}`);
  const result = await capture(page, errors);
  await page.close();
  return result;
};

const pad = (png, width, height) => {
  if (png.width === width && png.height === height) return png;
  const padded = new PNG({ width, height, fill: true });
  PNG.bitblt(png, padded, 0, 0, png.width, png.height, 0, 0);
  return padded;
};

const assets = `${OURS}/messages`;
let failures = 0;
for (const name of names) {
  const raw = fs.readFileSync(path.join(groupDir, `${name}.json`), 'utf8').replaceAll('{{assets}}', assets);
  const fixture = JSON.parse(raw);
  console.log(`# ${group}/${name}`);
  for (const theme of themes) {
    const ref = await captureRef(fixture, theme);
    const ours = await captureOurs(fixture, name, theme);
    const width = Math.max(ref.png.width, ours.png.width);
    const height = Math.max(ref.png.height, ours.png.height);
    const a = pad(ref.png, width, height);
    const b = pad(ours.png, width, height);
    const diff = new PNG({ width, height });
    const changed = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
    const base = path.join(out, `messages-${group}-${name}-${theme}`);
    fs.writeFileSync(`${base}-ref.png`, PNG.sync.write(a));
    fs.writeFileSync(`${base}-ours.png`, PNG.sync.write(b));
    fs.writeFileSync(`${base}-diff.png`, PNG.sync.write(diff));
    const refDom = normalizeHtml(ref.html);
    const ourDom = normalizeHtml(ours.html);
    const domMatch = refDom === ourDom;
    if (changed > 0 || !domMatch) failures++;
    console.log(
      `${theme}: ${changed} px differ (${((changed / (width * height)) * 100).toFixed(3)}%), DOM ${domMatch ? 'identical' : 'differs'} -> ${base}-*.png`,
    );
    for (const [label, result] of [
      ['ref', ref],
      ['ours', ours],
    ]) {
      if (result.errors.length) console.log(`  ${label} errors: ${result.errors.join(' | ')}`);
    }
    if (dom || (!domMatch && names.length === 1)) {
      if (dom) {
        console.log('--- ref DOM\n' + refDom);
        console.log('--- our DOM\n' + ourDom);
      } else {
        const r = refDom.split('\n');
        const o = ourDom.split('\n');
        const at = r.findIndex((line, i) => line !== o[i]);
        console.log(`  first DOM difference at line ${at}:\n  ref:  ${r[at]}\n  ours: ${o[at]}`);
      }
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
}
await browser.close();
process.exitCode = failures > 0 ? 1 : 0;
