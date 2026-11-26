// Serves Discord's own modules from .cache so the original components can be rendered in a browser
// and compared against ours.
//
//   node scripts/reference/server.mjs [port]
//
//   /                     blank page with the webpack runtime, all boot stylesheets and window.ref helpers
//   /story/<collection>/<story-id>?prop=value
//                         renders a story from Discord's component playground config
//   /closure.js?ids=1,2   the static dependency closure of the given modules
//   /assets/*             raw build assets (fonts, images, lazy chunks)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import * as acorn from 'acorn';

const ROOT = path.resolve('.cache');
const ASSETS = path.join(ROOT, 'assets');
const MODULES = path.join(ROOT, 'modules');
const PORT = Number(process.argv[2] ?? 5174);
const ORIGIN = process.env.DISCORD_ORIGIN ?? 'https://canary.discord.com';

const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const entryJs =
  html.match(/src="\/assets\/(web\.[\w.]+\.js)"/)?.[1] ?? fs.readdirSync(ASSETS).find((f) => /^web\..*\.js$/.test(f));
const webJs = fs.readFileSync(path.join(ASSETS, entryJs), 'utf8');
const globalEnv = html.match(/window\.GLOBAL_ENV = (\{.*?\});?\s*<\/script>/s)?.[1];
const stylesheets = [...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)].map((m) => m[1]);

// Pull the chunk-url functions (`p.u=e=>…`, `p.k=e=>…`) straight out of the runtime so lazy chunks
// resolve to exactly the files the real client would load.
const extractFn = (marker) => {
  const start = webJs.indexOf(marker);
  if (start < 0) throw new Error(`runtime marker ${marker} not found`);
  const fnStart = start + marker.indexOf('=') + 1;
  const parsed = acorn.parseExpressionAt(webJs, fnStart, { ecmaVersion: 'latest' });
  const node = parsed.type === 'SequenceExpression' ? parsed.expressions[0] : parsed;
  return webJs.slice(node.start, node.end);
};
const chunkJsUrl = extractFn('p.u=e=>{if(');
const chunkCssUrl = extractFn('p.k=e=>{if(');

// Modules the app root wrapper needs (accessibility, Mana and theme contexts, focus rings, and the
// app's layers: the App and Verification layer providers/containers, the modal stack, the
// #popover-portal target and the class that makes their wrappers display: contents), plus the
// app's dynamic graphic components and the dispatchers the Escape keybind talks to.
const APP_ROOT_MODULES = [
  '844222',
  '116711',
  '86182',
  '559106',
  '750506',
  '80556',
  '638495',
  '337836',
  '638274',
  '116833',
  '188567',
  '267102',
  '616667',
];

// Playground configs and the webpack module that exposes them.
const playgroundModules = { mana: '352611', void: '352611', payments: '582695', nitro: '582695', identity: '582695' };

