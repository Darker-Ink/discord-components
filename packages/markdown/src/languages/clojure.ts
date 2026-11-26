// Highlights `clojure` code blocks (needs `@arborium/arborium` and `@arborium/clojure` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('clojure', {
  js: () => import('@arborium/clojure/grammar.js'),
  wasm: () => new URL('@arborium/clojure/grammar_bg.wasm', import.meta.url),
});
