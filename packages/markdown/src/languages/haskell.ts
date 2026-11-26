// Highlights `haskell` code blocks (needs `@arborium/arborium` and `@arborium/haskell` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('haskell', {
  js: () => import('@arborium/haskell/grammar.js'),
  wasm: () => new URL('@arborium/haskell/grammar_bg.wasm', import.meta.url),
});
