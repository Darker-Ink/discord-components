// Highlights `d` code blocks (needs `@arborium/arborium` and `@arborium/d` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('d', {
  js: () => import('@arborium/d/grammar.js'),
  wasm: () => new URL('@arborium/d/grammar_bg.wasm', import.meta.url),
});
