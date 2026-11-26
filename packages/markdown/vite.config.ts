import fs from 'node:fs';
import path from 'node:path';
import { defineLibraryConfig } from '../../build/vite-library.ts';

// Every language module is its own entry: apps reach them only through the `languages/*` subpath exports.
const languages = fs
  .readdirSync(path.join(import.meta.dirname, 'src/languages'))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => path.parse(file).name);

export default defineLibraryConfig(import.meta.dirname, {
  entries: {
    internal: 'internal.ts',
    ...Object.fromEntries(languages.map((name) => [`languages/${name}`, `languages/${name}.ts`])),
  },
  keepDependencyUrls: true,
});
