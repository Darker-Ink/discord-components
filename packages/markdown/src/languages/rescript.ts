// Highlights `rescript` code blocks (needs `@arborium/arborium` and `@arborium/rescript` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('rescript', {
  js: () => import('@arborium/rescript/grammar.js'),
  wasm: () => new URL('@arborium/rescript/grammar_bg.wasm', import.meta.url),
});
