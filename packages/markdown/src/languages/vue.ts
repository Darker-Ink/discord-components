// Highlights `vue` code blocks (needs `@arborium/arborium` and `@arborium/vue` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('vue', {
  js: () => import('@arborium/vue/grammar.js'),
  wasm: () => new URL('@arborium/vue/grammar_bg.wasm', import.meta.url),
});
