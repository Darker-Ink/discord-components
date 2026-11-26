// Highlights `commonlisp` code blocks (needs `@arborium/arborium` and `@arborium/commonlisp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('commonlisp', {
  js: () => import('@arborium/commonlisp/grammar.js'),
  wasm: () => new URL('@arborium/commonlisp/grammar_bg.wasm', import.meta.url),
});
