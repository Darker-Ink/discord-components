// Highlights `glsl` code blocks (needs `@arborium/arborium` and `@arborium/glsl` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('glsl', {
  js: () => import('@arborium/glsl/grammar.js'),
  wasm: () => new URL('@arborium/glsl/grammar_bg.wasm', import.meta.url),
});
