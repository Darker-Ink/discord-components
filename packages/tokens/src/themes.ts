export const ThemeTypes = {
  LIGHT: 'light',
  ASH: 'dark',
  DARK: 'darker',
  ONYX: 'midnight',
} as const;

export type Theme = (typeof ThemeTypes)[keyof typeof ThemeTypes];

export const themeClassName = (theme: Theme) => `theme-${theme}`;
