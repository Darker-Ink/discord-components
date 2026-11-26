// Highlights `cedarschema` code blocks (needs `@arborium/arborium` and `@arborium/cedarschema` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('cedarschema', {
  js: () => import('@arborium/cedarschema/grammar.js'),
  wasm: () => new URL('@arborium/cedarschema/grammar_bg.wasm', import.meta.url),
});
