// Highlights `batch` code blocks (needs `@arborium/arborium` and `@arborium/batch` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('batch', {
  js: () => import('@arborium/batch/grammar.js'),
  wasm: () => new URL('@arborium/batch/grammar_bg.wasm', import.meta.url),
});
