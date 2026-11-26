// Highlights `ruby` code blocks (needs `@arborium/arborium` and `@arborium/ruby` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ruby', {
  js: () => import('@arborium/ruby/grammar.js'),
  wasm: () => new URL('@arborium/ruby/grammar_bg.wasm', import.meta.url),
});
