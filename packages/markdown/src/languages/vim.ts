// Highlights `vim` code blocks (needs `@arborium/arborium` and `@arborium/vim` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('vim', {
  js: () => import('@arborium/vim/grammar.js'),
  wasm: () => new URL('@arborium/vim/grammar_bg.wasm', import.meta.url),
});
