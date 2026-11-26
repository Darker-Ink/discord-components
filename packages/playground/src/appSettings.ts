import { useSyncExternalStore } from 'react';
import type { ReducedMotionSetting, UIDensity } from '@discord-components/components';
import { ThemeTypes, type Theme } from '@discord-components/tokens';
import { readLocation } from './url';

export type ThemeSetting = Theme | 'system';
export type RoleStyle = 'username' | 'dot' | 'hidden';
export type DynamicRange = 'no-limit' | 'standard';

// The client settings Discord's playground settings menu changes. The standalone playground keeps them
// itself; theme, motion, contrast, saturation, density, dynamic range and on/off indicators take effect,
// the chat/role-color/display-name ones only change what the menu shows.
export interface AppSettings {
  theme: ThemeSetting;
  reducedMotion: ReducedMotionSetting;
  highContrastMode: boolean;
  saturation: number;
  uiDensity: UIDensity;
  messageDisplayCompact: boolean;
  hdrDynamicRange: DynamicRange;
  roleStyle: RoleStyle;
  displayNameStylesEnabled: boolean;
  switchIconsEnabled: boolean;
}

const location = readLocation();

let settings: AppSettings = {
  theme: location.theme ?? ThemeTypes.DARK,
  reducedMotion: 'auto',
  highContrastMode: false,
  saturation: 1,
  uiDensity: 'default',
  messageDisplayCompact: false,
  hdrDynamicRange: 'no-limit',
  roleStyle: 'username',
  displayNameStylesEnabled: true,
  switchIconsEnabled: false,
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
