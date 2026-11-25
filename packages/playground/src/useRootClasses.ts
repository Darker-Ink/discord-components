import { useLayoutEffect } from 'react';
import { themeClassName, type Theme } from '@discord-components/tokens';

// Discord applies these to <html> in its RootElementContextProvider; tokens and component
// styles key off them (theme, density, motion, the visual refresh flag).
export const useRootClasses = (theme: Theme) => {
  useLayoutEffect(() => {
    const classes = [
      themeClassName(theme),
      'platform-web',
      'density-default',
      'visual-refresh',
      'full-motion',
      'mouse-mode',
      'has-webkit-scrollbar',
    ];
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [theme]);
};
