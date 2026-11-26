// Types into Discord's chat input (rendered from the build through the reference server) and into ours (the
// playground's `text-area-fixtures` story), then diffs pixels, DOM and the resulting message text.
//
//   node scripts/compare-slate.mjs [<fixture>] [--theme light|dark|darker|midnight|all] [--dom] [--out dir]
//
// Fixtures live in scripts/fixtures/slate/<fixture>.json (`"sample": true` adds the users, roles, channels and emoji
// of _sample.json to its data):
//   { "data": { "type": "NORMAL", "value": "", "placeholder": "…", users, roles, channels, emojis, emoji_urls… },
//     "steps": [ { "click": true } | { "type": "text" } | { "press": "Shift+Enter" } | { "paste": "text" }
//                | { "wait": ms } | { "hover": "<selector>" } ] }
// Both sides render the same data: the reference side through scripts/fixtures/slate/reference.js, ours through
// the story (`?fixture=slate/<name>`). Typing goes to the editor (`[data-slate-editor]`), which is clicked first.
// "{{assets}}" stands for the playground's /messages folder, so both sides load the same images.
//
// Needs both servers: the playground (OURS_URL, default http://localhost:5173) and the reference renderer
// (REF_URL, default http://localhost:5174).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const REF = process.env.REF_URL ?? 'http://localhost:5174';
const THEMES = ['light', 'dark', 'darker', 'midnight'];
const DIR = path.resolve('scripts/fixtures/slate');

const args = process.argv.slice(2);
let only = null;
let themes = ['dark'];
let showDom = false;
let out = path.resolve('.cache/compare');
while (args.length) {
  const arg = args.shift();
  if (arg === '--theme') {
    const value = args.shift();
    themes = value === 'all' ? THEMES : [value];
  } else if (arg === '--dom') showDom = true;
  else if (arg === '--out') out = path.resolve(args.shift());
  else only = arg;
}
fs.mkdirSync(out, { recursive: true });

const names = only
  ? [only]
  : fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => f.slice(0, -5));
const referenceSource = fs.readFileSync(path.join(DIR, 'reference.js'), 'utf8').trim().replace(/;$/, '');

const normalizeHtml = (html) =>
  html
    .replace(/(?<=["\s])_([\w/-]+?)_[a-z0-9]{5}_\d+(?=["\s])/g, '$1')
    .replace(/(?<=["\s])([\w/-]+?)_[\w-]{6}(?=["\s])/g, '$1')
    .replace(/ style="padding: 24px;"/, '')
    .replace(/\b_r_[0-9a-z]+_/g, '_r_')
    .replace(/\buid_\w+/g, 'uid')
    // Gradient ids are random UUIDs.
    .replace(/#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '#uuid')
    // Lottie draws its SVG at runtime; the pixels compare it.
    .replace(/(<div class="[^"]*lottieIcon[^"]*"[^>]*>)<svg[\s\S]*?<\/svg>/g, '$1<svg>{lottie}</svg>')
    .replace(/></g, '>\n<');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, errors };
};

