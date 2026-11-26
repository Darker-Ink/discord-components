// Highlights `cpp` code blocks (needs `@arborium/arborium` and `@arborium/cpp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('cpp', {
  js: () => import('@arborium/cpp/grammar.js'),
  wasm: () => new URL('@arborium/cpp/grammar_bg.wasm', import.meta.url),
});
