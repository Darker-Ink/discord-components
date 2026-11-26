import { createContext, useContext, type MouseEvent, type ReactNode } from 'react';
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
  /**
   * A clickable mention, emoji or channel link in rendered markdown was clicked (the client opens profile and
   * role popouts, emoji details or navigates there).
   */
  onMarkdownInteraction?: (interaction: MarkdownInteraction) => void;
  /**
   * Content for the popout a user or role mention opens (the client's profile and role member popouts). Without
   * it, mentions don't open anything.
   */
  renderMarkdownPopout?: (target: MarkdownPopoutTarget) => ReactNode;
}

/** The mention a markdown popout is for. */
export type MarkdownPopoutTarget =
  | { type: 'user'; userId: string; guildId: string | null; channelId: string | null }
  | { type: 'role'; roleId: string | null; guildId: string; channelId: string };

/** What a reader clicked in rendered markdown. */
export type MarkdownInteraction =
  | { type: 'user'; userId: string | null; event: MouseEvent<HTMLElement> }
  | { type: 'role'; roleId: string | null; guildId: string | null; event: MouseEvent<HTMLElement> }
  | {
      type: 'channel';
      guildId: string | null;
      channelId: string | null;
      messageId: string | null;
      event: MouseEvent<HTMLElement>;
    }
  | { type: 'command'; commandId: string; commandName: string; event: MouseEvent<HTMLElement> }
  | { type: 'emoji'; emojiId: string | null; name: string; event: MouseEvent<HTMLElement> }
  | { type: 'link'; href: string; event: MouseEvent<HTMLElement> }
  | {
      type: 'staticRoute';
      guildId: string | null;
      route: string;
      itemId: string | null;
      event: MouseEvent<HTMLElement>;
    };

export const openLinkInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const DEFAULT_MESSAGE_ACTIONS: MessageActions = { openLink: openLinkInNewTab };

export const MessageActionsContext = createContext<MessageActions>(DEFAULT_MESSAGE_ACTIONS);

MessageActionsContext.displayName = 'MessageActionsContext';

export const useMessageActions = () => useContext(MessageActionsContext);
