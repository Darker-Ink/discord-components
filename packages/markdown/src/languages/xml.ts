// Highlights `xml` code blocks (needs `@arborium/arborium` and `@arborium/xml` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('xml', {
  js: () => import('@arborium/xml/grammar.js'),
  wasm: () => new URL('@arborium/xml/grammar_bg.wasm', import.meta.url),
});
