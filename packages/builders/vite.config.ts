import { defineLibraryConfig } from '../../build/vite-library.ts';

// `core` is the headless part (document model, validation, webhook client) for apps that bring their own UI.
export default defineLibraryConfig(import.meta.dirname, { entries: { 'core/index': 'core/index.ts' } });
