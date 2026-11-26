// Highlights `java` code blocks (needs `@arborium/arborium` and `@arborium/java` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('java', {
  js: () => import('@arborium/java/grammar.js'),
  wasm: () => new URL('@arborium/java/grammar_bg.wasm', import.meta.url),
});
