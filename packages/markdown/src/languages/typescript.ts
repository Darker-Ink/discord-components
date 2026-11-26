// Highlights `typescript` code blocks (needs `@arborium/arborium` and `@arborium/typescript` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('typescript', {
  js: () => import('@arborium/typescript/grammar.js'),
  wasm: () => new URL('@arborium/typescript/grammar_bg.wasm', import.meta.url),
});
