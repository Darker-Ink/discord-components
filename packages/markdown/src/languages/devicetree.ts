// Highlights `devicetree` code blocks (needs `@arborium/arborium` and `@arborium/devicetree` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('devicetree', {
  js: () => import('@arborium/devicetree/grammar.js'),
  wasm: () => new URL('@arborium/devicetree/grammar_bg.wasm', import.meta.url),
});
