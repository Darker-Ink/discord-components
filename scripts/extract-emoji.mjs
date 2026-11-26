// Writes the client's unicode emoji table (module 13474: names, surrogates and the lookup maps the markdown
// rules use) to packages/markdown/src/emoji/emojiData.json, without sprite and category data.
//
//   node scripts/extract-emoji.mjs
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve('.cache/modules/13474.js'), 'utf8').replace(/^\/\/.*\n/, '');
const module = { exports: {} };
(0, eval)(src)(module, module.exports, () => ({}));
const { emojis, nameToEmoji, surrogateToEmoji } = module.exports;

// Most map entries follow from the table (every name of an emoji, the first emoji with a surrogate); only the
// others (skin tone aliases, surrogates without their variation selector) are stored.
const derivedNames = {};
emojis.forEach((emoji, index) => emoji.names.forEach((name) => (derivedNames[name] = index)));
const derivedSurrogates = {};
emojis.forEach((emoji, index) => {
  if (!(emoji.surrogates in derivedSurrogates)) derivedSurrogates[emoji.surrogates] = index;
});
const extraNames = Object.fromEntries(Object.entries(nameToEmoji).filter(([name, i]) => derivedNames[name] !== i));
const extraSurrogates = Object.fromEntries(
  Object.entries(surrogateToEmoji).filter(([surrogate, i]) => derivedSurrogates[surrogate] !== i),
);
if (Object.keys(derivedNames).some((name) => !(name in nameToEmoji)))
  throw new Error('a name is missing from nameToEmoji');

const out = path.resolve('packages/markdown/src/emoji/emojiData.json');
fs.writeFileSync(
  out,
  JSON.stringify({
    emojis: emojis.map((emoji) => [emoji.names.join(','), emoji.surrogates]),
    extraNames,
    extraSurrogates,
  }) + '\n',
);
console.log(`${emojis.length} emojis -> ${path.relative(process.cwd(), out)} (${fs.statSync(out).size} bytes)`);
