// Pretty-prints a webpack module from .cache/modules.
//
//   node scripts/show-module.mjs <id> [--deps]
//
// --deps lists the module's requires with the first export names of each, which is usually
// enough to tell Text from Stack from an icon.
import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';

const MODULES = path.resolve(process.env.MODULES_DIR ?? '.cache/modules');
const [id, flag] = process.argv.slice(2);
const read = (moduleId) => fs.readFileSync(path.join(MODULES, `${moduleId}.js`), 'utf8');

const src = read(id);
const body = src.replace(/^\/\/.*\n/, '');
console.log(src.match(/^\/\/.*/)[0]);
try {
  console.log(await prettier.format(`(${body.trim().replace(/^\(|\)$/g, '')})`, { parser: 'babel', printWidth: 120 }));
} catch {
  console.log(body);
}

if (flag === '--deps') {
  const req = body.match(/^\((?:function)?\s*\(([\w$]*),?([\w$]*),?([\w$]*)\)/)?.[3];
  const ids = req
    ? [...new Set([...body.matchAll(new RegExp(`(?<![\\w$.])${req}\\((\\d+)\\)`, 'g'))].map((m) => m[1]))]
    : [];
  for (const dep of ids) {
    if (!fs.existsSync(path.join(MODULES, `${dep}.js`))) {
      console.log(`${dep}: (not in build)`);
      continue;
    }
    const dsrc = read(dep);
    const exportsList = [...dsrc.matchAll(/[{,]([\w$]+):(?:\(\)=>|function)/g)].map((m) => m[1]).slice(0, 8);
    const hint = dsrc.match(
      /"data-mana-component":"([\w-]+)"|displayName="([\w]+)"|exports=\{([\w-]+):"[\w-]+_([\w-]{6})"/,
    );
    console.log(
      `${dep}: exports ${exportsList.join(',') || '?'} ${hint ? `(${hint.slice(1).filter(Boolean).join(' ')})` : ''}`,
    );
  }
}
