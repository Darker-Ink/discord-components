import { useContext } from 'react';
import type { Theme } from '@discord-mana/tokens';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useManaContext } from '../ManaContext';
import type { TokenContext } from './tokens';

// Resolves a token for the current Mana theme (or `theme`), saturation and contrast.
export const useToken = <T>(token: { resolve: (context: TokenContext) => T }, theme?: Theme) => {
  const { theme: contextTheme, saturation } = useManaContext();
  const { highContrastModeEnabled } = useContext(AccessibilityPreferencesContext);
  return token.resolve({
    theme: theme ?? contextTheme,
    saturation,
    density: 'compact',
    highContrastModeEnabled,
  });
};
