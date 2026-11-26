// Highlights `graphql` code blocks (needs `@arborium/arborium` and `@arborium/graphql` installed).
import { registerCodeLanguage } from '../highlight';
import './_host';

registerCodeLanguage('graphql', {
  js: () => import('@arborium/graphql/grammar.js'),
  wasm: () => new URL('@arborium/graphql/grammar_bg.wasm', import.meta.url),
});
