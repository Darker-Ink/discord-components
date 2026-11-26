import { ThemeTypes, type Theme } from '@discord-mana/tokens';
import { THEMES, type PreviewTheme } from '../shared/api';

export const THEME_CLASSES: Record<PreviewTheme, Theme> = {
  light: ThemeTypes.LIGHT,
  ash: ThemeTypes.ASH,
  dark: ThemeTypes.DARK,
  onyx: ThemeTypes.ONYX,
};

export const DENSITIES = ['compact', 'default', 'cozy'] as const;
export type Density = (typeof DENSITIES)[number];

/** Discord's "Space between message groups" setting, in px. */
export const GROUP_SPACINGS = [0, 4, 8, 16, 24] as const;
export type GroupSpacing = (typeof GROUP_SPACINGS)[number];

export interface ViewParams {
  theme: PreviewTheme | null;
  density: Density;
  spacing: GroupSpacing;
  /** Padding around the message list, in px. */
  padding: number;
  bg: 'default' | 'transparent';
  /** Root font size relative to 16px, like Discord's chat font scaling (12px to 24px). */
  fontScale: number;
  saturation: number;
  /** `null`: shown when the page is opened directly, hidden inside an iframe. */
  chrome: boolean | null;
  dates: boolean;
  reducedMotion: boolean | null;
}

export const DEFAULT_VIEW_PARAMS: ViewParams = {
  theme: null,
  density: 'default',
  spacing: 16,
  padding: 16,
  bg: 'default',
  fontScale: 1,
  saturation: 1,
  chrome: null,
  dates: true,
  reducedMotion: null,
};

const oneOf = <T extends string | number>(values: readonly T[], raw: string | null, parse: (raw: string) => T) => {
  if (raw == null) return null;
  const value = parse(raw);
  return values.includes(value) ? value : null;
};

const number = (raw: string | null, min: number, max: number) => {
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null;
};

const flag = (raw: string | null) => {
  if (raw == null) return null;
  if (['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(raw.toLowerCase())) return false;
  return null;
};

/** Reads the look of a preview from its URL. Unknown or out-of-range values fall back to the defaults. */
export const parseViewParams = (search: URLSearchParams): ViewParams => {
  const d = DEFAULT_VIEW_PARAMS;
  return {
    theme: oneOf(THEMES, search.get('theme'), (raw) => raw.toLowerCase() as PreviewTheme),
    density: oneOf(DENSITIES, search.get('density'), (raw) => raw.toLowerCase() as Density) ?? d.density,
    spacing: oneOf(GROUP_SPACINGS, search.get('spacing'), (raw) => Number(raw) as GroupSpacing) ?? d.spacing,
    padding: number(search.get('padding'), 0, 64) ?? d.padding,
    bg: search.get('bg') === 'transparent' ? 'transparent' : d.bg,
    fontScale: number(search.get('fontScale'), 0.75, 1.5) ?? d.fontScale,
    saturation: number(search.get('saturation'), 0, 1) ?? d.saturation,
    chrome: flag(search.get('chrome')),
    dates: flag(search.get('dates')) ?? d.dates,
    reducedMotion: flag(search.get('reducedMotion')),
  };
};

/** The query string for non-default params (what the home page's builder shows). */
export const serializeViewParams = (params: Partial<ViewParams>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [keyof ViewParams, unknown][]) {
    if (value == null || value === DEFAULT_VIEW_PARAMS[key]) continue;
    search.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return search.toString();
};
