// ANSI escape codes in ```ansi code blocks: SGR colours and decorations, as the client parses them.

const COLOR_NAMES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const;

const DECORATIONS: Record<number, string> = {
  1: 'bold',
  2: 'dim',
  3: 'italic',
  4: 'underline',
  7: 'reverse',
  8: 'hidden',
  9: 'strikethrough',
};

// eslint-disable-next-line no-control-regex
const ESCAPE_RE = /\x1B\[([0-?]*)([ -/]*)([@-~])/g;

export type AnsiColor =
  | { type: 'named'; name: (typeof COLOR_NAMES)[number] }
  | { type: 'rgb'; rgb: number[] }
  | { type: 'table'; index: number };

export interface AnsiSegment {
  value: string;
  position: number;
  foreground: AnsiColor | null;
  background: AnsiColor | null;
  decorations: Set<string>;
}

type Command =
  | { type: 'resetAll' | 'resetForegroundColor' | 'resetBackgroundColor' }
  | { type: 'setDecoration' | 'resetDecoration'; value: string }
  | { type: 'setForegroundColor' | 'setBackgroundColor'; value: AnsiColor };

const extendedColor = (params: string[]): AnsiColor | undefined => {
  const kind = params.shift();
  if (kind === '2') {
    const rgb = params.splice(0, 3).map((value) => Number.parseInt(value));
    if (rgb.length !== 3 || rgb.some((value) => Number.isNaN(value))) return;
    return { type: 'rgb', rgb };
  }
  if (kind === '5') {
    const index = params.shift();
    if (index) return { type: 'table', index: Number(index) };
  }
};

const toCommands = (params: string[]) => {
  const commands: Command[] = [];
  while (params.length > 0) {
    const param = params.shift();
    if (!param) continue;
    const code = Number.parseInt(param);
    if (Number.isNaN(code)) continue;
    if (code === 0) commands.push({ type: 'resetAll' });
    else if (code <= 9) {
      if (DECORATIONS[code]) commands.push({ type: 'setDecoration', value: DECORATIONS[code] });
    } else if (code <= 29) {
      const decoration = DECORATIONS[code - 20];
      if (decoration) {
        commands.push({ type: 'resetDecoration', value: decoration });
        if (decoration === 'dim') commands.push({ type: 'resetDecoration', value: 'bold' });
      }
    } else if (code <= 37)
      commands.push({ type: 'setForegroundColor', value: { type: 'named', name: COLOR_NAMES[code - 30] } });
    else if (code === 38) {
      const color = extendedColor(params);
      if (color) commands.push({ type: 'setForegroundColor', value: color });
    } else if (code === 39) commands.push({ type: 'resetForegroundColor' });
    else if (code <= 47)
      commands.push({ type: 'setBackgroundColor', value: { type: 'named', name: COLOR_NAMES[code - 40] } });
    else if (code === 48) {
      const color = extendedColor(params);
      if (color) commands.push({ type: 'setBackgroundColor', value: color });
    } else if (code === 49) commands.push({ type: 'resetBackgroundColor' });
    else if (code === 53) commands.push({ type: 'setDecoration', value: 'overline' });
    else if (code === 55) commands.push({ type: 'resetDecoration', value: 'overline' });
    else if (code >= 90 && code <= 97)
      commands.push({ type: 'setForegroundColor', value: { type: 'named', name: COLOR_NAMES[code - 90 + 8] } });
    else if (code >= 100 && code <= 107)
      commands.push({ type: 'setBackgroundColor', value: { type: 'named', name: COLOR_NAMES[code - 100 + 8] } });
  }
  return commands;
};

/** Splits text into runs with the colours and decorations its escape codes set. */
export const parseAnsi = (text: string) => {
  let foreground: AnsiColor | null = null;
  let background: AnsiColor | null = null;
  const decorations = new Set<string>();
  const segments: AnsiSegment[] = [];
  let position = 0;
  do {
    ESCAPE_RE.lastIndex = position;
    const match = ESCAPE_RE.exec(text);
    const next = match
      ? {
          sequence: match[3] !== 'm' || match[2] || /^[<=>?]/.test(match[1]) ? [] : match[1].split(';'),
          startPosition: match.index,
          position: match.index + match[0].length,
        }
      : { sequence: undefined, startPosition: undefined, position: text.length };
    const value = next.sequence ? text.substring(position, next.startPosition) : text.substring(position);
    if (value.length > 0) segments.push({ value, position, foreground, background, decorations: new Set(decorations) });
    if (next.sequence) {
      const commands = toCommands(next.sequence);
      for (const command of commands) {
        if (command.type === 'resetAll') {
          foreground = null;
          background = null;
          decorations.clear();
        } else if (command.type === 'resetForegroundColor') foreground = null;
        else if (command.type === 'resetBackgroundColor') background = null;
        else if (command.type === 'resetDecoration') decorations.delete(command.value);
      }
      for (const command of commands) {
        if (command.type === 'setForegroundColor') foreground = command.value;
        else if (command.type === 'setBackgroundColor') background = command.value;
        else if (command.type === 'setDecoration') decorations.add(command.value);
      }
    }
    position = next.position;
  } while (position < text.length);
  return segments;
};

const toHex = (rgb: number[]) =>
  `#${rgb.map((value) => Math.max(0, Math.min(value, 255)).toString(16).padStart(2, '0')).join('')}`;

/** Maps ANSI colours to CSS values: the 16 named colours to the theme's `--custom-ansi-color-*` variables. */
export const createAnsiPalette = (named: Record<(typeof COLOR_NAMES)[number], string>) => {
  let table: string[] | null = null;
  const colorTable = () => {
    if (table) return table;
    table = COLOR_NAMES.map((name) => named[name]);
    const steps = [0, 95, 135, 175, 215, 255];
    for (const r of steps) for (const g of steps) for (const b of steps) table.push(toHex([r, g, b]));
    for (let i = 0, gray = 8; i < 24; i++, gray += 10) table.push(toHex([gray, gray, gray]));
    return table;
  };
  return (color: AnsiColor) => {
    switch (color.type) {
      case 'named':
        return named[color.name];
      case 'rgb':
        return toHex(color.rgb);
      case 'table':
        return colorTable()[color.index];
    }
  };
};

export const ANSI_COLORS = createAnsiPalette(
  Object.fromEntries(COLOR_NAMES.map((name, i) => [name, `var(--custom-ansi-color-${i})`])) as Record<
    (typeof COLOR_NAMES)[number],
    string
  >,
);

/** The inline style of a run. */
export const ansiStyle = (segment: AnsiSegment, palette: (color: AnsiColor) => string | undefined) => {
  const style: Record<string, string> = {};
  if (segment.foreground != null) style.color = palette(segment.foreground)!;
  if (segment.background != null) style.backgroundColor = palette(segment.background)!;
  if (segment.decorations.has('bold')) style.fontWeight = 'bold';
  if (segment.decorations.has('italic')) style.fontStyle = 'italic';
  const lines: string[] = [];
  if (segment.decorations.has('underline')) lines.push('underline');
  if (segment.decorations.has('strikethrough')) lines.push('line-through');
  if (segment.decorations.has('overline')) lines.push('overline');
  if (lines.length > 0) style.textDecorationLine = lines.join(' ');
  return Object.keys(style).length > 0 ? style : undefined;
};
