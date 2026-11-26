import { useLayoutEffect, useSyncExternalStore } from 'react';
import { themeClassName, type Theme } from '@discord-mana/tokens';

export type UIDensity = 'compact' | 'default' | 'cozy';

export interface RootClassOptions {
  keyboardMode: boolean;
  reducedMotion: boolean;
  highContrastMode?: boolean;
  saturation?: number;
  density?: UIDensity;
}

const subscribeToWindowFocus = (onChange: () => void) => {
  window.addEventListener('focus', onChange);
  window.addEventListener('blur', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    window.removeEventListener('blur', onChange);
  };
};

// Whether this window has focus. Discord pauses ambient animations (spinners, for one) while it doesn't.
export const useWindowFocused = () =>
  useSyncExternalStore(
    subscribeToWindowFocus,
    () => document.hasFocus(),
    () => true,
  );

// Discord applies these to <html> in its RootElementContextProvider; tokens and component
// styles key off them (theme, density, motion, input mode, the visual refresh flag).
export const useRootClasses = (
  theme: Theme,
  { keyboardMode, reducedMotion, highContrastMode = false, saturation = 1, density = 'default' }: RootClassOptions,
) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--saturation-factor', String(saturation));
    return () => {
      root.style.removeProperty('--saturation-factor');
    };
  }, [saturation]);
  const focused = useWindowFocused();
  useLayoutEffect(() => {
    const classes = [
      themeClassName(theme),
      'platform-web',
      `density-${density}`,
      'visual-refresh',
      reducedMotion ? 'reduce-motion' : 'full-motion',
      keyboardMode ? 'keyboard-mode' : 'mouse-mode',
      'has-webkit-scrollbar',
      ...(focused ? ['app-focused'] : []),
      ...(saturation <= 0.4 ? ['low-saturation'] : []),
      ...(highContrastMode ? ['high-contrast-mode'] : []),
    ];
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [theme, keyboardMode, reducedMotion, highContrastMode, saturation, density, focused]);
};
