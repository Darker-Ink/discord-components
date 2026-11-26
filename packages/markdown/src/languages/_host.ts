// Registers Arborium with the highlighter. Every language entry imports this, so `@arborium/arborium` is only
// part of an app that enables a language.
import { registerCodeHighlighterHost } from '../highlight';

registerCodeHighlighterHost({
  arborium: () => import('@arborium/arborium'),
  hostJs: () => import('@arborium/arborium/arborium_host.js'),
  hostWasm: () => new URL('@arborium/arborium/arborium_host_bg.wasm', import.meta.url),
});
