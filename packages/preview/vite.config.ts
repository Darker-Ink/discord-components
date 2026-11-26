import path from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const BUTTON_DIR = path.resolve(import.meta.dirname, '../components/src/Button');

// Swaps the Button's Rive layers for a lazy-loading stand-in, which keeps the Rive runtime out of the viewer's
// first load. Only imports from the Button folder are redirected; the stand-in imports the real module itself.
const lazyExpressiveButton = (): Plugin => ({
  name: 'preview:lazy-expressive-button',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source !== './ExpressiveButtonRive' || importer == null) return null;
    if (path.dirname(importer) !== BUTTON_DIR) return null;
    return path.resolve(import.meta.dirname, 'src/client/shims/ExpressiveButtonRive.tsx');
  },
});

export default defineConfig(({ command }) => ({
  plugins: [lazyExpressiveButton(), react(), cloudflare()],
  define: {
    // The dev server needs inline scripts and websockets, so the Worker only sends strict CSPs in builds.
    __RELAXED_CSP__: JSON.stringify(command === 'serve'),
  },
  build: {
    // Hashed asset names; small files are inlined as data: URIs, which the pages' CSP allows for images and fonts.
    assetsInlineLimit: 4096,
  },
}));
