// Highlights `ada` code blocks (needs `@arborium/arborium` and `@arborium/ada` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ada', {
  js: () => import('@arborium/ada/grammar.js'),
  wasm: () => new URL('@arborium/ada/grammar_bg.wasm', import.meta.url),
});
