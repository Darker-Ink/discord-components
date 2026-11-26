import { defineLibraryConfig } from '../../build/vite-library.ts';

export default defineLibraryConfig(import.meta.dirname, { keepCss: true, copy: ['fonts'] });
