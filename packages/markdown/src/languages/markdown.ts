// Highlights `markdown` code blocks (needs `@arborium/arborium` and `@arborium/markdown` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('markdown', {
  js: () => import('@arborium/markdown/grammar.js'),
  wasm: () => new URL('@arborium/markdown/grammar_bg.wasm', import.meta.url),
});
