import { useLayoutEffect } from 'react';
import { themeClassName, type Theme } from '@discord-components/tokens';

interface RootClassOptions {
  keyboardMode: boolean;
  reducedMotion: boolean;
}

// Discord applies these to <html> in its RootElementContextProvider; tokens and component
// styles key off them (theme, density, motion, input mode, the visual refresh flag).
export const useRootClasses = (theme: Theme, { keyboardMode, reducedMotion }: RootClassOptions) => {
  useLayoutEffect(() => {
    const classes = [
      themeClassName(theme),
      'platform-web',
      'density-default',
      'visual-refresh',
      reducedMotion ? 'reduce-motion' : 'full-motion',
      keyboardMode ? 'keyboard-mode' : 'mouse-mode',
      'has-webkit-scrollbar',
    ];
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [theme, keyboardMode, reducedMotion]);
};
