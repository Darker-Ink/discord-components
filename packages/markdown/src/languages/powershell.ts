// Highlights `powershell` code blocks (needs `@arborium/arborium` and `@arborium/powershell` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('powershell', {
  js: () => import('@arborium/powershell/grammar.js'),
  wasm: () => new URL('@arborium/powershell/grammar_bg.wasm', import.meta.url),
});