const requireName = (src) => src.match(/^\/\/.*\n\((?:function)?\s*\(([\w$]*),?([\w$]*),?([\w$]*)\)/)?.[3];
const depCache = new Map();
const deps = (id) => {
  if (depCache.has(id)) return depCache.get(id);
  const file = path.join(MODULES, `${id}.js`);
  let result = [];
  if (fs.existsSync(file)) {
    const src = fs.readFileSync(file, 'utf8');
    const req = requireName(src);
    if (req) {
      const re = new RegExp(`(?<![\\w$.])${req.replace(/\$/g, '\\$')}\\((\\d+)\\)`, 'g');
      result = [...new Set([...src.matchAll(re)].map((m) => m[1]))];
    }
  }
  depCache.set(id, result);
  return result;
};
const closure = (ids) => {
  const seen = new Set();
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...deps(id));
  }
  return [...seen].filter((id) => fs.existsSync(path.join(MODULES, `${id}.js`)));
};
// CSS of lazily loaded chunks isn't among the boot stylesheets; find it through the class-map
// modules in the closure (their `_abcdef` suffix) so those components render styled.
const cssFiles = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.css'));
const entryCss = new Set(stylesheets.map((href) => path.basename(href)));
const cssBySuffix = new Map();
const stylesheetsFor = (suffix) => {
  if (!cssBySuffix.has(suffix)) {
    const needle = `_${suffix}`;
    cssBySuffix.set(
      suffix,
      cssFiles.filter((f) => !entryCss.has(f) && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes(needle)),
    );
  }
  return cssBySuffix.get(suffix);
};
const closureJs = (ids) => {
  const lazyCss = new Set();
  const parts = closure(ids).map((id) => {
    const src = fs.readFileSync(path.join(MODULES, `${id}.js`), 'utf8').replace(/^\/\/.*\n/, '');
    if (/exports=\{/.test(src)) {
      for (const [, suffix] of src.matchAll(/"[\w/-]+_([\w-]{6})"/g))
        stylesheetsFor(suffix).forEach((f) => lazyCss.add(f));
    }
    return `${JSON.stringify(id)}:${src.trim().replace(/;$/, '')}`;
  });
  const links = [...lazyCss].map(
    (f) =>
      `if (!document.querySelector('link[href="/assets/${f}"]')) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/assets/${f}' }));`,
  );
  return `${links.join('\n')}\nself.__ref.register({${parts.join(',\n')}});\n`;
};

const runtime = `
window.GLOBAL_ENV = ${globalEnv};
window.__OVERLAY__ = false;
window.__BILLING_STANDALONE__ = false;
(() => {
  const modules = {};
  const cache = {};
  const req = (id) => {
    id = String(id);
    if (cache[id]) return cache[id].exports;
    // Modules reached only through a require context (e.g. emoji images by code point) aren't in the
    // static closure; fetch them on demand.
    if (!modules[id]) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/closure.js?ids=' + id, false);
      xhr.send();
      if (xhr.status === 200) (0, eval)(xhr.responseText);
    }
    const factory = modules[id];
    // A handful of ids are required at the top of a chunk but never defined in the build.
    if (!factory) { console.warn('module ' + id + ' is not in the build, stubbing it'); return {}; }
    const module = (cache[id] = { id, loaded: false, exports: {} });
    factory.call(module.exports, module, module.exports, req);
    module.loaded = true;
    return module.exports;
  };
  req.m = modules;
  req.c = cache;
  req.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
  req.d = (e, t, n) => {
    const def = (src, kind) => { for (const k in src) if (req.o(src, k) && !req.o(e, k)) Object.defineProperty(e, k, { enumerable: true, [kind]: src[k] }); };
    def(t ?? {}, 'get');
    def(n ?? {}, 'value');
  };
  req.r = (e) => {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' });
    Object.defineProperty(e, '__esModule', { value: true });
  };
  req.n = (e) => { const t = e && e.__esModule ? () => e.default : () => e; req.d(t, { a: t }); return t; };
  const proto = Object.getPrototypeOf;
  let leaf;
  req.t = function (e, t) {
    if (1 & t) e = this(e);
    if (8 & t) return e;
    if (typeof e === 'object' && e && ((4 & t && e.__esModule) || (16 & t && typeof e.then === 'function'))) return e;
    const ns = Object.create(null); req.r(ns); const getters = {};
    leaf = leaf || [null, proto({}), proto([]), proto(proto)];
    for (let cur = 2 & t && e; (typeof cur === 'object' || typeof cur === 'function') && !~leaf.indexOf(cur); cur = proto(cur))
      Object.getOwnPropertyNames(cur).forEach((k) => (getters[k] = () => e[k]));
    getters.default = () => e; req.d(ns, getters); return ns;
  };
  req.g = globalThis;
  req.p = '/assets/';
  req.b = document.baseURI;
  req.nmd = (e) => ((e.paths = []), e.children || (e.children = []), e);
  req.hmd = (e) => ((e = Object.create(e)).children || (e.children = []), e);
  req.u = ${chunkJsUrl};
  req.k = ${chunkCssUrl};
  const loading = {};
  const load = (tag, attrs) => new Promise((resolve) => { const el = document.createElement(tag); Object.assign(el, attrs); el.onload = el.onerror = () => resolve(); document.head.appendChild(el); });
  req.e = (chunk) => (loading[chunk] ??= Promise.all([
    load('script', { src: '/assets/' + req.u(chunk) }),
    req.k(chunk) ? load('link', { rel: 'stylesheet', href: '/assets/' + req.k(chunk) }) : null,
  ]));
  req.f = {};
  const register = (map) => { for (const id in map) if (!modules[id]) modules[id] = map[id]; };
  const jsonp = (self.webpackChunkdiscord_app = self.webpackChunkdiscord_app || []);
  jsonp.push = ([, map]) => register(map);
  const loadClosure = async (ids) => { await load('script', { src: '/closure.js?ids=' + ids.join(',') }); };
  window.__ref = { req, modules, register, loadClosure };
})();
`;

const page = (body) => `<!doctype html>
<html lang="en-US" class="theme-darker platform-web density-default visual-refresh full-motion mouse-mode has-webkit-scrollbar">
<head><meta charset="utf-8"><title>reference</title>
${stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
<script src="/runtime.js"></script>
</head>
<body><div id="app-mount"><div id="root"></div></div>${body}</body></html>`;

// 582128 is react, 379800 is react-dom/client. Everything rendered is wrapped in the providers
// Discord's client puts around the app (see appRoot below).
const helpers = `
<script>
window.ref = (() => {
  const { req, loadClosure } = window.__ref;
  let React, ReactDOM, root, lastElement = null, keyboardMode = false;
  const boot = async (ids) => {
    await loadClosure(['582128', '379800', ...${JSON.stringify(APP_ROOT_MODULES)}, ...ids]);
    React = req('582128');
    ReactDOM = req('379800');
    root = ReactDOM.createRoot(document.getElementById('root'));
  };
  // Mirrors the client's root: accessibility settings (844222), the Mana context (116711, with the
  // app's dynamic graphic components from 116833) and the theme context (86182) for the current
  // theme, a focus ring scope (559106) over document.body, and the App and Verification layers
  // (750506, 80556) with the modal stack (638495) after the app content, followed by the
  // #popover-portal target (337836) and the layer containers inside two display: contents wrappers
  // (638274), then the app's toast container (616667).
  const appRoot = (element) => {
    const h = React.createElement;
    const theme = document.documentElement.className.match(/theme-(\\w+)/)?.[1] ?? 'darker';
    const a11y = req('844222').C;
    const mana = req('116711');
    const a11yValue = { ...a11y._currentValue, reducedMotion: { enabled: matchMedia('(prefers-reduced-motion: reduce)').matches, rawValue: 'auto' }, keyboardModeEnabled: keyboardMode, minToastDurationMs: 3000 };
    const layers = req('750506');
    const verification = req('80556');
    const contents = req('638274').P;
    const manaValue = { ...mana.VO._currentValue, theme, saturation: 1, experiments: { enabledExperiments: experiments }, defaultLayerContext: layers.uY, dynamicGraphicComponents: req('116833').Q };
    return h(a11y.Provider, { value: a11yValue },
      h(mana.GE, { value: manaValue },
        h(req('86182').w, { theme },
          h(req('559106').xp, { containerRef: { current: document.body } },
            h(layers.Yf, null,
              h(verification.ks, null,
                element,
                h(req('638495').b),
                h('div', { className: contents },
                  h('div', { className: contents }, h(req('337836').P), h(layers.C8), h(verification.ok)))),
              h(req('616667').N, { appContext: 'APP' }))))));
  };
  const rerender = () => root.render(appRoot(lastElement));
  const render = (element) => new Promise((resolve) => { lastElement = element; rerender(); setTimeout(resolve, 50); });
  const setTheme = (theme) => { document.documentElement.className = document.documentElement.className.replace(/theme-\\w+/, 'theme-' + theme); };
  // Client experiments that switch on through a root class plus ManaContext, like the playground's ?experiments=.
  let experiments = [];
  const setExperiments = (names) => {
    experiments.forEach((name) => document.documentElement.classList.remove(name));
    experiments = names;
    experiments.forEach((name) => document.documentElement.classList.add(name));
  };
  // Translations load lazily per chunk; wait for the English strings of every loader that's been required.
  const loadTranslations = async () => {
    const loaders = new Set();
    for (const module of Object.values(req.c)) {
      const exports = module.exports;
      if (exports == null || typeof exports !== 'object') continue;
      for (const key of Object.keys(exports)) {
        let value;
        try { value = exports[key]; } catch { continue; }
        if (value != null && typeof value === 'object' && Object.getOwnPropertyNames(value).includes('localeImportMap')) loaders.add(value);
      }
    }
    await Promise.all([...loaders].map((loader) => Promise.resolve(loader.waitForDefaultLocale()).catch(() => {})));
  };
  // The client's keyboard mode: navigation keys switch focus rings on, a mouse press switches them off.
  const NAV_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'F6']);
  const setKeyboardMode = (enabled) => {
    if (enabled === keyboardMode || !root) return;
    keyboardMode = enabled;
    const rings = req('559106').oP;
    rings.setRingsEnabled(enabled);
    enabled ? rings.enableAnimationTracking() : rings.disableAnimationTracking();
    document.documentElement.classList.toggle('keyboard-mode', enabled);
    document.documentElement.classList.toggle('mouse-mode', !enabled);
    rerender();
  };
  const isTextField = (el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable;
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key !== 'Tab' && (e.shiftKey || isTextField(document.activeElement))) return;
    if (NAV_KEYS.has(e.key)) setKeyboardMode(true);
  }, true);
  window.addEventListener('mousedown', () => setKeyboardMode(false), true);
  // The client's global Escape keybind (92960): the media viewer first, then popouts, the modal
  // stack and popouts that were open below modals. Popouts use the default window dispatcher here.
  // Bound on the window, like the client's key binding library.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !root) return;
    const global = req('188567')._;
    const popouts = req('267102').Uw;
    const steps = [[global, 'MEDIA_MODAL_CLOSE'], [popouts, 'POPOUT_CLOSE'], [global, 'MODAL_CLOSE'], [popouts, 'POPOUT_CLOSE_AFTER_MODALS']];
    const step = steps.find(([dispatcher, action]) => dispatcher.hasSubscribers(action));
    if (step == null) return;
    step[0].dispatch(step[1]);
    e.preventDefault();
    e.stopPropagation();
  });
  // Stories gated on an Apex experiment (useConfig) read the experiment store, not ManaContext. Force a
  // session override for each named experiment the loaded modules registered: its first variation whose
  // config is enabled, or else its first non-default variation.
  const overrideApexExperiments = (names) => {
    const store = req('340344').A;
    const registered = store.getRegisteredExperiments();
    for (const name of names) {
      const variations = registered[name]?.variations;
      if (variations == null) continue;
      const ids = Object.keys(variations);
      const id = ids.find((key) => variations[key]?.enabled === true) ?? ids.find((key) => key !== '0') ?? ids[0];
      if (id != null) store.createSessionOverride(name, Number(id));
    }
  };
  return { boot, render, setTheme, setExperiments, overrideApexExperiments, loadTranslations, req, get React() { return React; } };
})();
</script>`;

const storyScript = (collection, storyId) => `
<script type="module">
const params = Object.fromEntries(new URLSearchParams(location.search));
if (params.theme) ref.setTheme(params.theme);
if (params.experiments) ref.setExperiments(params.experiments.split(','));
const configModule = ${JSON.stringify(playgroundModules[collection])};
await ref.boot([configModule]);
const exports = ref.req(configModule);
if (params.experiments) ref.overrideApexExperiments(params.experiments.split(','));
const config = Object.values(exports).find((c) => c?.collections?.some((col) => col.id === ${JSON.stringify(collection)}));
const col = config.collections.find((c) => c.id === ${JSON.stringify(collection)});
const story = col.groups.flatMap((g) => g.stories).find((s) => s.id === ${JSON.stringify(storyId)});
if (!story) throw new Error('story not found');
const props = {};
for (const [key, control] of Object.entries(story.controls ?? {})) {
  let value = control.defaultValue;
  if (key in params) {
    const raw = params[key];
    value = control.type === 'boolean' ? raw === 'true'
      : control.type === 'number' || control.type === 'slider' ? Number(raw)
      : control.type === 'select' ? (control.options.find((o) => String(o.value) === raw)?.value ?? control.defaultValue)
      : raw;
  }
  props[key] = value;
}
await ref.loadTranslations();
const React = ref.React;
const el = React.createElement('div', { 'data-story': story.id, style: { padding: 24 } }, React.createElement(story.component, props));
await ref.render(col.Provider ? React.createElement(col.Provider, null, el) : el);
window.__storyReady = true;
</script>`;

const send = (res, status, type, body) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    try {
      if (url.pathname === '/') return send(res, 200, 'text/html', page(helpers));
      if (url.pathname === '/runtime.js') return send(res, 200, 'text/javascript', runtime);
      if (url.pathname === '/closure.js') {
        const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
        return send(res, 200, 'text/javascript', closureJs(ids));
      }
      const story = url.pathname.match(/^\/story\/([\w-]+)\/([\w-]+)$/);
      if (story) return send(res, 200, 'text/html', page(helpers + storyScript(story[1], story[2])));
      if (url.pathname.startsWith('/assets/')) {
        const file = path.join(ASSETS, path.basename(url.pathname));
        if (!fs.existsSync(file)) {
          // Fonts and images referenced only from CSS aren't crawled by fetch-assets; pull them on demand.
          const upstream = await fetch(`${ORIGIN}${url.pathname}`);
          if (!upstream.ok) return send(res, 404, 'text/plain', 'not found');
          fs.writeFileSync(file, Buffer.from(await upstream.arrayBuffer()));
        }
        const ext = path.extname(file);
        const types = {
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.woff2': 'font/woff2',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.wasm': 'application/wasm',
        };
        return send(res, 200, types[ext] ?? 'application/octet-stream', fs.readFileSync(file));
      }
      send(res, 404, 'text/plain', 'not found');
    } catch (error) {
      send(res, 500, 'text/plain', String(error?.stack ?? error));
    }
  })
  .listen(PORT, () => console.log(`reference server on http://localhost:${PORT}`));
