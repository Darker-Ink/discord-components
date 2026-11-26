// Highlights `objc` code blocks (needs `@arborium/arborium` and `@arborium/objc` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('objc', {
  js: () => import('@arborium/objc/grammar.js'),
  wasm: () => new URL('@arborium/objc/grammar_bg.wasm', import.meta.url),
});
