// Highlights `erlang` code blocks (needs `@arborium/arborium` and `@arborium/erlang` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('erlang', {
  js: () => import('@arborium/erlang/grammar.js'),
  wasm: () => new URL('@arborium/erlang/grammar_bg.wasm', import.meta.url),
});
