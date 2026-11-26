// Highlights `fsharp` code blocks (needs `@arborium/arborium` and `@arborium/fsharp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('fsharp', {
  js: () => import('@arborium/fsharp/grammar.js'),
  wasm: () => new URL('@arborium/fsharp/grammar_bg.wasm', import.meta.url),
});
