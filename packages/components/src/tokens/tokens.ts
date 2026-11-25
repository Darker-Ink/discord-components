import {
  LAYOUT,
  MODULES,
  RADII,
  RAW_COLORS,
  SEMANTIC_COLORS,
  SEMANTIC_COLOR_EXPERIMENTS,
  SEMANTIC_COLOR_HIGH_CONTRAST,
  SHADOWS,
  SPACE,
  SPACE_PX,
  SPACING,
  ThemeTypes,
  type ColorRef,
  type DensityTable,
  type DensityValues,
  type ShadowValue,
  type Theme,
  type TokenDensity,
} from '@discord-components/tokens';
import { Color } from './color';

// What a token is resolved against; `useToken` fills it in from the surrounding contexts.
export interface TokenContext {
  theme?: Theme | string;
  saturation?: number;
  enabledExperiments?: readonly string[];
  density?: TokenDensity;
  highContrastModeEnabled?: boolean;
}

export interface ColorFormatOptions {
  opacity?: number;
}

export interface ResolvedColor {
  // `#rrggbbaa`, the format react-spring interpolates.
  spring: (options?: ColorFormatOptions) => string;
  hsl: (options?: ColorFormatOptions) => string;
  hex: (options?: ColorFormatOptions) => string;
  int: (options?: ColorFormatOptions) => number;
  rgba: (options?: ColorFormatOptions) => [number, number, number, number];
}

export interface ColorToken {
  css: string;
  resolve: (context: TokenContext) => ResolvedColor;
}

export interface ShadowToken {
  css: string;
  resolve: (context: TokenContext) => ShadowValue;
}

export interface ValueToken<T> {
  resolve: (context: TokenContext) => T;
}

const THEMES = new Set<string>(Object.values(ThemeTypes));
const isTheme = (theme: unknown): theme is Theme => typeof theme === 'string' && THEMES.has(theme);
const themeOrDefault = (theme: unknown): Theme => (isTheme(theme) ? theme : ThemeTypes.DARK);

const cssVar = (name: string) => `var(--${name.toLowerCase().replace(/_/g, '-')})`;

const mapValues = <T, U>(object: Record<string, T>, fn: (value: T, key: string) => U) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fn(value, key)]));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const adjust = (color: Color, saturation: number | undefined, { opacity }: ColorFormatOptions) => {
  const alpha = clamp(opacity ?? 1, 0, 1);
  let out = color;
  if (saturation !== 1) out = out.withSaturation(out.saturation() * (saturation as number));
  if (alpha !== 1) out = out.alpha(out.alpha() * alpha);
  return out;
};

const formats = (color: Color, saturation: number | undefined): ResolvedColor => ({
  spring: (options = {}) => adjust(color, saturation, options).hex('rgba'),
  hsl: (options = {}) => adjust(color, saturation, options).hslCss(),
  hex: (options = {}) => adjust(color, saturation, options).hex(),
  int: (options = {}) => {
    const out = adjust(color, saturation, options);
    const value = out.num();
    return out.alpha() !== 1 ? (value << 8) | Math.round(255 * out.alpha()) : value;
  },
  rgba: (options = {}) => adjust(color, saturation, options).rgbaArray(),
});

type RawColorName = keyof typeof RAW_COLORS;
type SemanticColorName = keyof typeof SEMANTIC_COLORS;

const parsedRawColors = mapValues(RAW_COLORS, (hex) => Color.fromHex(hex));

const unsafe_rawColors = mapValues(RAW_COLORS, (_hex, name): ColorToken => ({
  css: cssVar(name),
  resolve: (context) => formats(parsedRawColors[name], context?.saturation ?? 1),
})) as Record<RawColorName, ColorToken>;

const colors = mapValues(
  SEMANTIC_COLORS as Record<string, Partial<Record<Theme, ColorRef>>>,
  (value, name): ColorToken => ({
    css: cssVar(name),
    resolve: (context) => {
      const theme = themeOrDefault(context.theme);
      let { raw, opacity } = value[theme] as Required<ColorRef>;
      const experimentOverrides = SEMANTIC_COLOR_EXPERIMENTS[name];
      if (experimentOverrides != null && context.enabledExperiments != null && context.enabledExperiments.length > 0) {
        for (const experiment of context.enabledExperiments) {
          const override = experimentOverrides[experiment]?.[theme];
          if (override != null) {
            raw = override.raw ?? raw;
            opacity = override.opacity ?? opacity;
          }
        }
      }
      if (context.highContrastModeEnabled === true) {
        const override = SEMANTIC_COLOR_HIGH_CONTRAST[name]?.[theme];
        if (override != null) {
          raw = override.raw ?? raw;
          opacity = override.opacity ?? opacity;
        }
      }
      if (opacity === 1) return unsafe_rawColors[raw as RawColorName].resolve(context);
      let color = parsedRawColors[raw];
      if (color.alpha() !== 0 && opacity !== 1) color = color.alpha(opacity);
      return formats(color, context.saturation);
    },
  }),
) as Record<SemanticColorName, ColorToken>;

const shadows = mapValues(SHADOWS as Record<string, Record<Theme, ShadowValue>>, (value, name): ShadowToken => ({
  css: cssVar(name),
  resolve: (context) => {
    const { boxShadow, filter, nativeStyles } = value[themeOrDefault(context.theme)];
    return { boxShadow, filter, nativeStyles };
  },
})) as Record<keyof typeof SHADOWS, ShadowToken>;

const byDensity = <T>(values: DensityValues<T>, density: TokenDensity | undefined) =>
  density != null && density in values ? values[density] : values.fallback;

const modules = mapValues(MODULES as Record<string, Record<string, DensityTable<unknown>>>, (group) =>
  mapValues(group, (table): ValueToken<unknown> => ({
    resolve: ({ enabledExperiments = [], density }) => {
      for (const experiment of enabledExperiments) {
        const values = table.experiments?.[experiment];
        if (values != null) return byDensity(values, density);
      }
      return byDensity(table.default, density);
    },
  })),
) as { [Group in keyof typeof MODULES]: { [Name in keyof (typeof MODULES)[Group]]: ValueToken<unknown> } };

const space = {
  ...mapValues(SPACE as Record<string, { css: string } & DensityValues<number>>, (token) => ({
    css: token.css,
    resolve: ({ density }: TokenContext) => byDensity(token, density),
  })),
  ...mapValues(SPACE_PX as Record<string, number>, (value) => `${value}px`),
} as { [Name in keyof typeof SPACE]: { css: string; resolve: (context: TokenContext) => number } } & {
  [Name in keyof typeof SPACE_PX]: string;
};

// Discord's design tokens as JS values: `css` gives the CSS variable, `resolve` the concrete value
// for a theme (and saturation, density, experiments), for places CSS variables can't go.
export const tokens = {
  themes: ThemeTypes,
  modules,
  colors,
  unsafe_rawColors,
  shadows,
  radii: RADII,
  spacing: mapValues(SPACING, (value) => `${value}px`) as Record<keyof typeof SPACING, string>,
  layout: mapValues(LAYOUT as Record<string, number | string>, (value) =>
    typeof value === 'number' ? `${value}px` : value,
  ) as Record<keyof typeof LAYOUT, string>,
  space,
};
