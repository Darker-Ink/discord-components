// Highlights `kotlin` code blocks (needs `@arborium/arborium` and `@arborium/kotlin` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('kotlin', {
  js: () => import('@arborium/kotlin/grammar.js'),
  wasm: () => new URL('@arborium/kotlin/grammar_bg.wasm', import.meta.url),
});
