// Highlights `cedar` code blocks (needs `@arborium/arborium` and `@arborium/cedar` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('cedar', {
  js: () => import('@arborium/cedar/grammar.js'),
  wasm: () => new URL('@arborium/cedar/grammar_bg.wasm', import.meta.url),
});
