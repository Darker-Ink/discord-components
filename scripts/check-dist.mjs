// Checks the built packages before they are packed: every relative import in dist (JS, declarations and CSS)
// and every relative `new URL(…, import.meta.url)` points at a file that exists, every package import is a
// declared dependency or peer dependency, a JS import of a file inside a package without an exports map names
// the file (Node and webpack resolve ES modules fully specified), and no file mentions the path of the checkout
// it was built in.
// Usage: node scripts/check-dist.mjs   (after `pnpm build`)
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const packagesDir = path.join(root, 'packages');
const problems = [];

const IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|@import\s+)(['"])([^'"]+)\1/g;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const META_URL_RE = /new URL\(\s*(['"])(\.{1,2}\/[^'"]+)\1,\s*import\.meta\.url\s*\)/g;

const packageName = (spec) =>
  spec
    .split('/')
    .slice(0, spec.startsWith('@') ? 2 : 1)
    .join('/');

// A pattern target (`./dist/themes/*.css`) must match at least one file.
const exportTargetExists = (pkgDir, target) => {
  if (!target.includes('*')) return fs.existsSync(path.join(pkgDir, target));
  const [prefix, suffix] = target.split('*');
  const dir = path.join(pkgDir, prefix.slice(0, prefix.lastIndexOf('/') + 1));
  const start = prefix.slice(prefix.lastIndexOf('/') + 1);
  return (
    fs.existsSync(dir) &&
    fs
      .readdirSync(dir)
      .some((name) => name.length > start.length + suffix.length && name.startsWith(start) && name.endsWith(suffix))
  );
};

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
    if (!exportTargetExists(path.join(packagesDir, dir), target)) {
      problems.push(`${manifest.name}: export target ${target} is missing`);
    }
  }

  for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(js|d\.ts|css)$/.test(entry.name)) continue;
    const file = path.join(entry.parentPath, entry.name);
    const source = fs.readFileSync(file, 'utf8');
    const where = `${manifest.name}: ${path.relative(dist, file)}`;
    if (source.includes(root) || path.relative(dist, file).includes(root.slice(1))) {
      problems.push(`${where}: refers to the checkout it was built in (${root})`);
    }
    const specs = [...source.matchAll(IMPORT_RE)].map((m) => m[2]);
    if (file.endsWith('.js')) specs.push(...[...source.matchAll(META_URL_RE)].map((m) => m[2]));
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
        const name = packageName(spec);
        if (!declared.has(name)) problems.push(`${where}: ${spec} is not a dependency`);
        else if (file.endsWith('.js') && spec !== name) {
          const depDir = path.join(packagesDir, dir, 'node_modules', name);
          const depManifest = path.join(depDir, 'package.json');
          const target = path.join(depDir, spec.slice(name.length));
          if (
            fs.existsSync(depManifest) &&
            JSON.parse(fs.readFileSync(depManifest, 'utf8')).exports == null &&
            !(fs.existsSync(target) && fs.statSync(target).isFile())
          ) {
            problems.push(`${where}: ${spec} isn't a file (${name} has no exports map, so ESM needs the full path)`);
          }
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('dist ok');
