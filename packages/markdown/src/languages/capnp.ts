// Highlights `capnp` code blocks (needs `@arborium/arborium` and `@arborium/capnp` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('capnp', {
  js: () => import('@arborium/capnp/grammar.js'),
  wasm: () => new URL('@arborium/capnp/grammar_bg.wasm', import.meta.url),
});
