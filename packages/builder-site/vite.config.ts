import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const BUTTON_DIR = path.resolve(import.meta.dirname, '../components/src/Button');

// Swaps the Button's Rive layers for a lazy-loading stand-in, which keeps the Rive runtime out of the first load.
const lazyExpressiveButton = (): Plugin => ({
  name: 'builder-site:lazy-expressive-button',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source !== './ExpressiveButtonRive' || importer == null) return null;
    if (path.dirname(importer) !== BUTTON_DIR) return null;
    return path.resolve(import.meta.dirname, 'src/shims/ExpressiveButtonRive.tsx');
  },
});

export default defineConfig({
  plugins: [lazyExpressiveButton(), react()],
  server: { port: 5175 },
});
