// Highlights `yaml` code blocks (needs `@arborium/arborium` and `@arborium/yaml` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('yaml', {
  js: () => import('@arborium/yaml/grammar.js'),
  wasm: () => new URL('@arborium/yaml/grammar_bg.wasm', import.meta.url),
});
