// Highlights `verilog` code blocks (needs `@arborium/arborium` and `@arborium/verilog` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('verilog', {
  js: () => import('@arborium/verilog/grammar.js'),
  wasm: () => new URL('@arborium/verilog/grammar_bg.wasm', import.meta.url),
});
