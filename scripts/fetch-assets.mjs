// Downloads every web asset of a Discord build: the entry assets listed in /app,
// then every lazy chunk referenced by webpack chunk maps, repeated until no new files appear.
import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = process.env.DISCORD_ORIGIN ?? 'https://canary.discord.com';
const OUT = path.resolve(process.env.ASSETS_DIR ?? '.cache/assets');
const CONCURRENCY = 32;

// {123:"abcdef…",45e3:"…"}[e]+".js" — keys may be exponent literals.
const CHUNK_MAP_RE = /\(\{((?:(?:[\de]{1,12}|"[\w.-]+"):"[0-9a-f]{8,32}",?){2,})\}\)\[\w+\]\+"\.(js|css)"/g;
// if(123===e)return""+e+".abcdef….js"
const CHUNK_IF_RE = /if\((\d+)===e\)return""\+e\+"\.([0-9a-f]+)\.(js|css)"/g;
const LITERAL_RE = /"\/assets\/([\w.-]+\.(?:js|css|woff2|wasm|svg|png|webp))"/g;
const HTML_RE = /(?:src|href)="\/assets\/([^"]+)"/g;

const fetchOk = async (url) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  return null;
};

const extractRefs = (text) => {
  const refs = new Set();
  for (const m of text.matchAll(CHUNK_MAP_RE))
    for (const [, h] of m[1].matchAll(/:"([0-9a-f]{8,32})"/g)) refs.add(`${h}.${m[2]}`);
  for (const m of text.matchAll(CHUNK_IF_RE)) refs.add(`${m[1]}.${m[2]}.${m[3]}`);
  for (const m of text.matchAll(LITERAL_RE)) refs.add(m[1]);
  return refs;
};

const pool = async (items, fn) => {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await fn(queue.shift());
    }),
  );
};

await fs.mkdir(OUT, { recursive: true });
const html = (await fetchOk(`${ORIGIN}/app`))?.toString();
if (!html) throw new Error(`could not fetch ${ORIGIN}/app`);
await fs.writeFile(path.join(OUT, '..', 'app.html'), html);

const known = new Set([...html.matchAll(HTML_RE)].map((m) => m[1]));
const done = new Set(await fs.readdir(OUT));
let missing = [];
for (let round = 1; ; round++) {
  const todo = [...known].filter((f) => !done.has(f));
  console.log(`round ${round}: ${known.size} known, ${todo.length} to fetch`);
  if (!todo.length) break;
  await pool(todo, async (file) => {
    const buf = await fetchOk(`${ORIGIN}/assets/${file}`);
    done.add(file);
    if (!buf) return missing.push(file);
    await fs.writeFile(path.join(OUT, file), buf);
  });
  for (const file of done) {
    if (!file.endsWith('.js')) continue;
    const text = await fs.readFile(path.join(OUT, file), 'utf8').catch(() => '');
    for (const ref of extractRefs(text)) known.add(ref);
  }
}
const build = html.match(/BUILD_NUMBER":"(\d+)"/)?.[1];
console.log(`build ${build}: ${done.size - missing.length} files in ${OUT}, ${missing.length} missing`);
