import { defineLibraryConfig } from '../../build/vite-library.ts';

export default defineLibraryConfig(import.meta.dirname, { copy: ['slate-react/LICENSE.md'] });
