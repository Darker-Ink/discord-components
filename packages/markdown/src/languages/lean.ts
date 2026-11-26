// Highlights `lean` code blocks (needs `@arborium/arborium` and `@arborium/lean` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('lean', {
  js: () => import('@arborium/lean/grammar.js'),
  wasm: () => new URL('@arborium/lean/grammar_bg.wasm', import.meta.url),
});
