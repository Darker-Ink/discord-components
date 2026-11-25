// Generates packages/tokens/src/{primitives,fonts,base}.css and themes/*.css from the cached build.
//
// Discord ships ~800KB of custom properties. We keep:
//   - every semantic token of the four themes, minus app-only families (quests, charts, mobile, …)
//   - scales that make up the public design language (space, radius, font, size, icon size, …)
//   - any other variable only if something we keep references it, including our own component CSS
// and drop the @supports color-mix copies (they only blend in Nitro client themes, which are a no-op
// by default), high contrast mode and mobile-only blocks.
//
// Re-run after adding components so newly referenced primitives are pulled in.
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import * as prettier from 'prettier';

const CACHE = path.resolve('.cache');
const ASSETS = path.join(CACHE, 'assets');
const PACKAGES = path.resolve('packages');
const OUT = path.join(PACKAGES, 'tokens/src');
const ORIGIN = process.env.DISCORD_ORIGIN ?? 'https://canary.discord.com';

const FONT_FAMILIES = new Set([
  'gg sans',
  'gg mono',
  'ABC Ginto Nord',
  'ABC Ginto Discord Nord',
  'ABC Ginto Discord',
  'Noto Sans',
  'Source Code Pro',
]);
const KEPT_SELECTORS = new Set([
  ':root',
  ...['light', 'dark', 'darker', 'midnight'].map((t) => `.theme-${t}`),
  '.theme-darker,.theme-midnight',
  '.visual-refresh',
  '.density-compact',
  '.density-cozy',
  '.density-default',
]);
const ROOT_SCALES =
  /^--(space|size|radius|font|icon-size|control|breakpoint|motion|button|select|menu|modal|form|badge|toast)-/;
const APP_ONLY =
  /^--(mobile|quest|chart|ansi|collectibles|creator|steam|polls|hexagon|checkpoint|bg-animated|platform|hypesquad|lol|custom)-/;
// Reset rules that only matter inside the Discord client shell.
const APP_ONLY_SELECTOR =
  /appMount|app-mount|enable-forced-colors|grecaptcha|platform-|refresh-title-bar|custom-theme-background|adaptive-theme|fullscreen|\.overlay|high-contrast/;
