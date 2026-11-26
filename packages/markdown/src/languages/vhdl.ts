// Highlights `vhdl` code blocks (needs `@arborium/arborium` and `@arborium/vhdl` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('vhdl', {
  js: () => import('@arborium/vhdl/grammar.js'),
  wasm: () => new URL('@arborium/vhdl/grammar_bg.wasm', import.meta.url),
});
