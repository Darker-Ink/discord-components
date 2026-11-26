// Highlights `jq` code blocks (needs `@arborium/arborium` and `@arborium/jq` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('jq', {
  js: () => import('@arborium/jq/grammar.js'),
  wasm: () => new URL('@arborium/jq/grammar_bg.wasm', import.meta.url),
});
