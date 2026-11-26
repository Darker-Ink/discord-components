// Highlights `php` code blocks (needs `@arborium/arborium` and `@arborium/php` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('php', {
  js: () => import('@arborium/php/grammar.js'),
  wasm: () => new URL('@arborium/php/grammar_bg.wasm', import.meta.url),
});
