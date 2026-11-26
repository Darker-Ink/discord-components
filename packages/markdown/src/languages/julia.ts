// Highlights `julia` code blocks (needs `@arborium/arborium` and `@arborium/julia` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('julia', {
  js: () => import('@arborium/julia/grammar.js'),
  wasm: () => new URL('@arborium/julia/grammar_bg.wasm', import.meta.url),
});
