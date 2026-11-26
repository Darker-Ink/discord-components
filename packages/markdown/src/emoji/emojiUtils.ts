import emojiData from './emojiData.json';

// The client's unicode emoji helpers: shortcode <-> surrogate lookups and splitting text into text and emoji runs.

interface EmojiTable {
  emojis: [names: string, surrogates: string][];
  extraNames: Record<string, number>;
  extraSurrogates: Record<string, number>;
}

const table = emojiData as unknown as EmojiTable;

let nameToEmoji: Map<string, number> | null = null;
let surrogateToEmoji: Map<string, number> | null = null;

const buildMaps = () => {
  nameToEmoji = new Map();
  surrogateToEmoji = new Map();
  table.emojis.forEach(([names, surrogates], index) => {
    for (const name of names.split(',')) nameToEmoji!.set(name, index);
    if (!surrogateToEmoji!.has(surrogates)) surrogateToEmoji!.set(surrogates, index);
  });
  for (const [name, index] of Object.entries(table.extraNames)) nameToEmoji.set(name, index);
  for (const [surrogate, index] of Object.entries(table.extraSurrogates)) surrogateToEmoji.set(surrogate, index);
};

const byName = (name: string) => {
  if (nameToEmoji == null) buildMaps();
  const index = nameToEmoji!.get(name);
  return index == null ? null : table.emojis[index];
};

const bySurrogate = (surrogate: string) => {
  if (surrogateToEmoji == null) buildMaps();
  const index = surrogateToEmoji!.get(surrogate);
  return index == null ? null : table.emojis[index];
};

const firstName = (emoji: [string, string]) => emoji[0].split(',')[0];

export const EMOJI_NAME_RE = /^:([^\s:]+?(?:::skin-tone-\d)?):/;
export const EMOJI_NAME_AND_DIVERSITY_RE = /^:([^\s:]+?(?:::skin-tone-\d)?):/;

// The client's regex verbatim: its classes list combining marks and variation selectors on purpose.
const HAS_UNICODE_OR_EMOJI_RE =
  // eslint-disable-next-line no-misleading-character-class
  /[\u200D\ud800-\udfff\u0300-\u036F\uFE20-\uFE2F\u20D0-\u20FF\uFE0E\uFE0F\u270B\u2B50\u2728\u26A1\u26C5\u26C4\u2614\u2615\u26BD\u26BE\u26F3\u26F5\u2693\u26FD\u26F2\u26FA\u26EA\u231A\u23F0\u231B\u23F3\u26CE\u2648\u2649\u264A\u264B\u264C\u264D\u264E\u264F\u2650\u2651\u2652\u2653\u270A\u274C\u2B55\u26D4\u2757\u2755\u2753\u2754\u2705\u274E\u267F\u23E9\u23EA\u23EB\u23EC\u2795\u2796\u2797\u27B0\u27BF\u26AA\u26AB\u25FE\u25FD\u2B1B\u2B1C\u26A7]/;

// Splits a string into grapheme-like symbols (emoji with modifiers, flags and ZWJ sequences stay together).
const SYMBOL_RE =
  /\ud83c[\udffb-\udfff](?=\ud83c[\udffb-\udfff])|(?:[^\ud800-\udfff][\u0300-\u036F\uFE20-\uFE2F\u20D0-\u20FF]?|[\u0300-\u036F\uFE20-\uFE2F\u20D0-\u20FF]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff])[\uFE0E\uFE0F]?(?:[\u0300-\u036F\uFE20-\uFE2F\u20D0-\u20FF]|\ud83c[\udffb-\udfff])?(?:\u200D(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\uFE0E\uFE0F]?(?:[\u0300-\u036F\uFE20-\uFE2F\u20D0-\u20FF]|\ud83c[\udffb-\udfff])?)*/g;

export const contentHasUnicodeOrEmoji = (text: string) => HAS_UNICODE_OR_EMOJI_RE.test(text);

export type InlineEmojiPart = { type: 'text'; text: string } | { type: 'emoji'; surrogate: string; emojiName: string };

const toPart = (symbol: string): InlineEmojiPart => {
  const emoji = bySurrogate(symbol);
  return emoji != null
    ? { type: 'emoji', surrogate: symbol, emojiName: `:${firstName(emoji)}:` }
    : { type: 'text', text: symbol };
};

const CANCEL_TAG = String.fromCodePoint(917631);
const BLACK_FLAG = String.fromCodePoint(127988);
const TAG_LETTER_RE = /^[\u{E0061}-\u{E007A}]$/u;

/** Splits text into runs of plain text and known unicode emojis (subdivision flags included). */
export const findInlineEmojisFromSurrogates = (text: string, force?: boolean): InlineEmojiPart[] => {
  if (force !== true && !contentHasUnicodeOrEmoji(text)) return [{ type: 'text', text }];
  let flag = '';
  const parts: InlineEmojiPart[] = [];
  const symbols = text.match(SYMBOL_RE) ?? [];
  for (let i = 0; i < symbols.length; i++) {
    let symbol = symbols[i];
    if (flag !== '') {
      if (symbol === CANCEL_TAG) {
        symbol = flag + symbol;
        flag = '';
      } else if (TAG_LETTER_RE.test(symbol)) {
        flag += symbol;
        continue;
      } else {
        parts.push(toPart(flag));
        flag = '';
      }
    } else if (symbol === BLACK_FLAG) {
      flag = symbol;
      continue;
    }
    const part = toPart(symbol);
    const last = parts[parts.length - 1];
    if (last != null && part.type === 'text' && last.type === 'text') {
      last.text += part.text;
      continue;
    }
    parts.push(part);
  }
  if (flag !== '') parts.push(toPart(flag));
  return parts;
};

export const convertNameToSurrogate = (name: string, fallback = '') => byName(name)?.[1] ?? fallback;

export const convertSurrogateToName = (surrogate: string, colons = true, fallback = '') => {
  const emoji = bySurrogate(surrogate);
  const name = emoji != null ? firstName(emoji) : fallback;
  return colons ? `:${name}:` : name;
};

export const translateSurrogatesToInlineEmoji = (text: string) =>
  findInlineEmojisFromSurrogates(text)
    .map((part) => (part.type === 'text' ? part.text : part.emojiName))
    .join('');

export const translateInlineEmojiToSurrogates = (text: string) =>
  text.replace(EMOJI_NAME_AND_DIVERSITY_RE, (match, name: string) => convertNameToSurrogate(name, match));
