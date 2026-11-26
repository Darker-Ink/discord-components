// Highlights `asciidoc` code blocks (needs `@arborium/arborium` and `@arborium/asciidoc` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('asciidoc', {
  js: () => import('@arborium/asciidoc/grammar.js'),
  wasm: () => new URL('@arborium/asciidoc/grammar_bg.wasm', import.meta.url),
});
