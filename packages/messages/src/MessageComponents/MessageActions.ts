import { createContext, useContext, type MouseEvent } from 'react';
import type { ComponentButtonSKU } from './ComponentButton';

// What clicking things in a message does outside the bot's interactions. The client opens links behind its
// "leaving Discord" confirmation and premium buttons in its store modals; apps can hook in here.
export interface MessageActions {
  /** Opens a link button's URL. Defaults to a new tab. */
  openLink: (url: string) => void;
  onLinkContextMenu?: (event: MouseEvent<HTMLElement>, url: string) => void;
  /** Store data of a premium button's SKU; while it's unknown the button shows its loading dots. */
  resolveSKU?: (skuId: string) => ComponentButtonSKU | null | undefined;
  /** Opens the SKU's details (the client's store modal). */
  openSKU?: (skuId: string) => void;
  /** "Dismiss message" of an ephemeral message. */
  onDismissMessage?: () => void;
}

export const openLinkInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const DEFAULT_MESSAGE_ACTIONS: MessageActions = { openLink: openLinkInNewTab };

export const MessageActionsContext = createContext<MessageActions>(DEFAULT_MESSAGE_ACTIONS);

MessageActionsContext.displayName = 'MessageActionsContext';

export const useMessageActions = () => useContext(MessageActionsContext);
