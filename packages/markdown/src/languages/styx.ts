// Highlights `styx` code blocks (needs `@arborium/arborium` and `@arborium/styx` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('styx', {
  js: () => import('@arborium/styx/grammar.js'),
  wasm: () => new URL('@arborium/styx/grammar_bg.wasm', import.meta.url),
});
