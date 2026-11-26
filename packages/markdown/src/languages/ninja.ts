// Highlights `ninja` code blocks (needs `@arborium/arborium` and `@arborium/ninja` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ninja', {
  js: () => import('@arborium/ninja/grammar.js'),
  wasm: () => new URL('@arborium/ninja/grammar_bg.wasm', import.meta.url),
});
