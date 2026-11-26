// Checks the built packages before they are packed: every relative import in dist (JS, declarations and CSS)
// points at a file that exists, and every package import is a declared dependency or peer dependency.
// Usage: node scripts/check-dist.mjs   (after `pnpm build`)
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const packagesDir = path.join(root, 'packages');
const problems = [];

const IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|@import\s+)(['"])([^'"]+)\1/g;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

const packageName = (spec) =>
  spec
    .split('/')
    .slice(0, spec.startsWith('@') ? 2 : 1)
    .join('/');

for (const dir of fs.readdirSync(packagesDir)) {
  const manifestPath = path.join(packagesDir, dir, 'package.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.private) continue;
  const dist = path.join(packagesDir, dir, 'dist');
  if (!fs.existsSync(dist)) {
    problems.push(`${manifest.name}: no dist (run pnpm build)`);
    continue;
  }
  const declared = new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);

  for (const target of Object.values(manifest.publishConfig?.exports ?? {}).flatMap((t) =>
    typeof t === 'string' ? [t] : Object.values(t),
  )) {
    const file = path.join(packagesDir, dir, target.replace('*', 'light'));
    if (!fs.existsSync(file)) problems.push(`${manifest.name}: export target ${target} is missing`);
  }

  for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(js|d\.ts|css)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    const source = fs.readFileSync(file, 'utf8');
    const where = `${manifest.name}: ${path.relative(dist, file)}`;
    const specs = [...source.matchAll(IMPORT_RE)].map((m) => m[2]);
    if (file.endsWith('.css')) {
      specs.push(...[...source.matchAll(CSS_URL_RE)].map((m) => m[2]).filter((url) => url.startsWith('.')));
    }
    for (const spec of specs) {
      if (spec.startsWith('.')) {
        // Declarations import `./x.js`, which TypeScript resolves to `./x.d.ts`.
        const target = file.endsWith('.d.ts') ? spec.replace(/\.js$/, '.d.ts') : spec.split(/[?#]/)[0];
        if (!fs.existsSync(path.join(path.dirname(file), target))) {
          problems.push(`${where}: ${spec} does not exist`);
        }
      } else if (!spec.startsWith('data:') && !spec.startsWith('node:') && !builtinModules.includes(spec)) {
        if (!declared.has(packageName(spec))) problems.push(`${where}: ${spec} is not a dependency`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('dist ok');
