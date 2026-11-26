// Highlights `elisp` code blocks (needs `@arborium/arborium` and `@arborium/elisp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('elisp', {
  js: () => import('@arborium/elisp/grammar.js'),
  wasm: () => new URL('@arborium/elisp/grammar_bg.wasm', import.meta.url),
});
