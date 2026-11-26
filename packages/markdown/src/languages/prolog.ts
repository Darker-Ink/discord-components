// Highlights `prolog` code blocks (needs `@arborium/arborium` and `@arborium/prolog` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('prolog', {
  js: () => import('@arborium/prolog/grammar.js'),
  wasm: () => new URL('@arborium/prolog/grammar_bg.wasm', import.meta.url),
});
