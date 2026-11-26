import { createContext, useContext } from 'react';

// What Discord's RootElementContextProvider puts on the app's root: its lang, inline style and classes, and
// whether the window has focus. Without a provider nothing counts as focused.
export interface RootElementContextValue {
  lang: string;
  style: string;
  className: string;
  focused: boolean;
}

export const RootElementContext = createContext<RootElementContextValue>({
  lang: '',
  style: '',
  className: '',
  focused: false,
});

RootElementContext.displayName = 'RootElementContext';

export const useRootElementContext = () => useContext(RootElementContext);
