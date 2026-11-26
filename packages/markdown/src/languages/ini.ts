// Highlights `ini` code blocks (needs `@arborium/arborium` and `@arborium/ini` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ini', {
  js: () => import('@arborium/ini/grammar.js'),
  wasm: () => new URL('@arborium/ini/grammar_bg.wasm', import.meta.url),
});
