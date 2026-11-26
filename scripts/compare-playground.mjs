// Renders the whole playground UI (collection rail, header, story sidebar, canvas and controls) in our
// playground and in Discord's ComponentPlayground (module 995199, served by the reference server) and
// diffs them.
//
//   node scripts/compare-playground.mjs [scenario...] [--theme light|dark|darker|midnight|all]
//                                       [--size 1280x800] [--out dir] [--jobs n] [--list]
//
// A scenario is `<collection>/<story>` (just that story selected), `<collection>` (no story selected), or
// one of the named scenarios below (see --list), optionally followed by `@<collection>/<story>` to run
// it on another story, e.g. `select-open@mana/button`. Without scenarios, all named scenarios run.
//
// Needs both servers running: `pnpm dev` (5173) and `node scripts/reference/server.mjs` (5174).
// Set CHROMIUM_PATH if playwright-core can't find a browser on its own.
//
// Discord's playground is a dev tool inside the client, under the app's title bar; neither side has the
// app frame here, so the `--custom-app-top-bar-height` gap at the top is empty on both. Collections that
// only exist on one side (our "Messages") are hidden on ours (`--keep-extra-collections` keeps them), and
// the header's "Docs" link, the settings menu's Experiments submenu and the Void deprecation notice, which
// ours leaves out, are hidden on Discord's. Ours fits the window instead of running past its bottom like
// Discord's does under the client's top bar; Discord's gets the same fit for the comparison.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const REF = process.env.REF_URL ?? 'http://localhost:5174';
const THEMES = ['light', 'dark', 'darker', 'midnight'];

// Elements are found by their CSS module class name, which both sides share (minus the hash).
const cls = (name) => `[class*="${name}_"]`;
const root = '[data-testid="component-playground"]';
const sidebar = cls('sidebar');
const controls = cls('controls');
// The select's combobox is a zero-size focus target inside the visible trigger row.
const selectTrigger = `${controls} [role="combobox"] >> xpath=..`;

const hover =
  (selector, index = 0) =>
  async (page) => {
    await page.locator(selector).nth(index).hover();
    await page.waitForTimeout(400);
  };

const SCENARIOS = {
  'no-story': { target: 'mana' },
  text: { target: 'mana/text' },
  button: { target: 'mana/button' },
  slider: { target: 'mana/slider' },
  'slider-control': { target: 'mana/progress-bar' },
  'number-controls': { target: 'mana/text-area' },
  'color-controls': { target: 'void/notice' },
  'global-banner': { target: 'mana/global-banner' },
  'text-input': { target: 'mana/text-input' },
  'void-collection': { target: 'void' },
  'void-slider': { target: 'void/slider' },
  'sidebar-scrolled': {
    target: 'mana/button',
    run: async (page) => {
      await page
        .locator(sidebar)
        .first()
        .evaluate((el) => (el.scrollTop = el.scrollHeight));
      await page.waitForTimeout(300);
    },
  },
  'sidebar-scrolled-middle': {
    target: 'mana/button',
    run: async (page) => {
      await page
        .locator(sidebar)
        .first()
        .evaluate((el) => (el.scrollTop = 700));
      await page.waitForTimeout(300);
    },
  },
  'sidebar-hover': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(sidebar).first().hover();
      await page.locator('[data-testid="playground-story-chip"]').hover();
      await page.waitForTimeout(400);
    },
  },
  'search-results': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${sidebar} input`).fill('but');
      await page.waitForTimeout(300);
    },
  },
  'search-no-results': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${sidebar} input`).fill('zzzz');
      await page.waitForTimeout(300);
    },
  },
  'search-focus': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${sidebar} input`).click();
      await page.waitForTimeout(300);
    },
  },
  'rail-hover': { target: 'mana/button', run: hover(`${cls('group')} [role="button"]`, 1) },
  'rail-hover-selected': { target: 'mana/button', run: hover(`${cls('group')} [role="button"]`, 0) },
  'select-hover': { target: 'mana/button', run: hover(selectTrigger, 0) },
  'select-open': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(selectTrigger).first().click();
      await page.waitForTimeout(600);
    },
  },
  'select-open-hover-option': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(selectTrigger).first().click();
      await page.waitForTimeout(600);
      await page.locator('[role="option"]').nth(1).hover();
      await page.waitForTimeout(300);
    },
  },
  'checkbox-hover': { target: 'mana/button', run: hover(`${controls} label:has(input[type="checkbox"])`, 0) },
  'checkbox-toggle': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${controls} input[type="checkbox"]`).first().click({ force: true });
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
    },
  },
  'text-focus': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${controls} input[type="text"], ${controls} input:not([type])`).first().click();
      await page.waitForTimeout(300);
    },
  },
  'text-edit': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${controls} input[type="text"], ${controls} input:not([type])`).first().fill('Edited');
      await page.mouse.click(5, 5);
      await page.waitForTimeout(400);
    },
  },
  'slider-hover': { target: 'mana/progress-bar', run: hover(`${controls} [role="slider"]`, 0) },
  'slider-drag': {
    target: 'mana/progress-bar',
    run: async (page) => {
      const box = await page.locator(`${controls} [role="slider"]`).first().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x - 60, box.y + box.height / 2, { steps: 5 });
      await page.waitForTimeout(300);
    },
  },
  'color-swatch-hover': { target: 'void/notice', run: hover(`${controls} input[type="color"]`, 0) },
  'copy-split': {
    target: 'mana/button',
    run: async (page) => {
      await page.locator(`${controls} input[type="checkbox"]`).first().click({ force: true });
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
    },
  },
  'settings-open': { target: 'mana/button', run: openSettings() },
  'settings-appearance': { target: 'mana/button', run: openSettings('appearance') },
  'settings-accessibility': { target: 'mana/button', run: openSettings('accessibility') },
  'controls-bottom': { target: 'mana/button', layout: 'bottom' },
  'controls-hidden': { target: 'mana/button', layout: 'hidden' },
};

