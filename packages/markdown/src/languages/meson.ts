// Highlights `meson` code blocks (needs `@arborium/arborium` and `@arborium/meson` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('meson', {
  js: () => import('@arborium/meson/grammar.js'),
  wasm: () => new URL('@arborium/meson/grammar_bg.wasm', import.meta.url),
});
