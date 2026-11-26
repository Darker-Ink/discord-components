// Highlights `awk` code blocks (needs `@arborium/arborium` and `@arborium/awk` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('awk', {
  js: () => import('@arborium/awk/grammar.js'),
  wasm: () => new URL('@arborium/awk/grammar_bg.wasm', import.meta.url),
});
