// Highlights `wit` code blocks (needs `@arborium/arborium` and `@arborium/wit` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('wit', {
  js: () => import('@arborium/wit/grammar.js'),
  wasm: () => new URL('@arborium/wit/grammar_bg.wasm', import.meta.url),
});
