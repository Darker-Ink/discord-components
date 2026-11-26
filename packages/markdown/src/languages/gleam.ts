// Highlights `gleam` code blocks (needs `@arborium/arborium` and `@arborium/gleam` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('gleam', {
  js: () => import('@arborium/gleam/grammar.js'),
  wasm: () => new URL('@arborium/gleam/grammar_bg.wasm', import.meta.url),
});
