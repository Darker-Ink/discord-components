// Highlights `bash` code blocks (needs `@arborium/arborium` and `@arborium/bash` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('bash', {
  js: () => import('@arborium/bash/grammar.js'),
  wasm: () => new URL('@arborium/bash/grammar_bg.wasm', import.meta.url),
});
