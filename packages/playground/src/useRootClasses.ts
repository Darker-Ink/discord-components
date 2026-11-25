import { useLayoutEffect } from 'react';
import { themeClassName, type Theme } from '@discord-components/tokens';

interface RootClassOptions {
  keyboardMode: boolean;
  reducedMotion: boolean;
  experiments: readonly string[];
}

// Experiments the client also flags with a root class of the same name (tokens and styles key off it).
const ROOT_CLASS_EXPERIMENTS = new Set(['mana-badge-refresh']);

// Discord applies these to <html> in its RootElementContextProvider; tokens and component
// styles key off them (theme, density, motion, input mode, the visual refresh flag, experiments).
export const useRootClasses = (theme: Theme, { keyboardMode, reducedMotion, experiments }: RootClassOptions) => {
  useLayoutEffect(() => {
    const classes = [
      themeClassName(theme),
      'platform-web',
      'density-default',
      'visual-refresh',
      reducedMotion ? 'reduce-motion' : 'full-motion',
      keyboardMode ? 'keyboard-mode' : 'mouse-mode',
      'has-webkit-scrollbar',
      ...experiments.filter((experiment) => ROOT_CLASS_EXPERIMENTS.has(experiment)),
    ];
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [theme, keyboardMode, reducedMotion, experiments]);
};
