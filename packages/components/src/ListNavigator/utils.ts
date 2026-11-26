export const LIST_ITEM_ID_ATTRIBUTE = 'data-list-item-id';
export const LIST_ID_ATTRIBUTE = 'data-list-id';

export const ListOrientation = { HORIZONTAL: 'horizontal', VERTICAL: 'vertical' } as const;
export type ListOrientation = (typeof ListOrientation)[keyof typeof ListOrientation];

export const ListKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  F10: 'F10',
  HOME: 'Home',
  END: 'End',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/** The value of an item's `data-list-item-id`: the list's id and the item's id. */
export const makeListItemId = (listId: string, itemId: string) => `${listId}___${itemId}`;

export const getItemIdFromListItemId = (listItemId: string) => listItemId.split('___')[1];

export const getListItemSelector = (value: string, attribute: string = LIST_ITEM_ID_ATTRIBUTE) =>
  `[${attribute}="${value}"]`;

type FocusListener = (itemId: string | null, preserveFocusPosition: boolean | undefined) => void;

const focusListeners = new Map<string, Set<FocusListener>>();

// Items subscribe to their list so only the focused one is tabbable.
export const notifyFocusChange = (listId: string, itemId: string | null, preserveFocusPosition?: boolean) => {
  const listeners = focusListeners.get(listId);
  if (listeners != null) for (const listener of listeners) listener(itemId, preserveFocusPosition);
};

export const subscribeToFocusChange = (listId: string, listener: FocusListener) => {
  let listeners = focusListeners.get(listId);
  if (listeners == null) {
    listeners = new Set();
    focusListeners.set(listId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
  };
};

interface FocusableElementFinderOptions {
  getFocusableElements: () => HTMLElement[];
  getActiveElement: () => Element | null | undefined;
  scrollToStart?: () => Promise<void>;
  scrollToEnd?: () => Promise<void>;
}

interface FindOptions {
  from?: Element;
  wrap?: boolean;
}

export const createFocusableElementFinder = ({
  getFocusableElements,
  getActiveElement,
  scrollToStart,
  scrollToEnd,
}: FocusableElementFinderOptions) => {
  const getFirstFocusableElement = () => getFocusableElements()[0] ?? null;
  const getLastFocusableElement = () => {
    const elements = getFocusableElements();
    return elements[elements.length - 1] ?? null;
  };
  return {
    async getNextFocusableElement(options?: FindOptions) {
      const from = options?.from || getActiveElement();
      if (from == null) return null;
      const next =
        getFocusableElements().find(
          (element) =>
            !!(
              from.compareDocumentPosition(element) &
              (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY)
            ),
        ) ?? null;
      if (next == null && options?.wrap) {
        await scrollToStart?.();
        return getFirstFocusableElement();
      }
      return next;
    },
    async getPreviousFocusableElement(options?: FindOptions) {
      const from = options?.from || getActiveElement();
      if (from == null) return null;
      const elements = getFocusableElements();
      let previous: HTMLElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (
          from.compareDocumentPosition(element) &
          (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINED_BY)
        ) {
          previous = element;
          break;
        }
      }
      if (previous == null && options?.wrap) {
        await scrollToEnd?.();
        return getLastFocusableElement();
      }
      return previous;
    },
    getFirstFocusableElement,
    getLastFocusableElement,
  };
};
