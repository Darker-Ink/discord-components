// Highlights `asm` code blocks (needs `@arborium/arborium` and `@arborium/asm` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('asm', {
  js: () => import('@arborium/asm/grammar.js'),
  wasm: () => new URL('@arborium/asm/grammar_bg.wasm', import.meta.url),
});
