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
// Experiments the client switches on with a root class; their token overrides are kept under that
// class (e.g. `.mana-badge-refresh .theme-light,.mana-badge-refresh.theme-light`).
const ROOT_CLASS_EXPERIMENTS = ['mana-badge-refresh'];
const experimentSelector = (experiment, themes) =>
  [...themes.map((t) => `.${experiment} .theme-${t}`), ...themes.map((t) => `.${experiment}.theme-${t}`)].join(',');
const KEPT_SELECTORS = new Set([
  ':root',
  ...ROOT_CLASS_EXPERIMENTS.flatMap((e) => [
    `.${e}`,
    ...['light', 'dark', 'darker', 'midnight'].map((t) => experimentSelector(e, [t])),
    experimentSelector(e, ['darker', 'midnight']),
  ]),
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

// Keeps only the selectors of a rule that apply outside the client shell, e.g. `.appMount_x, body` -> `body`.
const globalPart = (rule) => {
  const selectors = rule.selectors.filter((s) => !HASHED_CLASS.test(s) && !APP_ONLY_SELECTOR.test(s));
  return selectors.length ? rule.clone({ selectors }) : null;
};
const resetRoot = postcss.root();
postcss.parse(read(resetFile)).each((node) => {
  if (node.type === 'rule') {
    if (node.nodes.every((d) => d.type !== 'decl' || d.prop.startsWith('--'))) return;
    const rule = globalPart(node);
    if (rule) resetRoot.append(rule);
  } else if (node.type === 'atrule' && node.name === 'media') {
    const copy = node.clone({ nodes: [] });
    node.each((child) => {
      const rule = child.type === 'rule' ? globalPart(child) : null;
      if (rule) copy.append(rule);
    });
    if (copy.nodes.length) resetRoot.append(copy);
  }
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
for (const experiment of ROOT_CLASS_EXPERIMENTS) primitivesCss += block(`.${experiment}`, merged(`.${experiment}`));
const themeBlocks = (theme, ...shared) =>
  block(
    `.theme-${theme}`,
    merged(`.theme-${theme}`, ...shared.map((group) => group.map((t) => `.theme-${t}`).join(','))),
  ) +
  ROOT_CLASS_EXPERIMENTS.map((e) =>
    block(
      experimentSelector(e, [theme]),
      merged(experimentSelector(e, [theme]), ...shared.map((g) => experimentSelector(e, g))),
    ),
  ).join('');
const themeFiles = {
  light: themeBlocks('light'),
  ash: themeBlocks('dark'),
  dark: themeBlocks('darker', ['darker', 'midnight']),
  onyx: themeBlocks('midnight', ['darker', 'midnight']),
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

const prettierConfig = (await prettier.resolveConfig(path.join(OUT, 'index.ts'))) ?? {};
const format = (css) => prettier.format(css, { ...prettierConfig, parser: 'css' });
const header = `/* Generated by scripts/extract-tokens.mjs from Discord build ${build}. Do not edit by hand. */\n\n`;
fs.rmSync(path.join(OUT, 'tokens.css'), { force: true });
fs.writeFileSync(path.join(OUT, 'primitives.css'), header + (await format(primitivesCss)));
fs.mkdirSync(path.join(OUT, 'themes'), { recursive: true });
for (const [name, css] of Object.entries(themeFiles)) {
  fs.writeFileSync(path.join(OUT, 'themes', `${name}.css`), header + (await format(css)));
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), header + (await format(fontsRoot.toString())));
fs.writeFileSync(path.join(OUT, 'base.css'), header + (await format(resetRoot.toString())));

// 5. Semantic color names (what Text's `color` prop and friends accept), from Discord's JS token
// module, limited to the ones whose variables we ship.
const tokenModule = fs.readFileSync(path.join(CACHE, 'modules', '646514.js'), 'utf8');
const semanticColors = [
  ...new Set([...tokenModule.matchAll(/[{,]([A-Z0-9_]+):\{category:"[a-z-]+"/g)].map((m) => m[1])),
]
  .map((key) => key.toLowerCase().replaceAll('_', '-'))
  .filter((name) => keep.has(`--${name}`))
  .sort();
fs.writeFileSync(
  path.join(OUT, 'colors.ts'),
  `// Generated by scripts/extract-tokens.mjs from Discord build ${build}. Do not edit by hand.\n\n` +
    (await prettier.format(
      `export const SemanticColors = ${JSON.stringify(semanticColors)} as const;\n\n` +
        `export type SemanticColor = (typeof SemanticColors)[number];\n`,
      { ...prettierConfig, parser: 'typescript' },
    )),
);

const total = [...blocks.values()].reduce((n, vars) => n + vars.size, 0);
console.log(`kept ${keep.size} of ${total} variable definitions, ${downloads.length} font files`);