const runSteps = async (page, steps) => {
  for (const step of steps ?? []) {
    if (step.click) await page.locator('[data-slate-editor]').first().click();
    else if (step.type != null) await page.keyboard.type(step.type, { delay: 10 });
    else if (step.press != null) await page.keyboard.press(step.press);
    else if (step.paste != null)
      await page.evaluate((text) => {
        const data = new DataTransfer();
        data.setData('text/plain', text);
        document
          .querySelector('[data-slate-editor]')
          .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, step.paste);
    else if (step.hover != null) await page.hover(step.hover);
    else if (step.wait != null) await page.waitForTimeout(step.wait);
    await page.waitForTimeout(80);
  }
};

const capture = async (page, errors, fixture) => {
  const root = page.locator('[data-story]');
  await root.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await runSteps(page, fixture.steps);
  // Tooltips and the autocomplete animate in; let them settle.
  await page.waitForTimeout(700);
  const box = await root.boundingBox();
  // Spellcheck underlines appear whenever the browser gets to them; hide them for the screenshot.
  await page.evaluate(() =>
    document.querySelectorAll('[data-slate-editor]').forEach((el) => {
      el.__spellcheck = el.getAttribute('spellcheck');
      el.setAttribute('spellcheck', 'false');
    }),
  );
  await page.waitForTimeout(100);
  const shot = await page.screenshot({
    clip: { x: 0, y: 0, width: 1000, height: Math.max(1, Math.ceil(box.y + box.height)) },
    animations: 'disabled',
    caret: 'hide',
  });
  await page.evaluate(() =>
    document.querySelectorAll('[data-slate-editor]').forEach((el) => {
      if (el.__spellcheck == null) el.removeAttribute('spellcheck');
      else el.setAttribute('spellcheck', el.__spellcheck);
    }),
  );
  const html = await root.evaluate((el) => el.outerHTML);
  const value = await page.evaluate(() => window.__slateValue ?? null);
  return { png: PNG.sync.read(shot), html, value, errors };
};

const captureRef = async (fixture, theme) => {
  const { page, errors } = await newPage();
  await page.goto(`${REF}/`);
  await page.evaluate(
    async ([source, data, theme]) => {
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
      await ref.render(
        ref.React.createElement('div', { 'data-story': 'text-area-fixtures', style: { padding: 24 } }, element),
      );
    },
    [referenceSource, fixture.data, theme],
  );
  const result = await capture(page, errors, fixture);
  await page.close();
  return result;
};

const captureOurs = async (fixture, name, theme) => {
  const { page, errors } = await newPage();
  await page.goto(`${OURS}/?embed&collection=messages&story=text-area-fixtures&fixture=slate/${name}&theme=${theme}`);
  const result = await capture(page, errors, fixture);
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
  const read = (file) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8').replaceAll('{{assets}}', assets));
  const fixture = read(`${name}.json`);
  if (fixture.sample) fixture.data = { ...read('_sample.json'), ...fixture.data };
  console.log(`# slate/${name}`);
  for (const theme of themes) {
    const ref = await captureRef(fixture, theme);
    const ours = await captureOurs(fixture, name, theme);
    const width = Math.max(ref.png.width, ours.png.width);
    const height = Math.max(ref.png.height, ours.png.height);
    const a = pad(ref.png, width, height);
    const b = pad(ours.png, width, height);
    const diff = new PNG({ width, height });
    const changed = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
    const base = path.join(out, `slate-${name}-${theme}`);
    fs.writeFileSync(`${base}-ref.png`, PNG.sync.write(a));
    fs.writeFileSync(`${base}-ours.png`, PNG.sync.write(b));
    fs.writeFileSync(`${base}-diff.png`, PNG.sync.write(diff));
    const refDom = normalizeHtml(ref.html);
    const ourDom = normalizeHtml(ours.html);
    const domMatch = refDom === ourDom;
    const valueMatch = ref.value === ours.value;
    if (changed > 0 || !domMatch || !valueMatch) failures++;
    console.log(
      `${theme}: ${changed} px differ (${((changed / (width * height)) * 100).toFixed(3)}%), DOM ${domMatch ? 'identical' : 'differs'}, value ${valueMatch ? 'identical' : `differs: ref=${JSON.stringify(ref.value)} ours=${JSON.stringify(ours.value)}`} -> ${base}-*.png`,
    );
    for (const [label, result] of [
      ['ref', ref],
      ['ours', ours],
    ])
      if (result.errors.length) console.log(`  ${label} errors: ${result.errors.join(' | ')}`);
    if (showDom) {
      console.log('--- ref DOM\n' + refDom);
      console.log('--- our DOM\n' + ourDom);
    } else if (!domMatch) {
      fs.writeFileSync(`${base}-ref.html`, refDom);
      fs.writeFileSync(`${base}-ours.html`, ourDom);
      const r = refDom.split('\n');
      const o = ourDom.split('\n');
      const at = r.findIndex((line, i) => line !== o[i]);
      console.log(
        `  first DOM difference at line ${at} (full DOMs in ${base}-*.html):\n  ref:  ${r[at]}\n  ours: ${o[at]}`,
      );
    }
  }
}
await browser.close();
process.exitCode = failures > 0 ? 1 : 0;
