// Highlights `agda` code blocks (needs `@arborium/arborium` and `@arborium/agda` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('agda', {
  js: () => import('@arborium/agda/grammar.js'),
  wasm: () => new URL('@arborium/agda/grammar_bg.wasm', import.meta.url),
});
