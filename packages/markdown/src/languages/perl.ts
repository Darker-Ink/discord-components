// Highlights `perl` code blocks (needs `@arborium/arborium` and `@arborium/perl` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('perl', {
  js: () => import('@arborium/perl/grammar.js'),
  wasm: () => new URL('@arborium/perl/grammar_bg.wasm', import.meta.url),
});
