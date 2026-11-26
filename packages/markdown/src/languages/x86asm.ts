// Highlights `x86asm` code blocks (needs `@arborium/arborium` and `@arborium/x86asm` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('x86asm', {
  js: () => import('@arborium/x86asm/grammar.js'),
  wasm: () => new URL('@arborium/x86asm/grammar_bg.wasm', import.meta.url),
});
