import { defineLibraryConfig } from '../../build/vite-library.ts';

// For apps that load the CSS themselves instead of through the JS imports: every package's CSS, in the order
// the JS imports it.
const stylesheets = [
  '@discord-mana/tokens/fonts.css',
  '@discord-mana/tokens/primitives.css',
  '@discord-mana/tokens/themes/light.css',
  '@discord-mana/tokens/themes/ash.css',
  '@discord-mana/tokens/themes/dark.css',
  '@discord-mana/tokens/themes/onyx.css',
  '@discord-mana/tokens/base.css',
  '@discord-mana/components/style.css',
  '@discord-mana/messages/style.css',
  '@discord-mana/markdown/style.css',
  '@discord-mana/slate/style.css',
];

export default defineLibraryConfig(import.meta.dirname, {
  stylesheet: stylesheets.map((file) => `@import '${file}';\n`).join(''),
});
