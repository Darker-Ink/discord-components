// Highlights `dot` code blocks (needs `@arborium/arborium` and `@arborium/dot` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('dot', {
  js: () => import('@arborium/dot/grammar.js'),
  wasm: () => new URL('@arborium/dot/grammar_bg.wasm', import.meta.url),
});
