// Highlights `lua` code blocks (needs `@arborium/arborium` and `@arborium/lua` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('lua', {
  js: () => import('@arborium/lua/grammar.js'),
  wasm: () => new URL('@arborium/lua/grammar_bg.wasm', import.meta.url),
});
