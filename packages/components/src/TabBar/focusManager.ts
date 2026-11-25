export interface FocusManagerOptions {
  getFocusableElements: () => HTMLElement[];
  getActiveElement: () => Element | null | undefined;
  scrollToStart?: () => Promise<void> | void;
  scrollToEnd?: () => Promise<void> | void;
}

export interface FocusTraversalOptions {
  from?: Element;
  wrap?: boolean;
}

export interface FocusManager {
  getNextFocusableElement: (options?: FocusTraversalOptions) => Promise<HTMLElement | null>;
  getPreviousFocusableElement: (options?: FocusTraversalOptions) => Promise<HTMLElement | null>;
  getFirstFocusableElement: () => HTMLElement | null;
  getLastFocusableElement: () => HTMLElement | null;
}

// Moves focus through a list of elements in document order, relative to the active element.
export const createFocusManager = ({
  getFocusableElements,
  getActiveElement,
  scrollToStart,
  scrollToEnd,
}: FocusManagerOptions): FocusManager => {
  const getFirstFocusableElement = () => getFocusableElements()[0] ?? null;
  const getLastFocusableElement = () => {
    const elements = getFocusableElements();
    return elements[elements.length - 1] ?? null;
  };

  return {
    getNextFocusableElement: async (options) => {
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
    getPreviousFocusableElement: async (options) => {
      const from = options?.from || getActiveElement();
      if (from == null) return null;
      const elements = getFocusableElements();
      let previous: HTMLElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (
          from.compareDocumentPosition(elements[i]) &
          (Node.DOCUMENT_POSITION_PRECEDING | Node.DOCUMENT_POSITION_CONTAINED_BY)
        ) {
          previous = elements[i];
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
