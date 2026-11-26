// Highlights `dart` code blocks (needs `@arborium/arborium` and `@arborium/dart` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('dart', {
  js: () => import('@arborium/dart/grammar.js'),
  wasm: () => new URL('@arborium/dart/grammar_bg.wasm', import.meta.url),
});