const HASHED_CLASS = /[.#]-?[A-Za-z_][\w-]*?_[\w-]{6}(?![\w-])/;

const read = (file) => fs.readFileSync(path.join(ASSETS, file), 'utf8');
const html = fs.readFileSync(path.join(CACHE, 'app.html'), 'utf8');
const build = html.match(/BUILD_NUMBER":"(\d+)"/)?.[1];
const entryCss = [...html.matchAll(/href="\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
const countVars = (css) => css.match(/;--[\w-]+:/g)?.length ?? 0;
const tokenFile = entryCss.reduce((best, f) => (countVars(read(f)) > countVars(read(best)) ? f : best));
const resetFile = entryCss.find((f) =>
  /\}body\{background:transparent;font-family:var\(--font-primary\)/.test(read(f)),
);
if (!resetFile) throw new Error('reset stylesheet not found');

const varRefs = (value) => [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
const collectCss = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : collectCss(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });

// 1. Gather variable definitions, grouped by the selector that defines them.
const blocks = new Map(); // selector -> Map(prop -> value)
const define = (selector, decl) => {
  if (!blocks.has(selector)) blocks.set(selector, new Map());
  blocks.get(selector).set(decl.prop, decl.value);
};
const addVarRules = (root) =>
  root.each((node) => {
    if (node.type !== 'rule' || !KEPT_SELECTORS.has(node.selector)) return;
    node.walkDecls((decl) => decl.prop.startsWith('--') && define(node.selector, decl));
  });

const tokenRoot = postcss.parse(read(tokenFile));
addVarRules(tokenRoot);
for (const file of entryCss.filter((f) => f !== tokenFile)) addVarRules(postcss.parse(read(file)));

// 2. Decide what to keep, starting from roots and following var() references.
const keep = new Set();
const queue = [];
const mark = (prop) => {
  if (keep.has(prop)) return;
  keep.add(prop);
  queue.push(prop);
};
for (const [selector, vars] of blocks) {
  for (const prop of vars.keys()) {
    const isThemeToken = selector.startsWith('.theme-') && !APP_ONLY.test(prop);
    if (isThemeToken || (selector === ':root' && ROOT_SCALES.test(prop))) mark(prop);
  }
}

const resetRoot = postcss.root();
postcss.parse(read(resetFile)).each((node) => {
  if (node.type === 'rule' && (HASHED_CLASS.test(node.selector) || APP_ONLY_SELECTOR.test(node.selector))) return;
  if (node.type === 'rule' && node.nodes.every((d) => d.type !== 'decl' || d.prop.startsWith('--'))) return;
  if (node.type === 'atrule' && node.name === 'media') {
    const copy = node.clone();
    copy.each((child) => {
      if (child.type === 'rule' && (HASHED_CLASS.test(child.selector) || APP_ONLY_SELECTOR.test(child.selector)))
        child.remove();
    });
    if (copy.nodes.length) resetRoot.append(copy);
    return;
  }
  if (node.type === 'rule') resetRoot.append(node.clone());
});
resetRoot.walkDecls((d) => varRefs(d.value).forEach(mark));

const ownCss = collectCss(PACKAGES).filter((f) => !f.startsWith(OUT));
for (const file of ownCss)
  postcss.parse(fs.readFileSync(file, 'utf8')).walkDecls((d) => varRefs(d.value).forEach(mark));

while (queue.length) {
  const prop = queue.pop();
  for (const vars of blocks.values()) if (vars.has(prop)) varRefs(vars.get(prop)).forEach(mark);
}

// 3. Emit primitives.css and one file per theme. Discord always sets .visual-refresh, so its
// palette overrides are folded into :root; the shared .theme-darker,.theme-midnight block has no
// overlap with either theme and is merged into both.
const merged = (...selectors) => {
  const out = new Map();
  for (const selector of selectors) for (const [prop, value] of blocks.get(selector) ?? []) out.set(prop, value);
  return [...out].filter(([prop]) => keep.has(prop));
};
const block = (selector, decls) =>
  decls.length ? `${selector} {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}\n\n` : '';

let primitivesCss = block(':root', merged(':root', '.visual-refresh'));
for (const density of ['compact', 'cozy', 'default']) {
  primitivesCss += block(`.density-${density}`, merged(`.density-${density}`));
}
// Font stacks change for some scripts; these blocks are tiny and selector-specific.
tokenRoot.walkRules((rule) => {
  if (rule.parent.type === 'root' && /^:root:lang\(/.test(rule.selector)) primitivesCss += `${rule.toString()}\n`;
});
const themeFiles = {
  light: block('.theme-light', merged('.theme-light')),
  ash: block('.theme-dark', merged('.theme-dark')),
  dark: block('.theme-darker', merged('.theme-darker', '.theme-darker,.theme-midnight')),
  onyx: block('.theme-midnight', merged('.theme-midnight', '.theme-darker,.theme-midnight')),
};

// 4. Fonts, copied under readable names.
const fontsRoot = postcss.root();
fs.rmSync(path.join(OUT, 'fonts'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
const downloads = [];
tokenRoot.walkAtRules('font-face', (rule) => {
  const get = (prop) => {
    let value;
    rule.walkDecls(prop, (d) => (value = d.value.replace(/^["']|["']$/g, '')));
    return value;
  };
  const family = get('font-family');
  if (!FONT_FAMILIES.has(family)) return;
  const name = `${family.toLowerCase().replace(/\s+/g, '-')}-${get('font-weight') ?? '400'}${get('font-style') === 'italic' ? '-italic' : ''}`;
  const copy = rule.clone();
  copy.walkDecls('src', (d) => {
    d.value = d.value.replace(/url\("?\/assets\/([^")]+?)(\.\w+)"?\)/g, (_, file, ext) => {
      downloads.push({ file: `${file}${ext}`, name: `${name}${ext}` });
      return `url("./fonts/${name}${ext}")`;
    });
  });
  fontsRoot.append(copy);
});
for (const { file, name } of downloads) {
  const cached = path.join(ASSETS, file);
  let data = fs.existsSync(cached) ? fs.readFileSync(cached) : null;
  if (!data) {
    const res = await fetch(`${ORIGIN}/assets/${file}`);
    if (!res.ok) throw new Error(`font ${file}: ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
  }
  fs.writeFileSync(path.join(OUT, 'fonts', name), data);
}

const format = (css) => prettier.format(css, { parser: 'css', printWidth: 120 });
const header = `/* Generated by scripts/extract-tokens.mjs from Discord build ${build}. Do not edit by hand. */\n\n`;
fs.rmSync(path.join(OUT, 'tokens.css'), { force: true });
fs.writeFileSync(path.join(OUT, 'primitives.css'), header + (await format(primitivesCss)));
fs.mkdirSync(path.join(OUT, 'themes'), { recursive: true });
for (const [name, css] of Object.entries(themeFiles)) {
  fs.writeFileSync(path.join(OUT, 'themes', `${name}.css`), header + (await format(css)));
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), header + (await format(fontsRoot.toString())));
fs.writeFileSync(path.join(OUT, 'base.css'), header + (await format(resetRoot.toString())));

const total = [...blocks.values()].reduce((n, vars) => n + vars.size, 0);
console.log(`kept ${keep.size} of ${total} variable definitions, ${downloads.length} font files`);
