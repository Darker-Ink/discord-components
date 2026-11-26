// Highlights `ron` code blocks (needs `@arborium/arborium` and `@arborium/ron` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ron', {
  js: () => import('@arborium/ron/grammar.js'),
  wasm: () => new URL('@arborium/ron/grammar_bg.wasm', import.meta.url),
});
