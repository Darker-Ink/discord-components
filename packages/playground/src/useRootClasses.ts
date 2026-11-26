import { useLayoutEffect } from 'react';
import { themeClassName, type Theme } from '@discord-components/tokens';

interface RootClassOptions {
  keyboardMode: boolean;
  reducedMotion: boolean;
  highContrastMode?: boolean;
  saturation?: number;
  density?: 'compact' | 'default' | 'cozy';
  experiments: readonly string[];
}

// Experiments the client also flags with a root class of the same name (tokens and styles key off it).
const ROOT_CLASS_EXPERIMENTS = new Set(['mana-badge-refresh']);

// Discord applies these to <html> in its RootElementContextProvider; tokens and component
// styles key off them (theme, density, motion, input mode, the visual refresh flag, experiments).
export const useRootClasses = (
  theme: Theme,
  {
    keyboardMode,
    reducedMotion,
    highContrastMode = false,
    saturation = 1,
    density = 'default',
    experiments,
  }: RootClassOptions,
) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--saturation-factor', String(saturation));
    return () => {
      root.style.removeProperty('--saturation-factor');
    };
  }, [saturation]);
  useLayoutEffect(() => {
    const classes = [
      themeClassName(theme),
      'platform-web',
      `density-${density}`,
      'visual-refresh',
      reducedMotion ? 'reduce-motion' : 'full-motion',
      keyboardMode ? 'keyboard-mode' : 'mouse-mode',
      'has-webkit-scrollbar',
      ...(saturation <= 0.4 ? ['low-saturation'] : []),
      ...(highContrastMode ? ['high-contrast-mode'] : []),
      ...experiments.filter((experiment) => ROOT_CLASS_EXPERIMENTS.has(experiment)),
    ];
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, [theme, keyboardMode, reducedMotion, highContrastMode, saturation, density, experiments]);
};