function openSettings(submenu) {
  return async (page) => {
    await page.locator('[aria-label="Settings"]').click();
    await page.waitForTimeout(500);
    if (submenu) {
      await page.locator(`#playground-settings-menu-${submenu}`).hover();
      await page.waitForTimeout(600);
    }
  };
}

const setLayout = async (page, layout) => {
  await page.locator('[aria-label="Settings"]').click();
  await page.locator('#playground-settings-menu-appearance').hover();
  await page.locator(`#playground-settings-menu-appearance--controls-${layout}`).click();
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
};

const args = process.argv.slice(2);
let themes = ['darker'];
let size = { width: 1280, height: 800 };
let out = path.resolve('.cache/compare-playground');
let keepExtra = false;
let concurrency = 3;
const requested = [];
while (args.length) {
  const arg = args.shift();
  if (arg === '--theme') {
    const value = args.shift();
    themes = value === 'all' ? THEMES : [value];
  } else if (arg === '--size') {
    const [width, height] = args.shift().split('x').map(Number);
    size = { width, height };
  } else if (arg === '--out') out = path.resolve(args.shift());
  else if (arg === '--keep-extra-collections') keepExtra = true;
  else if (arg === '--jobs') concurrency = Number(args.shift());
  else if (arg === '--list') {
    for (const [name, scenario] of Object.entries(SCENARIOS)) console.log(`${name.padEnd(26)} ${scenario.target}`);
    process.exit(0);
  } else requested.push(arg);
}
fs.mkdirSync(out, { recursive: true });

const resolveScenario = (spec) => {
  const [name, on] = spec.split('@');
  if (SCENARIOS[name]) return { name: spec, ...SCENARIOS[name], ...(on ? { target: on } : {}) };
  return { name: spec, target: spec };
};
const scenarios = (requested.length ? requested : Object.keys(SCENARIOS)).map(resolveScenario);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const userAgent = (
  await browser.newPage().then(async (p) => {
    const ua = await p.evaluate(() => navigator.userAgent);
    await p.close();
    return ua;
  })
).replace('HeadlessChrome', 'Chrome');

const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  // Layers promoted with will-change can keep a mid-animation raster scale; caret blinking is noise.
  await page.addStyleTag({ content: '* { will-change: auto !important; caret-color: transparent !important; }' });
  await page.waitForTimeout(50);
};

const openRef = async (page, { collection, story, theme }) => {
  await page.goto(`${REF}/`);
  await page.evaluate(
    async ({ collection, story, theme }) => {
      ref.setTheme(theme);
      await ref.boot(['995199', '352611']);
      // The settings menu checks the client's theme setting, which the reference page doesn't set.
      const themeStore = ref.req('413599').A;
      Object.defineProperty(themeStore, 'theme', { get: () => theme, configurable: true });
      const store = ref.req('101715').x;
      store.setState({ selectedCollection: collection, selectedStory: story });
      await ref.loadTranslations();
      const React = ref.React;
      await ref.render(React.createElement(ref.req('995199').Q, { configs: [ref.req('352611').playgroundConfig] }));
    },
    { collection, story, theme },
  );
  // Ours leaves out, on purpose, the header's "Docs" link (divider dot plus linked title), the settings
  // menu's Experiments submenu (client experiments aren't supported) and the Void deprecation notice.
  // Standalone, ours also fits the window (PlaygroundFrame.module.css); apply the same fit here.
  await page.addStyleTag({
    content: `${cls('header')} ${cls('dot')}, ${cls('header')} ${cls('titleWrapper')}:has(a),
      #playground-settings-menu-experiments, ${cls('deprecationNotice')} { display: none !important; }
      ${root} { box-sizing: border-box; }
      ${root} > ${cls('content')} { display: flex; flex-direction: column; }
      ${root} > ${cls('content')} > ${cls('page')} { flex: 1; height: auto; padding-bottom: 0; }`,
  });
};

