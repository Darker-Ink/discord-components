import { createContext, type ReactNode } from 'react';

// Inside this context, Clickable and Anchor render inert: no click handling, no focus, no href.
// Used when interactive content is shown somewhere it must not be interacted with (previews).
export const BlockInteractionsContext = createContext(false);

BlockInteractionsContext.displayName = 'BlockInteractionsContext';

export const BlockInteractions = ({ children }: { children?: ReactNode }) => (
  <BlockInteractionsContext.Provider value>{children}</BlockInteractionsContext.Provider>
);

BlockInteractions.displayName = 'BlockInteractions';
