// Highlights `matlab` code blocks (needs `@arborium/arborium` and `@arborium/matlab` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('matlab', {
  js: () => import('@arborium/matlab/grammar.js'),
  wasm: () => new URL('@arborium/matlab/grammar_bg.wasm', import.meta.url),
});
