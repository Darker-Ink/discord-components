// Highlights `idris` code blocks (needs `@arborium/arborium` and `@arborium/idris` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('idris', {
  js: () => import('@arborium/idris/grammar.js'),
  wasm: () => new URL('@arborium/idris/grammar_bg.wasm', import.meta.url),
});
