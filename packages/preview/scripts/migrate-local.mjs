// Applies the D1 migrations to the local database before `vite dev`, so a fresh checkout has its tables.
// CI=1 makes wrangler apply them without asking for confirmation.
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const result = spawnSync('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--local'], {
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
