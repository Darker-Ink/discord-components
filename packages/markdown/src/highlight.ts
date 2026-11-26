// Code block syntax highlighting. The client highlights with Arborium (tree-sitter grammars compiled to
// WebAssembly), loading each language's grammar the first time a code block uses it. The same library and its
// grammars are npm packages (`@arborium/arborium`, `@arborium/<language>`); apps install the ones they want and
// import `@discord-mana/markdown/languages/<language>` (or `/languages/all`), which registers them here. Each
// grammar is a lazy chunk of the app's bundle. Without a registered language, its code stays plain text. Apps can
// plug in another engine with `setCodeHighlighter`.

export const HIGHLIGHT_LANGUAGES = new Set([
  'ada',
  'agda',
  'ansi',
  'asciidoc',
  'asm',
  'awk',
  'bash',
  'batch',
  'c',
  'c-sharp',
  'caddy',
  'capnp',
  'cedar',
  'cedarschema',
  'clojure',
  'cmake',
  'commonlisp',
  'cpp',
  'css',
  'd',
  'dart',
  'devicetree',
  'diff',
  'dockerfile',
  'dot',
  'elisp',
  'elixir',
  'elm',
  'erlang',
  'fish',
  'fsharp',
  'gleam',
  'glsl',
  'go',
  'graphql',
  'groovy',
  'haskell',
  'hcl',
  'hlsl',
  'html',
  'idris',
  'ini',
  'java',
  'javascript',
  'jinja2',
  'jq',
  'json',
  'julia',
  'kotlin',
  'lean',
  'lua',
  'luau',
  'markdown',
  'markdown_inline',
  'matlab',
  'meson',
  'ninja',
  'nix',
  'objc',
  'ocaml',
  'perl',
  'php',
  'postscript',
  'powershell',
  'prolog',
  'python',
  'query',
  'r',
  'rego',
  'rescript',
  'ron',
  'ruby',
  'rust',
  'scala',
  'scheme',
  'scss',
  'solidity',
  'sparql',
  'sql',
  'ssh-config',
  'starlark',
  'styx',
  'svelte',
  'swift',
  'textproto',
  'thrift',
  'tlaplus',
  'toml',
  'tsx',
  'typescript',
  'typst',
  'verilog',
  'vhdl',
  'vim',
  'vue',
  'wit',
  'x86asm',
  'xml',
  'yaml',
  'yuri',
  'zig',
  'zsh',
]);

export const HIGHLIGHT_LANGUAGE_ALIASES: Record<string, string> = {
  h: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  hxx: 'cpp',
  'h++': 'cpp',
  hh: 'cpp',
  arduino: 'cpp',
  js: 'javascript',
  node: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  rs: 'rust',
  cs: 'c-sharp',
  csharp: 'c-sharp',
  'c#': 'c-sharp',
  yml: 'yaml',
  docker: 'dockerfile',
  gql: 'graphql',
  hbs: 'html',
  htm: 'html',
  xhtml: 'html',
  handlebars: 'html',
  'html.hbs': 'html',
  'html.handlebars': 'html',
  htmlbars: 'html',
  erb: 'html',
  twig: 'html',
  craftcms: 'html',
  xsl: 'xml',
  rss: 'xml',
  atom: 'xml',
  xsd: 'xml',
  plist: 'xml',
  svg: 'xml',
  mathml: 'xml',
  xjb: 'xml',
  wsf: 'xml',
  less: 'css',
  kt: 'kotlin',
  kts: 'kotlin',
  pl: 'perl',
  pm: 'perl',
  ps: 'powershell',
  ps1: 'powershell',
  psm1: 'powershell',
  psd1: 'powershell',
  pwsh: 'powershell',
  tf: 'hcl',
  tfvars: 'hcl',
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  shellsession: 'bash',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  fs: 'fsharp',
  'f#': 'fsharp',
  ml: 'ocaml',
  mli: 'ocaml',
  sml: 'ocaml',
  re: 'rescript',
  reasonml: 'rescript',
  scm: 'scheme',
  rkt: 'scheme',
  clj: 'clojure',
  edn: 'clojure',
  rb: 'ruby',
  cr: 'ruby',
  crystal: 'ruby',
  gemspec: 'ruby',
  podspec: 'ruby',
  irb: 'ruby',
  thor: 'ruby',
  v: 'verilog',
  sv: 'verilog',
  svh: 'verilog',
  objectivec: 'objc',
  mm: 'objc',
  'obj-c': 'objc',
  'obj-c++': 'objc',
  'objective-c++': 'objc',
  dos: 'batch',
  bat: 'batch',
  cmd: 'batch',
  lisp: 'commonlisp',
  capnproto: 'capnp',
  dts: 'devicetree',
  adoc: 'asciidoc',
  patch: 'diff',
  golang: 'go',
  jinja: 'jinja2',
  django: 'jinja2',
  jsp: 'java',
  nixos: 'nix',
  arm: 'asm',
  mips: 'asm',
  armasm: 'asm',
  mipsasm: 'asm',
  avrasm: 'asm',
  pgsql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  n1ql: 'sql',
  gradle: 'groovy',
  'php-template': 'php',
  'cmake.in': 'cmake',
  md: 'markdown',
  mkdown: 'markdown',
  mkd: 'markdown',
  py: 'python',
  gyp: 'python',
  ipython: 'python',
  jsonc: 'json',
  'python-repl': 'python',
  pycon: 'python',
  'node-repl': 'javascript',
  'clojure-repl': 'clojure',
  'erlang-repl': 'erlang',
  'julia-repl': 'julia',
  jldoctest: 'julia',
};

