// Highlights `rust` code blocks (needs `@arborium/arborium` and `@arborium/rust` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('rust', {
  js: () => import('@arborium/rust/grammar.js'),
  wasm: () => new URL('@arborium/rust/grammar_bg.wasm', import.meta.url),
});
