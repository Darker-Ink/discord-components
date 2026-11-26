// Highlights `scala` code blocks (needs `@arborium/arborium` and `@arborium/scala` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('scala', {
  js: () => import('@arborium/scala/grammar.js'),
  wasm: () => new URL('@arborium/scala/grammar_bg.wasm', import.meta.url),
});
