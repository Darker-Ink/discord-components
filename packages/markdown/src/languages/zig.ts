// Highlights `zig` code blocks (needs `@arborium/arborium` and `@arborium/zig` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('zig', {
  js: () => import('@arborium/zig/grammar.js'),
  wasm: () => new URL('@arborium/zig/grammar_bg.wasm', import.meta.url),
});
