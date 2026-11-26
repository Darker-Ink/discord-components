// Highlights `thrift` code blocks (needs `@arborium/arborium` and `@arborium/thrift` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('thrift', {
  js: () => import('@arborium/thrift/grammar.js'),
  wasm: () => new URL('@arborium/thrift/grammar_bg.wasm', import.meta.url),
});
