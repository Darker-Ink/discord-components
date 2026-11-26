// Highlights `elixir` code blocks (needs `@arborium/arborium` and `@arborium/elixir` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('elixir', {
  js: () => import('@arborium/elixir/grammar.js'),
  wasm: () => new URL('@arborium/elixir/grammar_bg.wasm', import.meta.url),
});
