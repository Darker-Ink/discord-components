// Highlights `c-sharp` code blocks (needs `@arborium/arborium` and `@arborium/c-sharp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('c-sharp', {
  js: () => import('@arborium/c-sharp/grammar.js'),
  wasm: () => new URL('@arborium/c-sharp/grammar_bg.wasm', import.meta.url),
});
