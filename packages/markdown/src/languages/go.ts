// Highlights `go` code blocks (needs `@arborium/arborium` and `@arborium/go` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('go', {
  js: () => import('@arborium/go/grammar.js'),
  wasm: () => new URL('@arborium/go/grammar_bg.wasm', import.meta.url),
});
