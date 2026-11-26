// Highlights `python` code blocks (needs `@arborium/arborium` and `@arborium/python` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('python', {
  js: () => import('@arborium/python/grammar.js'),
  wasm: () => new URL('@arborium/python/grammar_bg.wasm', import.meta.url),
});
