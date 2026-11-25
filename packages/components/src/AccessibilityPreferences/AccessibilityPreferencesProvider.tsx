import { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import {
  AccessibilityPreferencesContext,
  type AccessibilityPreferences,
  type ReducedMotionSetting,
} from './AccessibilityPreferencesContext';

const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

// Discord's client feeds this context from its accessibility settings store. Without the app, the
// settings come in as props (with the store's defaults) and the system preferences from media queries.
export interface AccessibilityPreferencesProviderProps {
  prefersReducedMotion?: ReducedMotionSetting;
  syncForcedColors?: boolean;
  alwaysShowLinkDecorations?: boolean;
  highContrastModeEnabled?: boolean;
  keyboardModeEnabled?: boolean;
  switchIconsEnabled?: boolean;
  minToastDurationMs?: number;
  children?: ReactNode;
}

export const AccessibilityPreferencesProvider = ({
  prefersReducedMotion = 'auto',
  syncForcedColors = true,
  alwaysShowLinkDecorations = false,
  highContrastModeEnabled = false,
  keyboardModeEnabled = false,
  switchIconsEnabled = false,
  minToastDurationMs = 3000,
  children,
}: AccessibilityPreferencesProviderProps) => {
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const systemForcedColors = useMediaQuery('(forced-colors: active)') ? 'active' : 'none';

  const reducedMotionEnabled =
    prefersReducedMotion === 'auto' ? systemReducedMotion : prefersReducedMotion === 'reduce';
  const forcedColorsEnabled = syncForcedColors && systemForcedColors === 'active';

  const value = useMemo<AccessibilityPreferences>(
    () => ({
      reducedMotion: { enabled: reducedMotionEnabled, rawValue: prefersReducedMotion },
      prefersCrossfades: false,
      forcedColors: { enabled: forcedColorsEnabled, rawValue: systemForcedColors },
      alwaysShowLinkDecorations,
      highContrastModeEnabled,
      keyboardModeEnabled,
      switchIconsEnabled,
      minToastDurationMs,
    }),
    [
      reducedMotionEnabled,
      prefersReducedMotion,
      forcedColorsEnabled,
      systemForcedColors,
      alwaysShowLinkDecorations,
      highContrastModeEnabled,
      keyboardModeEnabled,
      switchIconsEnabled,
      minToastDurationMs,
    ],
  );

  return <AccessibilityPreferencesContext.Provider value={value}>{children}</AccessibilityPreferencesContext.Provider>;
};

AccessibilityPreferencesProvider.displayName = 'AccessibilityPreferencesProvider';
