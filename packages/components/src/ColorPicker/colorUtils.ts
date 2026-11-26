import chroma from 'chroma-js';

// Discord stores colors as 24-bit integers (0xRRGGBB); these convert them for CSS and the picker.

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// The role color for "no color" (a member with no colored role).
export const DEFAULT_ROLE_COLOR = 0x99aab5;

const pad = (hex: string) => (hex.length === 1 ? `0${hex}` : hex);

export const int2hex = (color: number) =>
  color <= 0xffffff
    ? `#${pad(((color >> 16) & 255).toString(16))}${pad(((color >> 8) & 255).toString(16))}${pad((color & 255).toString(16))}`
    : `#${pad(((color >> 24) & 255).toString(16))}${pad(((color >> 16) & 255).toString(16))}${pad(((color >> 8) & 255).toString(16))}`;

export const hex2int = (hex: string) => chroma(hex).num();

export const isValidHex = (hex: string) => chroma.valid(hex);

export const int2rgbArray = (color: number): [number, number, number] => [
  (color >> 16) & 255,
  (color >> 8) & 255,
  color & 255,
];

export const int2hsl = (color: number): HSLColor => {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  let h = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  h = Math.round(60 * h);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  return { h, s: +(delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))).toFixed(3), l: +l.toFixed(3) };
};

export const int2hsla = (color: number, useSaturationFactor = false, saturation: number | null = null, alpha = 1) => {
  const { h, s, l } = int2hsl(color);
  const sPercent = +(100 * s).toFixed(1);
  const lPercent = +(100 * l).toFixed(1);
  if (useSaturationFactor)
    return `hsla(${h}, calc(var(--saturation-factor, 1) * ${sPercent}%), ${lPercent}%, ${alpha})`;
  if (saturation != null) return `hsla(${h}, ${saturation * sPercent}%, ${lPercent}%, ${alpha})`;
  return `hsla(${h}, ${sPercent}%, ${lPercent}%, ${alpha})`;
};

// Space-separated HSL channels, for `hsl(var(--x) / alpha)` custom properties.
export const int2hslRaw = (color: number, useSaturationFactor = false, saturation: number | null = null) => {
  const { h, s, l } = int2hsl(color);
  const sPercent = +(100 * s).toFixed(1);
  const lPercent = +(100 * l).toFixed(1);
  if (useSaturationFactor) return `${h} calc(var(--saturation-factor, 1) * ${sPercent}%) ${lPercent}%`;
  if (saturation != null) return `${h} ${saturation * sPercent}% ${lPercent}%`;
  return `${h} ${sPercent}% ${lPercent}%`;
};

export const int2rgba = (color: number, alpha?: number | null) => {
  const a = alpha ?? ((color >> 24) & 255) / 255;
  return `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${a})`;
};

// 0 for white, 1 for black: how dark a color looks.
export const getDarkness = (color: number) =>
  1 - (0.299 * ((color >> 16) & 255) + 0.587 * ((color >> 8) & 255) + 0.114 * (color & 255)) / 255;

const relativeLuminance = (r: number, g: number, b: number) => {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const getContrastRatio = (a: number, b: number) => {
  const la = relativeLuminance(...int2rgbArray(a));
  const lb = relativeLuminance(...int2rgbArray(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export const hex2rgba = (hex: string, alpha: number | null = null) => {
  if (!chroma.valid(hex)) return null;
  const color = chroma(hex);
  return color.alpha(alpha ?? color.alpha()).css();
};

export const getGradientBackground = (colors: readonly (number | null | undefined)[], degrees: number) => {
  const stops = colors
    .map((color, index) => {
      const position = colors.length > 1 ? (index / (colors.length - 1)) * 100 : 0;
      return `${int2hex(color ?? DEFAULT_ROLE_COLOR)} ${position}%`;
    })
    .join(', ');
  return `linear-gradient(${degrees}deg, ${stops})`;
};
