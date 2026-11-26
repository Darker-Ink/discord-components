// Highlights `textproto` code blocks (needs `@arborium/arborium` and `@arborium/textproto` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('textproto', {
  js: () => import('@arborium/textproto/grammar.js'),
  wasm: () => new URL('@arborium/textproto/grammar_bg.wasm', import.meta.url),
});
