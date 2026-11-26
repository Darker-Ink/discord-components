// Highlights `html` code blocks (needs `@arborium/arborium` and `@arborium/html` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('html', {
  js: () => import('@arborium/html/grammar.js'),
  wasm: () => new URL('@arborium/html/grammar_bg.wasm', import.meta.url),
});
