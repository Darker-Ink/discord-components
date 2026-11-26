// Highlights `tlaplus` code blocks (needs `@arborium/arborium` and `@arborium/tlaplus` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('tlaplus', {
  js: () => import('@arborium/tlaplus/grammar.js'),
  wasm: () => new URL('@arborium/tlaplus/grammar_bg.wasm', import.meta.url),
});
