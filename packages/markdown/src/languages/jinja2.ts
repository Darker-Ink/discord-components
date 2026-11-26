// Highlights `jinja2` code blocks (needs `@arborium/arborium` and `@arborium/jinja2` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('jinja2', {
  js: () => import('@arborium/jinja2/grammar.js'),
  wasm: () => new URL('@arborium/jinja2/grammar_bg.wasm', import.meta.url),
});
