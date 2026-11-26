// Highlights `elm` code blocks (needs `@arborium/arborium` and `@arborium/elm` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('elm', {
  js: () => import('@arborium/elm/grammar.js'),
  wasm: () => new URL('@arborium/elm/grammar_bg.wasm', import.meta.url),
});
