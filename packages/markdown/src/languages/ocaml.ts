// Highlights `ocaml` code blocks (needs `@arborium/arborium` and `@arborium/ocaml` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ocaml', {
  js: () => import('@arborium/ocaml/grammar.js'),
  wasm: () => new URL('@arborium/ocaml/grammar_bg.wasm', import.meta.url),
});
