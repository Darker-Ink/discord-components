import { createContext } from 'react';

// The user's preference: follow the OS ('auto') or force one way.
export type ReducedMotionSetting = 'auto' | 'reduce' | 'no-preference';
export type ForcedColorsValue = 'active' | 'none';

export interface AccessibilityPreferences {
  reducedMotion: { enabled: boolean; rawValue: ReducedMotionSetting };
  prefersCrossfades: boolean;
  forcedColors: { enabled: boolean; rawValue: ForcedColorsValue };
  alwaysShowLinkDecorations: boolean;
  highContrastModeEnabled: boolean;
  keyboardModeEnabled: boolean;
  switchIconsEnabled: boolean;
  minToastDurationMs: number;
}

export const AccessibilityPreferencesContext = createContext<AccessibilityPreferences>({
  reducedMotion: { enabled: false, rawValue: 'no-preference' },
  prefersCrossfades: false,
  forcedColors: { enabled: false, rawValue: 'none' },
  alwaysShowLinkDecorations: false,
  highContrastModeEnabled: false,
  keyboardModeEnabled: true,
  switchIconsEnabled: false,
  minToastDurationMs: 0,
});

AccessibilityPreferencesContext.displayName = 'AccessibilityPreferencesContext';
