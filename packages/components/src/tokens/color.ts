// The few color operations Discord's tokens use, computed the way chroma-js 2.4 (which Discord
// bundles) does them, so resolved values match the client to the last digit.

type Rgba = [number, number, number, number];
type Hsla = [number, number, number, number];

const round = Math.round;
const clip = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round2 = (value: number) => round(value * 100) / 100;

const parseHex = (hex: string): Rgba => {
  const digits = hex.replace(/^#/, '');
  const value = parseInt(digits, 16);
  if (digits.length === 8) {
    return [
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      round(((value & 0xff) / 0xff) * 100) / 100,
    ];
  }
  return [value >> 16, (value >> 8) & 0xff, value & 0xff, 1];
};

const rgbToHsl = ([red, green, blue, alpha]: Rgba): Hsla => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const l = (max + min) / 2;
  let s: number;
  let h = Number.NaN;
  if (max === min) s = 0;
  else s = l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min);
  if (r === max) h = (g - b) / (max - min);
  else if (g === max) h = 2 + (b - r) / (max - min);
  else if (b === max) h = 4 + (r - g) / (max - min);
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l, alpha];
};

const hslToRgb = ([h, s, l, alpha]: Hsla): Rgba => {
  if (s === 0) return [l * 255, l * 255, l * 255, alpha];
  const t2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const t1 = 2 * l - t2;
  const hue = h / 360;
  const channels = [hue + 1 / 3, hue, hue - 1 / 3].map((t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (6 * t < 1) return t1 + (t2 - t1) * 6 * t;
    if (2 * t < 1) return t2;
    if (3 * t < 2) return t1 + (t2 - t1) * (2 / 3 - t) * 6;
    return t1;
  });
  return [round(channels[0] * 255), round(channels[1] * 255), round(channels[2] * 255), alpha];
};

export class Color {
  readonly rgba: Rgba;

  constructor(rgba: Rgba) {
    this.rgba = [clip(rgba[0], 0, 255), clip(rgba[1], 0, 255), clip(rgba[2], 0, 255), clip(rgba[3], 0, 1)];
  }

  static fromHex(hex: string) {
    return new Color(parseHex(hex));
  }

  alpha(): number;
  alpha(value: number): Color;
  alpha(value?: number) {
    if (value === undefined) return this.rgba[3];
    return new Color([this.rgba[0], this.rgba[1], this.rgba[2], value]);
  }

  saturation() {
    return rgbToHsl(this.rgba)[1];
  }

  withSaturation(value: number) {
    const hsl = rgbToHsl(this.rgba);
    hsl[1] = value;
    return new Color(hslToRgb(hsl));
  }

  hex(mode: 'auto' | 'rgb' | 'rgba' = 'auto') {
    const [r, g, b, a] = this.rgba;
    const resolvedMode = mode === 'auto' ? (a < 1 ? 'rgba' : 'rgb') : mode;
    const rgb = `000000${((round(r) << 16) | (round(g) << 8) | round(b)).toString(16)}`.slice(-6);
    const alpha = `0${round(a * 255).toString(16)}`.slice(-2);
    return resolvedMode === 'rgba' ? `#${rgb}${alpha}` : `#${rgb}`;
  }

  hslCss() {
    const [h, s, l, a] = rgbToHsl(this.rgba);
    const parts: (string | number)[] = [round2(h || 0), `${round2(s * 100)}%`, `${round2(l * 100)}%`];
    if (a < 1) return `hsla(${[...parts, a].join(',')})`;
    return `hsl(${parts.join(',')})`;
  }

  num() {
    const [r, g, b] = this.rgba;
    return (r << 16) + (g << 8) + b;
  }

  rgbaArray(): Rgba {
    const [r, g, b, a] = this.rgba;
    return [round(r), round(g), round(b), a];
  }
}
