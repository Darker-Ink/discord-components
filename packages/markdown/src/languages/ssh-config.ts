// Highlights `ssh-config` code blocks (needs `@arborium/arborium` and `@arborium/ssh-config` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('ssh-config', {
  js: () => import('@arborium/ssh-config/grammar.js'),
  wasm: () => new URL('@arborium/ssh-config/grammar_bg.wasm', import.meta.url),
});
