// Highlights `diff` code blocks (needs `@arborium/arborium` and `@arborium/diff` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('diff', {
  js: () => import('@arborium/diff/grammar.js'),
  wasm: () => new URL('@arborium/diff/grammar_bg.wasm', import.meta.url),
});
