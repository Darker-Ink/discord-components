// Highlights `json` code blocks (needs `@arborium/arborium` and `@arborium/json` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('json', {
  js: () => import('@arborium/json/grammar.js'),
  wasm: () => new URL('@arborium/json/grammar_bg.wasm', import.meta.url),
});
