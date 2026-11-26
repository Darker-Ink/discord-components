// Highlights `r` code blocks (needs `@arborium/arborium` and `@arborium/r` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('r', {
  js: () => import('@arborium/r/grammar.js'),
  wasm: () => new URL('@arborium/r/grammar_bg.wasm', import.meta.url),
});
