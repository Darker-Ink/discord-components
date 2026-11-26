// Highlights `nix` code blocks (needs `@arborium/arborium` and `@arborium/nix` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('nix', {
  js: () => import('@arborium/nix/grammar.js'),
  wasm: () => new URL('@arborium/nix/grammar_bg.wasm', import.meta.url),
});
