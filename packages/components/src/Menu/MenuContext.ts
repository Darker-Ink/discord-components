import { createContext } from 'react';

export const MenuInteractionType = {
  DEFAULT: 'default',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SLIDER: 'slider',
  SEARCH: 'search',
  IMAGE_UPLOAD: 'image upload',
  SWITCH: 'switch',
} as const;

export type MenuInteractionType = (typeof MenuInteractionType)[keyof typeof MenuInteractionType];

export interface MenuInteraction {
  type: MenuInteractionType;
}

export interface MenuContextValue {
  onSelect?: () => void;
  onInteraction?: (interaction: MenuInteraction) => void;
}

export const MenuContext = createContext<MenuContextValue>({ onSelect: undefined });

MenuContext.displayName = 'MenuContext';
