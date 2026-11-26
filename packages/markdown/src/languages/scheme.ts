// Highlights `scheme` code blocks (needs `@arborium/arborium` and `@arborium/scheme` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('scheme', {
  js: () => import('@arborium/scheme/grammar.js'),
  wasm: () => new URL('@arborium/scheme/grammar_bg.wasm', import.meta.url),
});
