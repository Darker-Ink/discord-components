// Highlights `toml` code blocks (needs `@arborium/arborium` and `@arborium/toml` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('toml', {
  js: () => import('@arborium/toml/grammar.js'),
  wasm: () => new URL('@arborium/toml/grammar_bg.wasm', import.meta.url),
});
