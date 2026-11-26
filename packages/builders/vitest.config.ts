import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts (the library build), so tests don't run the declaration plugin.
export default defineConfig({
  test: { include: ['test/**/*.test.{ts,tsx}'], environment: 'node' },
});
