// Highlights `fish` code blocks (needs `@arborium/arborium` and `@arborium/fish` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('fish', {
  js: () => import('@arborium/fish/grammar.js'),
  wasm: () => new URL('@arborium/fish/grammar_bg.wasm', import.meta.url),
});
