// Highlights `hlsl` code blocks (needs `@arborium/arborium` and `@arborium/hlsl` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('hlsl', {
  js: () => import('@arborium/hlsl/grammar.js'),
  wasm: () => new URL('@arborium/hlsl/grammar_bg.wasm', import.meta.url),
});
