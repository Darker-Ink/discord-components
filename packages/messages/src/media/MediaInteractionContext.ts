import { createContext } from 'react';

/** Set when messages are rendered as a non-interactive preview (e.g. in a reply or a forward). */
export const MediaInteractionContext = createContext({ disableInteractions: false, disableAnimations: false });

MediaInteractionContext.displayName = 'MediaInteractionContext';
