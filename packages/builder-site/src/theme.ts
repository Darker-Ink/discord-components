import { useCallback, useState } from 'react';
import { ThemeTypes, type Theme } from '@discord-mana/tokens';

export const THEMES = [
  { id: 'light', label: 'Light', theme: ThemeTypes.LIGHT },
  { id: 'ash', label: 'Ash', theme: ThemeTypes.ASH },
  { id: 'dark', label: 'Dark', theme: ThemeTypes.DARK },
  { id: 'onyx', label: 'Onyx', theme: ThemeTypes.ONYX },
] as const satisfies readonly { id: string; label: string; theme: Theme }[];

export type SiteTheme = (typeof THEMES)[number]['id'];

// public/boot.js reads the same key to paint the right background before the app loads.
const STORAGE_KEY = 'discord-mana:theme';
const DEFAULT_THEME: SiteTheme = 'dark';

export const isSiteTheme = (value: unknown): value is SiteTheme => THEMES.some(({ id }) => id === value);

const readStored = (): SiteTheme => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isSiteTheme(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const themeOf = (id: SiteTheme) => THEMES.find((entry) => entry.id === id)!;

/** The visitor's last pick, else Dark. */
export const useSiteTheme = () => {
  const [theme, setThemeState] = useState(readStored);
  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the pick lasts until reload.
    }
  }, []);
  return [theme, setTheme] as const;
};
