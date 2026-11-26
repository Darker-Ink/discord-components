// Highlights `caddy` code blocks (needs `@arborium/arborium` and `@arborium/caddy` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('caddy', {
  js: () => import('@arborium/caddy/grammar.js'),
  wasm: () => new URL('@arborium/caddy/grammar_bg.wasm', import.meta.url),
});
