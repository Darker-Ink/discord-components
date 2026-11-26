// Highlights `postscript` code blocks (needs `@arborium/arborium` and `@arborium/postscript` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('postscript', {
  js: () => import('@arborium/postscript/grammar.js'),
  wasm: () => new URL('@arborium/postscript/grammar_bg.wasm', import.meta.url),
});
