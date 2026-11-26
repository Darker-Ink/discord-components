// Arborium's grammar packages for the languages the client highlights, one lazy chunk per language. Each
// entry imports the grammar's JavaScript and points at its WebAssembly inside the installed package, so bundlers
// split them into files loaded on first use and nothing is fetched from a CDN. Discord's `luau` and
// `markdown_inline` have no package on npm; code in them stays plain.

export interface GrammarModule {
  default: (options: { module_or_path: unknown }) => Promise<unknown>;
  language_id: () => string;
  injection_languages: () => string[];
}

export interface GrammarPackage {
  js: () => Promise<GrammarModule>;
  wasm: () => URL;
}

export const GRAMMAR_PACKAGES: Record<string, GrammarPackage> = {
  ada: {
    js: () => import('@arborium/ada/grammar.js'),
    wasm: () => new URL('@arborium/ada/grammar_bg.wasm', import.meta.url),
  },
  agda: {
    js: () => import('@arborium/agda/grammar.js'),
    wasm: () => new URL('@arborium/agda/grammar_bg.wasm', import.meta.url),
  },
  asciidoc: {
    js: () => import('@arborium/asciidoc/grammar.js'),
    wasm: () => new URL('@arborium/asciidoc/grammar_bg.wasm', import.meta.url),
  },
  asm: {
    js: () => import('@arborium/asm/grammar.js'),
    wasm: () => new URL('@arborium/asm/grammar_bg.wasm', import.meta.url),
  },
  awk: {
    js: () => import('@arborium/awk/grammar.js'),
    wasm: () => new URL('@arborium/awk/grammar_bg.wasm', import.meta.url),
  },
  bash: {
    js: () => import('@arborium/bash/grammar.js'),
    wasm: () => new URL('@arborium/bash/grammar_bg.wasm', import.meta.url),
  },
  batch: {
    js: () => import('@arborium/batch/grammar.js'),
    wasm: () => new URL('@arborium/batch/grammar_bg.wasm', import.meta.url),
  },
  c: {
    js: () => import('@arborium/c/grammar.js'),
    wasm: () => new URL('@arborium/c/grammar_bg.wasm', import.meta.url),
  },
  'c-sharp': {
    js: () => import('@arborium/c-sharp/grammar.js'),
    wasm: () => new URL('@arborium/c-sharp/grammar_bg.wasm', import.meta.url),
  },
  caddy: {
    js: () => import('@arborium/caddy/grammar.js'),
    wasm: () => new URL('@arborium/caddy/grammar_bg.wasm', import.meta.url),
  },
  capnp: {
    js: () => import('@arborium/capnp/grammar.js'),
    wasm: () => new URL('@arborium/capnp/grammar_bg.wasm', import.meta.url),
  },
  cedar: {
    js: () => import('@arborium/cedar/grammar.js'),
    wasm: () => new URL('@arborium/cedar/grammar_bg.wasm', import.meta.url),
  },
  cedarschema: {
    js: () => import('@arborium/cedarschema/grammar.js'),
    wasm: () => new URL('@arborium/cedarschema/grammar_bg.wasm', import.meta.url),
  },
  clojure: {
    js: () => import('@arborium/clojure/grammar.js'),
    wasm: () => new URL('@arborium/clojure/grammar_bg.wasm', import.meta.url),
  },
  cmake: {
    js: () => import('@arborium/cmake/grammar.js'),
    wasm: () => new URL('@arborium/cmake/grammar_bg.wasm', import.meta.url),
  },
  commonlisp: {
    js: () => import('@arborium/commonlisp/grammar.js'),
    wasm: () => new URL('@arborium/commonlisp/grammar_bg.wasm', import.meta.url),
  },
  cpp: {
    js: () => import('@arborium/cpp/grammar.js'),
    wasm: () => new URL('@arborium/cpp/grammar_bg.wasm', import.meta.url),
  },
  css: {
    js: () => import('@arborium/css/grammar.js'),
    wasm: () => new URL('@arborium/css/grammar_bg.wasm', import.meta.url),
  },
  d: {
    js: () => import('@arborium/d/grammar.js'),
    wasm: () => new URL('@arborium/d/grammar_bg.wasm', import.meta.url),
  },
  dart: {
    js: () => import('@arborium/dart/grammar.js'),
    wasm: () => new URL('@arborium/dart/grammar_bg.wasm', import.meta.url),
  },
  devicetree: {
    js: () => import('@arborium/devicetree/grammar.js'),
    wasm: () => new URL('@arborium/devicetree/grammar_bg.wasm', import.meta.url),
  },
  diff: {
    js: () => import('@arborium/diff/grammar.js'),
    wasm: () => new URL('@arborium/diff/grammar_bg.wasm', import.meta.url),
  },
  dockerfile: {
    js: () => import('@arborium/dockerfile/grammar.js'),
    wasm: () => new URL('@arborium/dockerfile/grammar_bg.wasm', import.meta.url),
  },
  dot: {
    js: () => import('@arborium/dot/grammar.js'),
    wasm: () => new URL('@arborium/dot/grammar_bg.wasm', import.meta.url),
  },
  elisp: {
    js: () => import('@arborium/elisp/grammar.js'),
    wasm: () => new URL('@arborium/elisp/grammar_bg.wasm', import.meta.url),
  },
  elixir: {
    js: () => import('@arborium/elixir/grammar.js'),
    wasm: () => new URL('@arborium/elixir/grammar_bg.wasm', import.meta.url),
  },
  elm: {
    js: () => import('@arborium/elm/grammar.js'),
    wasm: () => new URL('@arborium/elm/grammar_bg.wasm', import.meta.url),
  },
  erlang: {
    js: () => import('@arborium/erlang/grammar.js'),
    wasm: () => new URL('@arborium/erlang/grammar_bg.wasm', import.meta.url),
  },
  fish: {
    js: () => import('@arborium/fish/grammar.js'),
    wasm: () => new URL('@arborium/fish/grammar_bg.wasm', import.meta.url),
  },
  fsharp: {
    js: () => import('@arborium/fsharp/grammar.js'),
    wasm: () => new URL('@arborium/fsharp/grammar_bg.wasm', import.meta.url),
  },
  gleam: {
    js: () => import('@arborium/gleam/grammar.js'),
    wasm: () => new URL('@arborium/gleam/grammar_bg.wasm', import.meta.url),
  },
  glsl: {
    js: () => import('@arborium/glsl/grammar.js'),
    wasm: () => new URL('@arborium/glsl/grammar_bg.wasm', import.meta.url),
  },
  go: {
    js: () => import('@arborium/go/grammar.js'),
    wasm: () => new URL('@arborium/go/grammar_bg.wasm', import.meta.url),
  },
  graphql: {
    js: () => import('@arborium/graphql/grammar.js'),
    wasm: () => new URL('@arborium/graphql/grammar_bg.wasm', import.meta.url),
  },
  groovy: {
    js: () => import('@arborium/groovy/grammar.js'),
    wasm: () => new URL('@arborium/groovy/grammar_bg.wasm', import.meta.url),
  },
  haskell: {
    js: () => import('@arborium/haskell/grammar.js'),
    wasm: () => new URL('@arborium/haskell/grammar_bg.wasm', import.meta.url),
  },
  hcl: {
    js: () => import('@arborium/hcl/grammar.js'),
    wasm: () => new URL('@arborium/hcl/grammar_bg.wasm', import.meta.url),
  },
  hlsl: {
    js: () => import('@arborium/hlsl/grammar.js'),
    wasm: () => new URL('@arborium/hlsl/grammar_bg.wasm', import.meta.url),
  },
  html: {
    js: () => import('@arborium/html/grammar.js'),
    wasm: () => new URL('@arborium/html/grammar_bg.wasm', import.meta.url),
  },
  idris: {
    js: () => import('@arborium/idris/grammar.js'),
    wasm: () => new URL('@arborium/idris/grammar_bg.wasm', import.meta.url),
  },
  ini: {
    js: () => import('@arborium/ini/grammar.js'),
    wasm: () => new URL('@arborium/ini/grammar_bg.wasm', import.meta.url),
  },
  java: {
    js: () => import('@arborium/java/grammar.js'),
    wasm: () => new URL('@arborium/java/grammar_bg.wasm', import.meta.url),
  },
  javascript: {
    js: () => import('@arborium/javascript/grammar.js'),
    wasm: () => new URL('@arborium/javascript/grammar_bg.wasm', import.meta.url),
  },
  jinja2: {
    js: () => import('@arborium/jinja2/grammar.js'),
    wasm: () => new URL('@arborium/jinja2/grammar_bg.wasm', import.meta.url),
  },
  jq: {
    js: () => import('@arborium/jq/grammar.js'),
    wasm: () => new URL('@arborium/jq/grammar_bg.wasm', import.meta.url),
  },
  json: {
    js: () => import('@arborium/json/grammar.js'),
    wasm: () => new URL('@arborium/json/grammar_bg.wasm', import.meta.url),
  },
  julia: {
    js: () => import('@arborium/julia/grammar.js'),
    wasm: () => new URL('@arborium/julia/grammar_bg.wasm', import.meta.url),
  },
  kotlin: {
    js: () => import('@arborium/kotlin/grammar.js'),
    wasm: () => new URL('@arborium/kotlin/grammar_bg.wasm', import.meta.url),
  },
  lean: {
    js: () => import('@arborium/lean/grammar.js'),
    wasm: () => new URL('@arborium/lean/grammar_bg.wasm', import.meta.url),
  },
  lua: {
    js: () => import('@arborium/lua/grammar.js'),
    wasm: () => new URL('@arborium/lua/grammar_bg.wasm', import.meta.url),
  },
  markdown: {
    js: () => import('@arborium/markdown/grammar.js'),
    wasm: () => new URL('@arborium/markdown/grammar_bg.wasm', import.meta.url),
  },
  matlab: {
    js: () => import('@arborium/matlab/grammar.js'),
    wasm: () => new URL('@arborium/matlab/grammar_bg.wasm', import.meta.url),
  },
  meson: {
    js: () => import('@arborium/meson/grammar.js'),
    wasm: () => new URL('@arborium/meson/grammar_bg.wasm', import.meta.url),
  },
  ninja: {
    js: () => import('@arborium/ninja/grammar.js'),
    wasm: () => new URL('@arborium/ninja/grammar_bg.wasm', import.meta.url),
  },
  nix: {
    js: () => import('@arborium/nix/grammar.js'),
    wasm: () => new URL('@arborium/nix/grammar_bg.wasm', import.meta.url),
  },
  objc: {
    js: () => import('@arborium/objc/grammar.js'),
    wasm: () => new URL('@arborium/objc/grammar_bg.wasm', import.meta.url),
  },
  ocaml: {
    js: () => import('@arborium/ocaml/grammar.js'),
    wasm: () => new URL('@arborium/ocaml/grammar_bg.wasm', import.meta.url),
  },
  perl: {
    js: () => import('@arborium/perl/grammar.js'),
    wasm: () => new URL('@arborium/perl/grammar_bg.wasm', import.meta.url),
  },
  php: {
    js: () => import('@arborium/php/grammar.js'),
    wasm: () => new URL('@arborium/php/grammar_bg.wasm', import.meta.url),
  },
  postscript: {
    js: () => import('@arborium/postscript/grammar.js'),
    wasm: () => new URL('@arborium/postscript/grammar_bg.wasm', import.meta.url),
  },
  powershell: {
    js: () => import('@arborium/powershell/grammar.js'),
    wasm: () => new URL('@arborium/powershell/grammar_bg.wasm', import.meta.url),
  },
  prolog: {
    js: () => import('@arborium/prolog/grammar.js'),
    wasm: () => new URL('@arborium/prolog/grammar_bg.wasm', import.meta.url),
  },
  python: {
    js: () => import('@arborium/python/grammar.js'),
    wasm: () => new URL('@arborium/python/grammar_bg.wasm', import.meta.url),
  },
  query: {
    js: () => import('@arborium/query/grammar.js'),
    wasm: () => new URL('@arborium/query/grammar_bg.wasm', import.meta.url),
  },
  r: {
    js: () => import('@arborium/r/grammar.js'),
    wasm: () => new URL('@arborium/r/grammar_bg.wasm', import.meta.url),
  },
  rego: {
    js: () => import('@arborium/rego/grammar.js'),
    wasm: () => new URL('@arborium/rego/grammar_bg.wasm', import.meta.url),
  },
  rescript: {
    js: () => import('@arborium/rescript/grammar.js'),
    wasm: () => new URL('@arborium/rescript/grammar_bg.wasm', import.meta.url),
  },
  ron: {
    js: () => import('@arborium/ron/grammar.js'),
    wasm: () => new URL('@arborium/ron/grammar_bg.wasm', import.meta.url),
  },
  ruby: {
    js: () => import('@arborium/ruby/grammar.js'),
    wasm: () => new URL('@arborium/ruby/grammar_bg.wasm', import.meta.url),
  },
  rust: {
    js: () => import('@arborium/rust/grammar.js'),
    wasm: () => new URL('@arborium/rust/grammar_bg.wasm', import.meta.url),
  },
  scala: {
    js: () => import('@arborium/scala/grammar.js'),
    wasm: () => new URL('@arborium/scala/grammar_bg.wasm', import.meta.url),
  },
  scheme: {
    js: () => import('@arborium/scheme/grammar.js'),
    wasm: () => new URL('@arborium/scheme/grammar_bg.wasm', import.meta.url),
  },
  scss: {
    js: () => import('@arborium/scss/grammar.js'),
    wasm: () => new URL('@arborium/scss/grammar_bg.wasm', import.meta.url),
  },
  solidity: {
    js: () => import('@arborium/solidity/grammar.js'),
    wasm: () => new URL('@arborium/solidity/grammar_bg.wasm', import.meta.url),
  },
  sparql: {
    js: () => import('@arborium/sparql/grammar.js'),
    wasm: () => new URL('@arborium/sparql/grammar_bg.wasm', import.meta.url),
  },
  sql: {
    js: () => import('@arborium/sql/grammar.js'),
    wasm: () => new URL('@arborium/sql/grammar_bg.wasm', import.meta.url),
  },
  'ssh-config': {
    js: () => import('@arborium/ssh-config/grammar.js'),
    wasm: () => new URL('@arborium/ssh-config/grammar_bg.wasm', import.meta.url),
  },
  starlark: {
    js: () => import('@arborium/starlark/grammar.js'),
    wasm: () => new URL('@arborium/starlark/grammar_bg.wasm', import.meta.url),
  },
  styx: {
    js: () => import('@arborium/styx/grammar.js'),
    wasm: () => new URL('@arborium/styx/grammar_bg.wasm', import.meta.url),
  },
  svelte: {
    js: () => import('@arborium/svelte/grammar.js'),
    wasm: () => new URL('@arborium/svelte/grammar_bg.wasm', import.meta.url),
  },
  swift: {
    js: () => import('@arborium/swift/grammar.js'),
    wasm: () => new URL('@arborium/swift/grammar_bg.wasm', import.meta.url),
  },
  textproto: {
    js: () => import('@arborium/textproto/grammar.js'),
    wasm: () => new URL('@arborium/textproto/grammar_bg.wasm', import.meta.url),
  },
  thrift: {
    js: () => import('@arborium/thrift/grammar.js'),
    wasm: () => new URL('@arborium/thrift/grammar_bg.wasm', import.meta.url),
  },
  tlaplus: {
    js: () => import('@arborium/tlaplus/grammar.js'),
    wasm: () => new URL('@arborium/tlaplus/grammar_bg.wasm', import.meta.url),
  },
  toml: {
    js: () => import('@arborium/toml/grammar.js'),
    wasm: () => new URL('@arborium/toml/grammar_bg.wasm', import.meta.url),
  },
  tsx: {
    js: () => import('@arborium/tsx/grammar.js'),
    wasm: () => new URL('@arborium/tsx/grammar_bg.wasm', import.meta.url),
  },
  typescript: {
    js: () => import('@arborium/typescript/grammar.js'),
    wasm: () => new URL('@arborium/typescript/grammar_bg.wasm', import.meta.url),
  },
  typst: {
    js: () => import('@arborium/typst/grammar.js'),
    wasm: () => new URL('@arborium/typst/grammar_bg.wasm', import.meta.url),
  },
  verilog: {
    js: () => import('@arborium/verilog/grammar.js'),
    wasm: () => new URL('@arborium/verilog/grammar_bg.wasm', import.meta.url),
  },
  vhdl: {
    js: () => import('@arborium/vhdl/grammar.js'),
    wasm: () => new URL('@arborium/vhdl/grammar_bg.wasm', import.meta.url),
  },
  vim: {
    js: () => import('@arborium/vim/grammar.js'),
    wasm: () => new URL('@arborium/vim/grammar_bg.wasm', import.meta.url),
  },
  vue: {
    js: () => import('@arborium/vue/grammar.js'),
    wasm: () => new URL('@arborium/vue/grammar_bg.wasm', import.meta.url),
  },
  wit: {
    js: () => import('@arborium/wit/grammar.js'),
    wasm: () => new URL('@arborium/wit/grammar_bg.wasm', import.meta.url),
  },
  x86asm: {
    js: () => import('@arborium/x86asm/grammar.js'),
    wasm: () => new URL('@arborium/x86asm/grammar_bg.wasm', import.meta.url),
  },
  xml: {
    js: () => import('@arborium/xml/grammar.js'),
    wasm: () => new URL('@arborium/xml/grammar_bg.wasm', import.meta.url),
  },
  yaml: {
    js: () => import('@arborium/yaml/grammar.js'),
    wasm: () => new URL('@arborium/yaml/grammar_bg.wasm', import.meta.url),
  },
  yuri: {
    js: () => import('@arborium/yuri/grammar.js'),
    wasm: () => new URL('@arborium/yuri/grammar_bg.wasm', import.meta.url),
  },
  zig: {
    js: () => import('@arborium/zig/grammar.js'),
    wasm: () => new URL('@arborium/zig/grammar_bg.wasm', import.meta.url),
  },
  zsh: {
    js: () => import('@arborium/zsh/grammar.js'),
    wasm: () => new URL('@arborium/zsh/grammar_bg.wasm', import.meta.url),
  },
};
