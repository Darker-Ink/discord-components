// Highlights `javascript` code blocks (needs `@arborium/arborium` and `@arborium/javascript` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('javascript', {
  js: () => import('@arborium/javascript/grammar.js'),
  wasm: () => new URL('@arborium/javascript/grammar_bg.wasm', import.meta.url),
});
