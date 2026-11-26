// Highlights `solidity` code blocks (needs `@arborium/arborium` and `@arborium/solidity` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('solidity', {
  js: () => import('@arborium/solidity/grammar.js'),
  wasm: () => new URL('@arborium/solidity/grammar_bg.wasm', import.meta.url),
});
