// Highlights `sql` code blocks (needs `@arborium/arborium` and `@arborium/sql` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('sql', {
  js: () => import('@arborium/sql/grammar.js'),
  wasm: () => new URL('@arborium/sql/grammar_bg.wasm', import.meta.url),
});
