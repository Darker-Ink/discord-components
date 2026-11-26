// Highlights `swift` code blocks (needs `@arborium/arborium` and `@arborium/swift` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('swift', {
  js: () => import('@arborium/swift/grammar.js'),
  wasm: () => new URL('@arborium/swift/grammar_bg.wasm', import.meta.url),
});
