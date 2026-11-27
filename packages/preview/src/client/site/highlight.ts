// A small highlighter for the docs' curl, JavaScript and JSON samples, colored with Discord's code tokens.

export type TokenKind = 'comment' | 'string' | 'key' | 'number' | 'keyword' | 'literal' | 'plain';

const PATTERN =
  /((?<![:\w])\/\/[^\n]*|^\s*#[^\n]*)|("(?:\\.|[^"\\\n])*"(?=\s*:))|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:const|let|await|async|return|if|new|import|from|export|function|throw)\b)|(\b(?:true|false|null|undefined)\b)/gm;

const KINDS: TokenKind[] = ['comment', 'key', 'string', 'number', 'keyword', 'literal'];

export const highlight = (code: string) => {
  const tokens: { kind: TokenKind; text: string }[] = [];
  let last = 0;
  for (const match of code.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'plain', text: code.slice(last, index) });
    const group = match.slice(1).findIndex((value) => value != null);
    tokens.push({ kind: KINDS[group] ?? 'plain', text: match[0] });
    last = index + match[0].length;
  }
  if (last < code.length) tokens.push({ kind: 'plain', text: code.slice(last) });
  return tokens;
};