const LANGUAGE_RE = /^[a-z0-9_+\-.#]+$/;

/** The grammar a code block's language tag selects, or undefined when it isn't highlighted. */
export const normalizeCodeLanguage = (lang: string | null | undefined) => {
  if (lang == null) return undefined;
  const lower = lang.toLowerCase();
  if (!LANGUAGE_RE.test(lower)) return undefined;
  if (HIGHLIGHT_LANGUAGES.has(lower)) return lower;
  const alias = HIGHLIGHT_LANGUAGE_ALIASES[lower];
  if (alias != null && HIGHLIGHT_LANGUAGES.has(alias)) return alias;
  return undefined;
};

/** Very long code (over 10,000 characters or a 1,000 character line) isn't highlighted. */
export const isHighlightable = (code: string) => {
  if (code.length > 1e4) return false;
  for (const line of code.split('\n')) if (line.length > 1e3) return false;
  return true;
};

/** A loaded grammar: turns code into HTML with Arborium's custom elements (`<a-k>`, `<a-s>`…). */
export interface CodeGrammar {
  highlightToHtml: (code: string) => string | Promise<string>;
}

export interface CodeHighlighter {
  /** Loads a language's grammar; resolves to null when the language can't be highlighted. */
  loadGrammar: (language: string) => Promise<CodeGrammar | null>;
}

/** An Arborium grammar package's module (`@arborium/<language>/grammar.js`). */
export interface CodeGrammarModule {
  default: (options: { module_or_path: unknown }) => Promise<unknown>;
  language_id: () => string;
  injection_languages: () => string[];
}

/** How to load one language: its grammar module and the URL of its WebAssembly. */
export interface CodeLanguageLoader {
  js: () => Promise<CodeGrammarModule>;
  wasm: () => URL;
}

/** Loads Arborium itself (`@arborium/arborium`, its host module and the host's WebAssembly). */
export interface CodeHighlighterHost {
  arborium: () => Promise<unknown>;
  hostJs: () => Promise<unknown>;
  hostWasm: () => URL;
}

interface ArboriumModule {
  setConfig: (config: Record<string, unknown>) => void;
  loadGrammar: (language: string) => Promise<{ highlight: (source: string) => string | Promise<string> } | null>;
}

const languages = new Map<string, CodeLanguageLoader>();
let host: CodeHighlighterHost | null = null;
let arboriumModule: Promise<ArboriumModule> | null = null;

const UNREGISTERED = 'language not registered';

// Arborium's loader fetches its host and grammars from a CDN by default; every resolver points it at the
// registered packages instead.
const loadArborium = (registered: CodeHighlighterHost) =>
  (arboriumModule ??= registered.arborium().then((module) => {
    const arborium = module as ArboriumModule;
    arborium.setConfig({
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      resolveHostJs: () => registered.hostJs(),
      resolveHostWasm: () => fetch(registered.hostWasm()),
      resolveJs: ({ language }: { language: string }) => {
        const loader = languages.get(language);
        return loader != null ? loader.js() : Promise.reject(new Error(UNREGISTERED));
      },
      resolveWasm: ({ language }: { language: string }) => {
        const loader = languages.get(language);
        return loader != null ? fetch(loader.wasm()) : Promise.reject(new Error(UNREGISTERED));
      },
    });
    return arborium;
  }));

/** Registers Arborium (done by the `languages/*` entries, which import it). */
export const registerCodeHighlighterHost = (next: CodeHighlighterHost) => {
  host ??= next;
};

/** Registers a language's Arborium grammar (done by `@discord-mana/markdown/languages/<language>`). */
export const registerCodeLanguage = (name: string, loader: CodeLanguageLoader) => {
  languages.set(name, loader);
  // A code block may have looked the language up before it was registered.
  grammars.delete(name);
  for (const key of htmlCache.keys()) if (key.startsWith(`${name}\0`)) htmlCache.delete(key);
};

/** The languages registered for highlighting. */
export const getRegisteredCodeLanguages = () => [...languages.keys()];

/** Highlights with Arborium and the grammars registered through the `languages/*` entries. */
export const arboriumHighlighter: CodeHighlighter = {
  loadGrammar: async (language) => {
    if (host == null || !languages.has(language)) return null;
    try {
      const arborium = await loadArborium(host);
      const grammar = await arborium.loadGrammar(language);
      return grammar == null ? null : { highlightToHtml: (code) => grammar.highlight(code) };
    } catch {
      return null;
    }
  },
};

let highlighter: CodeHighlighter | null = arboriumHighlighter;
const grammars = new Map<string, Promise<CodeGrammar | null>>();

/** Replaces the code block highlighter (null turns highlighting off). */
export const setCodeHighlighter = (next: CodeHighlighter | null) => {
  highlighter = next;
  grammars.clear();
  htmlCache.clear();
};

export const loadCodeGrammar = (language: string) => {
  let grammar = grammars.get(language);
  if (grammar == null) {
    grammar = highlighter == null ? Promise.resolve(null) : highlighter.loadGrammar(language).catch(() => null);
    grammars.set(language, grammar);
  }
  return grammar;
};

const HTML_CACHE_SIZE = 256;
const htmlCache = new Map<string, Promise<string | null>>();

/** The highlighted HTML of the code; the client highlights a trailing newline-terminated copy. */
export const highlightCode = (language: string, code: string): Promise<string | null> => {
  const key = `${language}\0${code}`;
  let html = htmlCache.get(key);
  if (html == null) {
    html = loadCodeGrammar(language).then(async (grammar) => {
      if (grammar == null || !isHighlightable(code)) return null;
      try {
        return await grammar.highlightToHtml(code.endsWith('\n') ? code : `${code}\n`);
      } catch {
        return null;
      }
    });
    if (htmlCache.size >= HTML_CACHE_SIZE) htmlCache.delete(htmlCache.keys().next().value!);
    htmlCache.set(key, html);
  }
  return html;
};
