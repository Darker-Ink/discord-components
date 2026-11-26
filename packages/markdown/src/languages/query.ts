// Highlights `query` code blocks (needs `@arborium/arborium` and `@arborium/query` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('query', {
  js: () => import('@arborium/query/grammar.js'),
  wasm: () => new URL('@arborium/query/grammar_bg.wasm', import.meta.url),
});
