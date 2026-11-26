// Highlights `yuri` code blocks (needs `@arborium/arborium` and `@arborium/yuri` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('yuri', {
  js: () => import('@arborium/yuri/grammar.js'),
  wasm: () => new URL('@arborium/yuri/grammar_bg.wasm', import.meta.url),
});
