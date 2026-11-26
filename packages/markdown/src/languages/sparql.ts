// Highlights `sparql` code blocks (needs `@arborium/arborium` and `@arborium/sparql` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('sparql', {
  js: () => import('@arborium/sparql/grammar.js'),
  wasm: () => new URL('@arborium/sparql/grammar_bg.wasm', import.meta.url),
});
