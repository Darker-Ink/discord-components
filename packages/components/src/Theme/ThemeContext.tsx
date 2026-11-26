import { createContext, useContext, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { ThemeTypes, type Theme } from '@discord-components/tokens';

export type ThemeDensity = 'compact' | 'cozy' | 'default';

// Client themes (Nitro gradients). Only `theme` is read by the design system itself.
export interface ThemeGradient {
  theme?: Theme;
  [key: string]: unknown;
}

export interface ThemeContextState {
  theme: Theme;
  primaryColor: string | null;
  secondaryColor: string | null;
  gradient: ThemeGradient | null;
  flags: number;
  contrast: number;
  saturation: number;
  density: ThemeDensity;
  disableAdaptiveTheme: boolean;
  reduceAdaptiveTheme: boolean;
}

export interface ThemeContextValue extends ThemeContextState {
  // Serialized state, handy as a cache key for anything derived from the theme.
  key: string;
}

export const createThemeContextValue = (state: ThemeContextState): ThemeContextValue => ({
  ...state,
  key: JSON.stringify(state),
});

export const DEFAULT_THEME_CONTEXT = createThemeContextValue({
  theme: ThemeTypes.LIGHT,
  primaryColor: null,
  secondaryColor: null,
  gradient: null,
  flags: 0,
  contrast: 1,
  saturation: 1,
  density: 'compact',
  disableAdaptiveTheme: false,
  reduceAdaptiveTheme: false,
});

export const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT);

ThemeContext.displayName = 'ThemeContext';

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context == null) throw Error('useThemeContext must be used within a ThemeContext.Provider');
  return context;
};

export type ThemeContextProviderProps = Partial<ThemeContextState> & { children?: ReactNode };

// Overrides parts of the surrounding theme state; anything left out is inherited.
export const ThemeContextProvider = ({
  children,
  theme,
  primaryColor,
  secondaryColor,
  gradient,
  flags,
  contrast,
  saturation,
  density,
  disableAdaptiveTheme,
  reduceAdaptiveTheme,
}: ThemeContextProviderProps) => {
  const parent = useContext(ThemeContext);
  const value = useMemo(
    () =>
      createThemeContextValue({
        theme: theme ?? parent.theme,
        primaryColor: primaryColor ?? parent.primaryColor,
        secondaryColor: secondaryColor ?? parent.secondaryColor,
        gradient: gradient ?? parent.gradient,
        flags: flags ?? parent.flags,
        contrast: contrast ?? parent.contrast,
        saturation: saturation ?? parent.saturation,
        density: density ?? parent.density,
        disableAdaptiveTheme: disableAdaptiveTheme ?? parent.disableAdaptiveTheme,
        reduceAdaptiveTheme: reduceAdaptiveTheme ?? parent.reduceAdaptiveTheme,
      }),
    [
      theme,
      primaryColor,
      secondaryColor,
      gradient,
      flags,
      contrast,
      saturation,
      density,
      disableAdaptiveTheme,
      reduceAdaptiveTheme,
      parent,
    ],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

ThemeContextProvider.displayName = 'ThemeContextProvider';

// Ash and Onyx are variants of the dark theme, so they also get the dark classes.
const BASE_THEMES = new Map<Theme, Theme>([
  [ThemeTypes.DARK, ThemeTypes.ASH],
  [ThemeTypes.ONYX, ThemeTypes.ASH],
]);

export const getThemeClassName = (theme: Theme | null | undefined) => {
  if (theme == null) return undefined;
  const base = BASE_THEMES.get(theme);
  return base != null ? `theme-${base} theme-${theme} images-${base}` : `theme-${theme} images-${theme}`;
};

export const isThemeDark = (theme: Theme | null | undefined) =>
  theme === ThemeTypes.ASH || theme === ThemeTypes.ONYX || theme === ThemeTypes.DARK;

export const isThemeLight = (theme: Theme | null | undefined) => theme === ThemeTypes.LIGHT;

export interface ThemeProviderProps {
  theme?: Theme;
  gradient?: ThemeGradient | null;
  disableAdaptiveTheme?: boolean;
  reduceAdaptiveTheme?: boolean;
  customBackgroundClassName?: string;
  // Receives the theme classes to put on the element that should switch theme.
  children: (className: string) => ReactNode;
}

export const ThemeProvider = ({
  theme,
  gradient,
  disableAdaptiveTheme,
  reduceAdaptiveTheme,
  customBackgroundClassName,
  children,
}: ThemeProviderProps) => {
  const { theme: contextTheme } = useContext(ThemeContext);
  return (
    <ThemeContextProvider
      theme={theme}
      gradient={gradient ?? undefined}
      disableAdaptiveTheme={disableAdaptiveTheme}
      reduceAdaptiveTheme={reduceAdaptiveTheme}
    >
      {children(
        clsx(getThemeClassName(gradient?.theme ?? theme ?? contextTheme), {
          [customBackgroundClassName ?? '']: gradient != null && customBackgroundClassName != null,
          'disable-adaptive-theme': disableAdaptiveTheme,
          'reduce-adaptive-theme': reduceAdaptiveTheme,
        }),
      )}
    </ThemeContextProvider>
  );
};

ThemeProvider.displayName = 'ThemeProvider';
