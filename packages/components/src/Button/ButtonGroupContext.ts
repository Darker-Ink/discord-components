import { createContext, useContext } from 'react';
import type { ButtonSize } from './Button';

export interface ButtonGroupContextValue {
  size: ButtonSize | undefined;
  fullWidth: boolean | undefined;
}

const DEFAULT_BUTTON_GROUP_CONTEXT: ButtonGroupContextValue = { size: undefined, fullWidth: undefined };

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(DEFAULT_BUTTON_GROUP_CONTEXT);

ButtonGroupContext.displayName = 'ButtonGroupContext';

export const useButtonGroupContext = () => useContext(ButtonGroupContext) ?? DEFAULT_BUTTON_GROUP_CONTEXT;
