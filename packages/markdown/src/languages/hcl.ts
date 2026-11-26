// Highlights `hcl` code blocks (needs `@arborium/arborium` and `@arborium/hcl` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('hcl', {
  js: () => import('@arborium/hcl/grammar.js'),
  wasm: () => new URL('@arborium/hcl/grammar_bg.wasm', import.meta.url),
});
