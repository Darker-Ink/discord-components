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

// The app's own code changes far more often than what it's built on: split the rest into chunks that load in
// parallel and stay cached between deploys.
const CHUNKS: [name: string, test: RegExp][] = [
  ['react', /node_modules[\\/](react|react-dom|scheduler)[\\/]/],
  [
    'aria',
    /node_modules[\\/](@react-aria|react-aria|react-aria-components|@react-stately|react-stately|@internationalized|@react-types)[\\/]/,
  ],
  ['emoji', /packages[\\/]markdown[\\/]src[\\/]emoji[\\/]/],
  ['vendor', /node_modules[\\/]/],
  ['mana', /packages[\\/](components|tokens|icons)[\\/]/],
  ['messages', /packages[\\/](messages|markdown|slate)[\\/]/],
];

const LAZY =
  /lottie|@rive-app|ExpressiveButtonRive|ColorPickerSaturationHue|react-color|reactcss|tinycolor2|lodash|[\\/]Rive[\\/]/;

export default defineConfig({
  plugins: [lazyExpressiveButton(), react()],
  server: { port: 5175 },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // What is already loaded lazily (animations, the color picker) stays out of these.
              name: (id: string) => (LAZY.test(id) ? null : (CHUNKS.find(([, test]) => test.test(id))?.[0] ?? null)),
            },
          ],
        },
      },
    },
  },
});
