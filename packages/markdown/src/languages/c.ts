// Highlights `c` code blocks (needs `@arborium/arborium` and `@arborium/c` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('c', {
  js: () => import('@arborium/c/grammar.js'),
  wasm: () => new URL('@arborium/c/grammar_bg.wasm', import.meta.url),
});
