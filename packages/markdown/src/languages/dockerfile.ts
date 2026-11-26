// Highlights `dockerfile` code blocks (needs `@arborium/arborium` and `@arborium/dockerfile` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('dockerfile', {
  js: () => import('@arborium/dockerfile/grammar.js'),
  wasm: () => new URL('@arborium/dockerfile/grammar_bg.wasm', import.meta.url),
});
