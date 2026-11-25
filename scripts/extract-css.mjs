// Rebuilds a Discord CSS module as a local .module.css.
//
//   node scripts/extract-css.mjs <suffix | class-map-module-id> [--out file]
//
// Discord compiles `.button` in Button.module.css to `.button_F7qvhY`. Every rule that
// touches the suffix is copied verbatim (with its @media/@supports wrappers), the suffix
// is stripped, and classes from other modules or global classes are wrapped in :global()
// and listed on stderr so they can be resolved by hand.
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const ASSETS = path.resolve(process.env.ASSETS_DIR ?? '.cache/assets');
const MODULES = path.resolve(process.env.MODULES_DIR ?? '.cache/modules');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args.splice(outIndex, 2)[1] : null;
const target = args[0];
if (!target) {
  console.error('usage: extract-css.mjs <suffix | class-map-module-id> [--out file]');
  process.exit(1);
}

let suffix = target;
if (/^\d+$/.test(target)) {
  const mod = fs.readFileSync(path.join(MODULES, `${target}.js`), 'utf8');
  const suffixes = new Set([...mod.matchAll(/"[\w-]+_([\w-]{6})"/g)].map((m) => m[1]));
  if (suffixes.size !== 1) throw new Error(`module ${target} has suffixes: ${[...suffixes].join(', ')}`);
  [suffix] = suffixes;
}

// Class names may contain CSS escapes, e.g. `.body-md\/medium_RAOoio`.
const HASHED_CLASS = /\.(-?(?:[A-Za-z_]|\\.)(?:[\w-]|\\.)*?)_([\w-]{6})(?![\w-])/g;
const ANY_CLASS = /\.(-?(?:[A-Za-z_]|\\.)(?:[\w-]|\\.)*)/g;
const own = (name) => name.endsWith(`_${suffix}`);
const foreign = new Set();
const globals = new Set();

const rewriteSelector = (selector) =>
  selector.replace(ANY_CLASS, (match, name) => {
    if (own(name)) return `.${name.slice(0, -(suffix.length + 1))}`;
    if (/_[\w-]{6}$/.test(name)) foreign.add(name);
    else globals.add(name);
    return `:global(.${name})`;
  });

const out = postcss.root();
const sources = new Set();
for (const file of fs.readdirSync(ASSETS).filter((f) => f.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(ASSETS, file), 'utf8');
  if (!css.includes(`_${suffix}`)) continue;
  sources.add(file);
  const root = postcss.parse(css);
  root.walk((node) => {
    const inKeyframes = node.parent?.type === 'atrule' && /keyframes$/.test(node.parent.name);
    const isOwnRule =
      node.type === 'rule' && !inKeyframes && [...node.selector.matchAll(HASHED_CLASS)].some((m) => m[2] === suffix);
    const isOwnKeyframes = node.type === 'atrule' && /keyframes$/.test(node.name) && node.params.endsWith(`_${suffix}`);
    if (!isOwnRule && !isOwnKeyframes) return;
    const copy = node.clone();
    if (isOwnRule) copy.selector = rewriteSelector(copy.selector);
    else copy.params = copy.params.slice(0, -(suffix.length + 1));
    copy.walkDecls((decl) => {
      if (/animation(-name)?$/.test(decl.prop)) decl.value = decl.value.replaceAll(`_${suffix}`, '');
    });
    let wrapped = copy;
    for (let parent = node.parent; parent && parent.type === 'atrule'; parent = parent.parent) {
      wrapped = parent.clone({ nodes: [] }).append(wrapped);
    }
    out.append(wrapped);
  });
}

const result = out.toString();
if (outFile) fs.writeFileSync(outFile, `${result}\n`);
else process.stdout.write(`${result}\n`);
console.error(`suffix ${suffix} from ${[...sources].join(', ')}`);
if (foreign.size) console.error(`foreign module classes: ${[...foreign].join(' ')}`);
if (globals.size) console.error(`global classes: ${[...globals].join(' ')}`);
