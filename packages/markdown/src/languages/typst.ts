// Highlights `typst` code blocks (needs `@arborium/arborium` and `@arborium/typst` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('typst', {
  js: () => import('@arborium/typst/grammar.js'),
  wasm: () => new URL('@arborium/typst/grammar_bg.wasm', import.meta.url),
});
