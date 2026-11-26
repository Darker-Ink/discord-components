import { useSyncExternalStore } from 'react';
import { ThemeTypes, type Theme } from '@discord-components/tokens';
import { readLocation } from './url';

export type ThemeSetting = Theme | 'system';
export type UIDensity = 'compact' | 'default' | 'cozy';
export type ReducedMotionSetting = 'auto' | 'reduce' | 'no-preference';
export type RoleStyle = 'username' | 'dot' | 'hidden';

// The client settings Discord's playground settings menu changes. The standalone playground keeps them
// itself; theme, motion, contrast, saturation, density, on/off indicators and experiments take effect,
// the chat/role-color/display-name ones only change what the menu shows.
export interface AppSettings {
  theme: ThemeSetting;
  reducedMotion: ReducedMotionSetting;
  highContrastMode: boolean;
  saturation: number;
  uiDensity: UIDensity;
  messageDisplayCompact: boolean;
  roleStyle: RoleStyle;
  displayNameStylesEnabled: boolean;
  switchIconsEnabled: boolean;
  experiments: string[];
}

const location = readLocation();

let settings: AppSettings = {
  theme: location.theme ?? ThemeTypes.DARK,
  reducedMotion: 'auto',
  highContrastMode: false,
  saturation: 1,
  uiDensity: 'default',
  messageDisplayCompact: false,
  roleStyle: 'username',
  displayNameStylesEnabled: true,
  switchIconsEnabled: false,
  experiments: location.experiments,
};

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getAppSettings = () => settings;

export const updateAppSettings = (partial: Partial<AppSettings>) => {
  settings = { ...settings, ...partial };
  listeners.forEach((listener) => listener());
};

export const useAppSettings = () => useSyncExternalStore(subscribe, getAppSettings, getAppSettings);
