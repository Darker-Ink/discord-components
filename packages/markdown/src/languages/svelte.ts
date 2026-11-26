// Highlights `svelte` code blocks (needs `@arborium/arborium` and `@arborium/svelte` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('svelte', {
  js: () => import('@arborium/svelte/grammar.js'),
  wasm: () => new URL('@arborium/svelte/grammar_bg.wasm', import.meta.url),
});
