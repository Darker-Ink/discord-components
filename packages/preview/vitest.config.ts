import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
  return {
    define: { __RELAXED_CSP__: 'false' },
    plugins: [
      cloudflareTest({
        main: './src/worker/index.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // The SPA shell the Worker decorates; the real one only exists after `vite build`.
          assets: {
            directory: path.join(import.meta.dirname, 'test/fixtures/assets'),
            binding: 'ASSETS',
            assetConfig: { not_found_handling: 'single-page-application' },
          },
          bindings: {
            TEST_MIGRATIONS: migrations,
            SIGNING_SECRET: 'test-signing-secret',
            // Small limits so the tests can hit them.
            MAX_BODY_BYTES: 64 * 1024,
            MAX_MESSAGES_PER_PREVIEW: 5,
            MAX_PREVIEWS_PER_KEY: 3,
            KEY_CREATION_LIMIT: 3,
            MAX_SIGNED_URL_TTL_SECONDS: 3600,
          },
        },
      }),
    ],
    test: {
      include: ['test/**/*.test.ts'],
      setupFiles: ['./test/setup.ts'],
    },
  };
});
