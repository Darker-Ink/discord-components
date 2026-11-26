// Highlights `starlark` code blocks (needs `@arborium/arborium` and `@arborium/starlark` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('starlark', {
  js: () => import('@arborium/starlark/grammar.js'),
  wasm: () => new URL('@arborium/starlark/grammar_bg.wasm', import.meta.url),
});
