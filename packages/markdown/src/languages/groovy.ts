// Highlights `groovy` code blocks (needs `@arborium/arborium` and `@arborium/groovy` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('groovy', {
  js: () => import('@arborium/groovy/grammar.js'),
  wasm: () => new URL('@arborium/groovy/grammar_bg.wasm', import.meta.url),
});
