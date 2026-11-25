// Splits every webpack chunk into one file per module: .cache/modules/<id>.js
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const SRC = path.resolve(process.argv[2] ?? '.cache/assets');
const OUT = path.resolve(process.argv[3] ?? '.cache/modules');
fs.mkdirSync(OUT, { recursive: true });

const isModuleMap = (node) =>
  node.type === 'ObjectExpression' &&
  node.properties.length > 0 &&
  node.properties.every(
    (p) =>
      p.type === 'Property' &&
      /^\d+$/.test(String(p.key.value ?? p.key.name)) &&
      (p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression'),
  );

const index = {};
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    continue;
  }
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (isModuleMap(node)) {
      for (const p of node.properties) {
        const id = String(p.key.value ?? p.key.name);
        const code = p.method ? `function${src.slice(p.key.end, p.value.end)}` : src.slice(p.value.start, p.value.end);
        fs.writeFileSync(path.join(OUT, `${id}.js`), `// chunk: ${file}\n(${code})\n`);
        (index[id] ??= []).push(file);
      }
      return;
    }
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
}
fs.writeFileSync(path.join(OUT, '_index.json'), JSON.stringify(index));
console.log(`${Object.keys(index).length} modules written to ${OUT}`);
