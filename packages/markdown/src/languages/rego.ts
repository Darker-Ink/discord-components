// Highlights `rego` code blocks (needs `@arborium/arborium` and `@arborium/rego` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('rego', {
  js: () => import('@arborium/rego/grammar.js'),
  wasm: () => new URL('@arborium/rego/grammar_bg.wasm', import.meta.url),
});
