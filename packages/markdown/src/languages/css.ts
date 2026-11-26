// Highlights `css` code blocks (needs `@arborium/arborium` and `@arborium/css` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('css', {
  js: () => import('@arborium/css/grammar.js'),
  wasm: () => new URL('@arborium/css/grammar_bg.wasm', import.meta.url),
});
