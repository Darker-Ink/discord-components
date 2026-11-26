// Parses every case of the markdown fixtures (scripts/fixtures/markdown) with Discord's parser (reference
// server) and with @discord-mana/markdown (playground) and diffs the ASTs.
//
//   node scripts/compare-markdown-ast.mjs [fixture...] [--verbose]
//
// Needs both servers: the playground (OURS_URL, default http://localhost:5173) and the reference renderer
// (REF_URL, default http://localhost:5174). Moment dates are compared as ISO strings.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OURS = process.env.OURS_URL ?? 'http://localhost:5173';
const REF = process.env.REF_URL ?? 'http://localhost:5174';
const DIR = path.resolve('scripts/fixtures/markdown');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const only = args.filter((arg) => !arg.startsWith('--'));
const names = (
  only.length > 0
    ? only
    : fs
        .readdirSync(DIR)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.slice(0, -5))
).sort();
const referenceSource = fs.readFileSync(path.join(DIR, 'reference.js'), 'utf8').trim().replace(/;$/, '');

// Runs in the page: a stable JSON form of an AST.
const serialize = (ast) => {
  const seen = new WeakSet();
  const normalize = (value) => {
    if (value == null || typeof value !== 'object') return typeof value === 'function' ? undefined : value;
    if (value._isAMomentObject) return { moment: value.toISOString() };
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.map(normalize);
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const normalized = normalize(value[key]);
      if (normalized !== undefined) result[key] = normalized;
    }
    return result;
  };
  return JSON.stringify(normalize(ast), null, 1);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;
let total = 0;
for (const name of names) {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8').replaceAll('{{assets}}', `${OURS}/messages`),
  );
  const ref = await browser.newPage();
  const ours = await browser.newPage();
  for (const page of [ref, ours]) if (fixture.now != null) await page.clock.setFixedTime(new Date(fixture.now));
  await ref.goto(`${REF}/`);
  await ref.evaluate(
    async ([source, data]) => {
      const render = (0, eval)(`(${source}\n)`);
      await render(ref, data);
    },
    [referenceSource, fixture.data],
  );
  await ours.goto(`${OURS}/?embed&collection=messages&story=markdown-fixtures&fixture=markdown/${name}`);
  await ours.waitForFunction(() => window.__markdownTest != null, null, { timeout: 30000 });
  let fixtureFailures = 0;
  for (let index = 0; index < fixture.data.cases.length; index++) {
    total++;
    const refAST = await ref.evaluate(
      ([index, serializeSource]) => (0, eval)(`(${serializeSource})`)(window.__markdownReference.parseToAST(index)),
      [index, serialize.toString()],
    );
    const ourAST = await ours.evaluate(
      ([fixtureName, index, serializeSource]) =>
        (0, eval)(`(${serializeSource})`)(window.__markdownTest.parse(fixtureName, index)),
      [`markdown/${name}`, index, serialize.toString()],
    );
    if (refAST !== ourAST) {
      failures++;
      fixtureFailures++;
      console.log(`✗ ${name}#${index} ${JSON.stringify(fixture.data.cases[index]).slice(0, 80)}`);
      const r = refAST.split('\n');
      const o = ourAST.split('\n');
      const at = r.findIndex((line, i) => line !== o[i]);
      console.log(`  first difference at line ${at}:\n  ref:  ${r[at]}\n  ours: ${o[at]}`);
      if (verbose) console.log(`--- ref\n${refAST}\n--- ours\n${ourAST}`);
    }
  }
  console.log(`${name}: ${fixture.data.cases.length - fixtureFailures}/${fixture.data.cases.length} ASTs identical`);
  await ref.close();
  await ours.close();
}
await browser.close();
console.log(`${total - failures}/${total} identical`);
process.exitCode = failures > 0 ? 1 : 0;
