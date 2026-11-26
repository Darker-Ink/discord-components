// Checks that every scroll area of the standalone playground fits in the window and that its end can be
// scrolled into view: the story sidebar, the canvas and the controls panel, at several window sizes.
//
//   node scripts/check-playground-scroll.mjs [--sizes 1280x800,1280x720,1024x600] [<collection>/<story>...]
//
// Needs `pnpm dev` (5173). Set CHROMIUM_PATH if playwright-core can't find a browser on its own.
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const args = process.argv.slice(2);
let sizes = ['1280x800', '1280x720', '1024x600', '1440x900'];
const targets = [];
while (args.length) {
  const arg = args.shift();
  if (arg === '--sizes') sizes = args.shift().split(',');
  else targets.push(arg);
}
// Long sidebars, long stories and long control lists.
if (targets.length === 0)
  targets.push('mana/global-banner-variants', 'mana/select', 'void/notice', 'messages/rich-embed');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;

// Scrolls `area` to its end and reports whether it, and its last element, are inside the window.
const checkArea = (page, selector) =>
  page.evaluate((selector) => {
    const area = document.querySelector(selector);
    if (area == null) return { missing: true };
    area.scrollTop = area.scrollHeight;
    const last = (() => {
      let element = area;
      while (element.lastElementChild != null) element = element.lastElementChild;
      // The deepest last element can be an invisible helper; walk up until something has a size.
      while (element !== area && element.getBoundingClientRect().height === 0) element = element.parentElement;
      return element;
    })();
    const areaRect = area.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    return {
      areaBottom: Math.round(areaRect.bottom),
      lastBottom: Math.round(lastRect.bottom),
      viewport: window.innerHeight,
      areaFits: areaRect.bottom <= window.innerHeight + 0.5,
      lastVisible: lastRect.bottom <= Math.min(areaRect.bottom, window.innerHeight) + 0.5,
      scrollable: area.scrollHeight > area.clientHeight,
    };
  }, selector);

for (const size of sizes) {
  const [width, height] = size.split('x').map(Number);
  for (const target of targets) {
    const [collection, story] = target.split('/');
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(90000);
    await page.goto(`${OURS}/?collection=${collection}&story=${story}&theme=darker`);
    await page.locator('[data-testid="component-playground"]').waitFor();
    await page.waitForTimeout(800);
    const root = await page
      .locator('[data-testid="component-playground"]')
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const results = [];
    if (root > height + 0.5) results.push(`root bottom ${root} > ${height}`);
    for (const [name, selector] of [
      ['sidebar', '[class*="sidebar_"]'],
      ['canvas', '[class*="canvas_"]'],
      ['controls', '[class*="controls_"]'],
    ]) {
      const result = await checkArea(page, selector);
      if (result.missing) continue;
      if (!result.areaFits) results.push(`${name} bottom ${result.areaBottom} > ${result.viewport}`);
      if (!result.lastVisible) results.push(`${name} last element bottom ${result.lastBottom} not visible`);
    }
    await page.close();
    if (results.length > 0) failures++;
    console.log(`${size} ${target}: ${results.length === 0 ? 'ok' : results.join('; ')}`);
  }
}
await browser.close();
process.exitCode = failures > 0 ? 1 : 0;