const openOurs = async (page, { collection, story, theme, layout }) => {
  const params = new URLSearchParams({ collection });
  if (story) params.set('story', story);
  params.set('theme', theme);
  await page.goto(`${OURS}/?${params}`);
  await page.locator('[data-testid="component-playground"]').waitFor();
  if (!keepExtra) {
    // Our extra collections have no counterpart in Discord's config.
    await page.addStyleTag({
      content: `${cls('group')} > :nth-child(n+3) { display: none !important; }`,
    });
  }
  // Discord shows the High Dynamic Range accessibility item only in an experiment (off in the reference);
  // ours always shows it. Hide it with the separator before its group.
  const hdr = '[role="group"]:has(> div > #playground-settings-menu-accessibility--hdr-dynamic-range)';
  await page.addStyleTag({
    content: `${hdr}, [role="separator"]:has(+ ${hdr}) { display: none !important; }`,
  });
  if (layout && layout !== 'right') await setLayout(page, layout);
};

const capture = async (side, scenario, theme) => {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1, userAgent });
  // Both dev servers can be slow to answer while they rebuild.
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const [collection, story = null] = scenario.target.split('/');
  const options = { collection, story, theme, layout: scenario.layout };
  if (side === 'ref') {
    await openRef(page, options);
    // Through the menu like on ours, so both sides end in the same hover/focus state.
    if (options.layout && options.layout !== 'right') await setLayout(page, options.layout);
  } else await openOurs(page, options);
  await page.locator('[data-testid="component-playground"]').waitFor();
  await settle(page);
  if (scenario.run) await scenario.run(page);
  await page.waitForTimeout(200);
  const shot = await page.screenshot();
  await page.close();
  return { png: PNG.sync.read(shot), errors };
};

let failures = 0;
const runJob = async ({ scenario, theme }) => {
  let ref, ours;
  for (let attempt = 1; ; attempt++) {
    try {
      [ref, ours] = await Promise.all([capture('ref', scenario, theme), capture('ours', scenario, theme)]);
      break;
    } catch (error) {
      if (attempt < 2) continue;
      failures++;
      return `${scenario.name} (${scenario.target}) ${theme}: failed: ${error.message.split('\n')[0]}`;
    }
  }
  const { width, height } = ref.png;
  const diff = new PNG({ width, height });
  const changed = pixelmatch(ref.png.data, ours.png.data, diff.data, width, height, { threshold: 0.1 });
  const base = path.join(out, `${scenario.name.replace(/[/@]/g, '-')}-${theme}`);
  fs.writeFileSync(`${base}-ref.png`, PNG.sync.write(ref.png));
  fs.writeFileSync(`${base}-ours.png`, PNG.sync.write(ours.png));
  fs.writeFileSync(`${base}-diff.png`, PNG.sync.write(diff));
  if (changed > 0) failures++;
  const lines = [`${scenario.name} (${scenario.target}) ${theme}: ${changed} px differ -> ${base}-*.png`];
  for (const [name, result] of [
    ['ref', ref],
    ['ours', ours],
  ]) {
    if (result.errors.length) lines.push(`  ${name} errors: ${result.errors.join(' | ')}`);
  }
  return lines.join('\n');
};

// Each job runs in its own pages, so a few can run at once; results print in order.
const jobs = scenarios.flatMap((scenario) => themes.map((theme) => ({ scenario, theme })));
const results = jobs.map(() => null);
let next = 0;
let printed = 0;
const worker = async () => {
  while (next < jobs.length) {
    const index = next++;
    results[index] = await runJob(jobs[index]);
    while (printed < results.length && results[printed] != null) console.log(results[printed++]);
  }
};
await Promise.all(Array.from({ length: concurrency }, worker));
await browser.close();
process.exitCode = failures > 0 ? 1 : 0;
