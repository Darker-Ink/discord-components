import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: [react(), cloudflare()],
  define: {
    // The dev server needs inline scripts and websockets, so the Worker only sends strict CSPs in builds.
    __RELAXED_CSP__: JSON.stringify(command === 'serve'),
  },
  build: {
    // Hashed asset names; small files are inlined as data: URIs, which the pages' CSP allows for images and fonts.
    assetsInlineLimit: 4096,
  },
}));
