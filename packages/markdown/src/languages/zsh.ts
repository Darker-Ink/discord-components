// Highlights `zsh` code blocks (needs `@arborium/arborium` and `@arborium/zsh` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('zsh', {
  js: () => import('@arborium/zsh/grammar.js'),
  wasm: () => new URL('@arborium/zsh/grammar_bg.wasm', import.meta.url),
});
