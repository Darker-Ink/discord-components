// Highlights `cmake` code blocks (needs `@arborium/arborium` and `@arborium/cmake` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('cmake', {
  js: () => import('@arborium/cmake/grammar.js'),
  wasm: () => new URL('@arborium/cmake/grammar_bg.wasm', import.meta.url),
});
