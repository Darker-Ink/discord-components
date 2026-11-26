import { useCallback, useState } from 'react';
import { THEMES, type PreviewTheme } from '../../shared/api';

const STORAGE_KEY = 'discord-mana-preview:theme';

const readStored = (): PreviewTheme | null => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(value as PreviewTheme) ? (value as PreviewTheme) : null;
  } catch {
    return null;
  }
};

const systemTheme = (): PreviewTheme => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

/** The home page's theme: the visitor's last pick, else their OS preference. */
export const useSiteTheme = () => {
  const [theme, setThemeState] = useState<PreviewTheme>(() => readStored() ?? systemTheme());
  const setTheme = useCallback((next: PreviewTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the pick lasts until reload.
    }
  }, []);
  return [theme, setTheme] as const;
};
