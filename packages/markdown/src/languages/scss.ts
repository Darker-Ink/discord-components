// Highlights `scss` code blocks (needs `@arborium/arborium` and `@arborium/scss` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('scss', {
  js: () => import('@arborium/scss/grammar.js'),
  wasm: () => new URL('@arborium/scss/grammar_bg.wasm', import.meta.url),
});
