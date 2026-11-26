// Highlights `tsx` code blocks (needs `@arborium/arborium` and `@arborium/tsx` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('tsx', {
  js: () => import('@arborium/tsx/grammar.js'),
  wasm: () => new URL('@arborium/tsx/grammar_bg.wasm', import.meta.url),
});
