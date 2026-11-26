// Checks that the message builder, with nothing selected, draws a message exactly like <Message> draws the
// same JSON: renders the playground's Builder → Parity story on both sides and diffs the pixels.
//
//   node scripts/builder-parity.mjs [--theme light|dark|darker|midnight|all] [--payload file.json]... [--out dir]
//
// Without --payload it checks the story's two samples (classic embeds and Components v2). Needs `pnpm dev` (5173).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const THEMES = ['light', 'dark', 'darker', 'midnight'];

const args = process.argv.slice(2);
let themes = THEMES;
const payloads = [];
let out = path.resolve('.cache/compare/builder');
while (args.length) {
  const flag = args.shift();
  if (flag === '--theme') {
    const value = args.shift();
    themes = value === 'all' ? THEMES : [value];
  } else if (flag === '--payload') {
    const file = args.shift();
    payloads.push({ name: path.basename(file, '.json'), json: fs.readFileSync(file, 'utf8') });
  } else if (flag === '--out') out = path.resolve(args.shift());
}
fs.mkdirSync(out, { recursive: true });

const cases =
  payloads.length > 0
    ? payloads.map(({ name, json }) => ({ name, params: { payload: JSON.stringify(JSON.parse(json)) } }))
    : [
        { name: 'classic', params: { sample: 'classic' } },
        { name: 'cv2', params: { sample: 'cv2' } },
      ];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1 });

const render = async (params, side, theme) => {
  const query = new URLSearchParams({ collection: 'messages', story: 'builder-parity', theme, side, ...params });
  await page.goto(`${OURS}/?embed&${query}`, { waitUntil: 'networkidle' });
  // Media sizes are probed in the browser; wait until every image has loaded and settled.
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 10000 });
  await page.mouse.move(0, 999);
  await page.waitForTimeout(400);
  return PNG.sync.read(await page.locator('[data-parity-side]').screenshot({ animations: 'disabled' }));
};

let failed = 0;
for (const { name, params } of cases) {
  for (const theme of themes) {
    const ours = await render(params, 'builder', theme);
    const ref = await render(params, 'reference', theme);
    const width = Math.max(ours.width, ref.width);
    const height = Math.max(ours.height, ref.height);
    const pad = (png) => {
      const result = new PNG({ width, height });
      PNG.bitblt(png, result, 0, 0, png.width, png.height, 0, 0);
      return result;
    };
    const a = pad(ours);
    const b = pad(ref);
    const diff = new PNG({ width, height });
    const count = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0 });
    const sizeNote =
      ours.width !== ref.width || ours.height !== ref.height
        ? ` (sizes ${ours.width}x${ours.height} vs ${ref.width}x${ref.height})`
        : '';
    console.log(`${name.padEnd(12)} ${theme.padEnd(9)} ${count} px differ${sizeNote}`);
    if (count > 0 || sizeNote !== '') failed++;
    fs.writeFileSync(path.join(out, `${name}-${theme}-builder.png`), PNG.sync.write(a));
    fs.writeFileSync(path.join(out, `${name}-${theme}-message.png`), PNG.sync.write(b));
    fs.writeFileSync(path.join(out, `${name}-${theme}-diff.png`), PNG.sync.write(diff));
  }
}
await browser.close();
console.log(failed === 0 ? 'identical' : `${failed} differ (see ${path.relative(process.cwd(), out)})`);
process.exit(failed === 0 ? 0 : 1);
