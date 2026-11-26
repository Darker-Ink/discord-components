/* eslint-disable react-hooks/refs -- the navigator's helpers read the container ref only when called. */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  LIST_ID_ATTRIBUTE,
  LIST_ITEM_ID_ATTRIBUTE,
  ListKeys,
  ListOrientation,
  createFocusableElementFinder,
  getItemIdFromListItemId,
  getListItemSelector,
  makeListItemId,
  notifyFocusChange,
} from './utils';

export interface UseListNavigatorOptions {
  id: string;
  defaultFocused?: string;
  isEnabled: boolean;
  scrollToStart: () => Promise<void>;
  scrollToEnd: () => Promise<void>;
  onNavigatePreviousAtStart?: () => void;
  onNavigateNextAtEnd?: () => void;
  setFocus?: (selector: string, itemId: string) => void;
  setFocusOnList?: (selector: string) => void;
  preserveFocusPosition?: boolean;
  // Track focus without moving DOM focus (for lists driven by aria-activedescendant).
  useVirtualFocus?: boolean;
  wrap?: boolean;
  orientation?: ListOrientation;
  disableClickOnSpace?: boolean;
}

export interface ListNavigatorContainerProps {
  onKeyDown: (event: KeyboardEvent) => void;
  ref: RefObject<HTMLElement | null>;
  tabIndex: number;
}

export interface ListNavigator {
  id: string;
  containerProps: ListNavigatorContainerProps;
  orientation: ListOrientation;
  setFocus: (itemId: string | null) => void;
  focusLastVisibleItem: () => Promise<void>;
  focusFirstVisibleItem: () => Promise<void>;
  focusPreviousItem: () => Promise<void>;
  focusNextItem: () => Promise<void>;
  focusedItemId: () => string | null;
}

const getItems = (listId: string, containerRef: RefObject<HTMLElement | null>) =>
  Array.from(
    (containerRef.current ?? document).querySelectorAll<HTMLElement>(`[${LIST_ITEM_ID_ATTRIBUTE}^="${listId}"]`),
  );

// Resolves with the first item fully inside `root`, or the most visible one.
const findFirstVisibleItem = (root: Element, items: HTMLElement[]) =>
  new Promise<string | null>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0;
        let best: string | null = null;
        for (const { isIntersecting, intersectionRatio, target } of entries) {
          if (isIntersecting && intersectionRatio === 1) {
            observer.disconnect();
            const id = target.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
            if (id != null) {
              resolve(id);
              return;
            }
          }
          if (intersectionRatio > bestRatio) {
            bestRatio = intersectionRatio;
            best = target.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
          }
        }
        observer.disconnect();
        resolve(best);
      },
      { root },
    );
    for (const item of items) observer.observe(item);
  });

const findLastVisibleItem = (root: Element, items: HTMLElement[]) =>
  new Promise<string | null>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0;
        let best: string | null = null;
        for (let i = entries.length - 1; i >= 0; i--) {
          const { isIntersecting, intersectionRatio, target } = entries[i];
          if (isIntersecting && intersectionRatio === 1) {
            observer.disconnect();
            const id = target.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
            if (id != null) {
              resolve(id);
              return;
            }
          }
          if (intersectionRatio > bestRatio) {
            bestRatio = intersectionRatio;
            best = target.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
          }
        }
        observer.disconnect();
        resolve(best);
      },
      { root },
    );
    for (const item of items) observer.observe(item);
  });

const isMostlyVisible = (root: Element, element: Element, threshold = 0.5) =>
  new Promise<boolean>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        observer.disconnect();
        resolve(entries[0].intersectionRatio >= threshold);
      },
      { root },
    );
    observer.observe(element);
  });

/** Roving focus over the items of a list (arrow keys, Home/End, Enter/Space to click). */
export const useListNavigator = ({
  id,
  defaultFocused,
  isEnabled,
  scrollToStart,
  scrollToEnd,
  onNavigatePreviousAtStart,
  onNavigateNextAtEnd,
  setFocus,
  setFocusOnList,
  preserveFocusPosition = true,
  useVirtualFocus = false,
  wrap = false,
  orientation = ListOrientation.VERTICAL,
  disableClickOnSpace = false,
}: UseListNavigatorOptions): ListNavigator => {
  const focusedRef = useRef<string | null>(defaultFocused ? makeListItemId(id, defaultFocused) : null);
  const hasScrolledRef = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focusedRef.current == null && defaultFocused != null) focusedRef.current = makeListItemId(id, defaultFocused);
  }, [defaultFocused, id]);

  const enabledRef = useRef(isEnabled);
  const query = (selector: string) => (containerRef.current ?? document).querySelector<HTMLElement>(selector);
  const focusSelector = (selector: string) => {
    query(selector)?.focus();
  };

  useLayoutEffect(() => {
    enabledRef.current = isEnabled;
  }, [isEnabled]);

  const focusItem = useCallback(
    (selector: string, itemId: string) => {
      if (enabledRef.current) (setFocus ?? focusSelector)(selector, itemId);
    },
    // focusSelector only reads the container ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setFocus],
  );
  const focusList = useCallback(
    (selector: string) => {
      if (enabledRef.current) (setFocusOnList ?? focusSelector)(selector);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setFocusOnList],
  );

  const setFocusedItem = useCallback(
    (listItemId: string | null) => {
      focusedRef.current = listItemId;
      if (listItemId == null) {
        notifyFocusChange(id, null, preserveFocusPosition);
        return;
      }
      const selector = getListItemSelector(listItemId);
      const itemId = getItemIdFromListItemId(listItemId);
      focusItem(selector, itemId);
      notifyFocusChange(id, itemId, preserveFocusPosition);
    },
    [id, preserveFocusPosition, focusItem],
  );

  const finder = useMemo(
    () =>
      createFocusableElementFinder({
        getFocusableElements: () => getItems(id, containerRef),
        getActiveElement: () => containerRef.current?.ownerDocument.activeElement,
        scrollToStart,
        scrollToEnd,
      }),
    [id, scrollToStart, scrollToEnd],
  );

  const [hasFocus, setHasFocus] = useState(false);
  const hasFocusRef = useRef(hasFocus);
  useLayoutEffect(() => {
    hasFocusRef.current = hasFocus;
  }, [hasFocus]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container == null || !isEnabled) return;
    const handleFocusIn = () => setHasFocus(true);
    const handleFocusOut = (event: FocusEvent) => {
      if ((event.currentTarget as Element).contains(event.relatedTarget as Node | null)) return;
      setHasFocus(false);
      // If the focused item went away while focus was outside, fall back to the list itself.
      requestAnimationFrame(() => {
        const focused = focusedRef.current;
        if (focused !== null && query(getListItemSelector(focused)) == null) {
          focusList(getListItemSelector(id, LIST_ID_ATTRIBUTE));
        }
      });
    };
    const handleFocus = async () => {
      const element = containerRef.current;
      if (hasFocusRef.current || element == null) return;
      const focused = focusedRef.current;
      if (preserveFocusPosition && focused !== null) {
        const selector = getListItemSelector(focused);
        const item = query(selector);
        if (item != null) {
          if (hasScrolledRef.current !== true) return focusItem(selector, getItemIdFromListItemId(focused));
          if (await isMostlyVisible(element, item)) return focusItem(selector, getItemIdFromListItemId(focused));
        }
      }
      const first = await findFirstVisibleItem(element, getItems(id, containerRef));
      if (first !== null) setFocusedItem(first);
    };
    const handleScroll = () => {
      hasScrolledRef.current = true;
    };
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    container.addEventListener('focus', handleFocus);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
      container.removeEventListener('focus', handleFocus);
      container.removeEventListener('scroll', handleScroll);
    };
    // query reads only the container ref.
  }, [isEnabled, id, preserveFocusPosition, focusItem, setFocusOnList, focusList, setFocusedItem]);

  const findOptions = useMemo(
    () => ({
      wrap,
      get from() {
        if (!useVirtualFocus) return undefined;
        const focused = focusedRef.current;
        if (focused == null) return undefined;
        return query(getListItemSelector(focused)) ?? undefined;
      },
    }),

    [useVirtualFocus, wrap],
  );

  const focusNextItem = useCallback(async () => {
    const next = await finder.getNextFocusableElement(findOptions);
    const nextId = next?.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
    if (nextId != null) setFocusedItem(nextId);
    else if (next == null && onNavigateNextAtEnd != null) onNavigateNextAtEnd();
  }, [finder, findOptions, onNavigateNextAtEnd, setFocusedItem]);

  const focusPreviousItem = useCallback(async () => {
    const previous = await finder.getPreviousFocusableElement(findOptions);
    const previousId = previous?.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
    if (previousId != null) setFocusedItem(previousId);
    else if (previous == null && onNavigatePreviousAtStart != null) onNavigatePreviousAtStart();
  }, [finder, findOptions, onNavigatePreviousAtStart, setFocusedItem]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabledRef.current || (!useVirtualFocus && !hasFocusRef.current)) return;
      const nextKey = orientation === ListOrientation.HORIZONTAL ? ListKeys.RIGHT : ListKeys.DOWN;
      const previousKey = orientation === ListOrientation.HORIZONTAL ? ListKeys.LEFT : ListKeys.UP;
      switch (event.key) {
        case nextKey:
          event.stopPropagation();
          event.preventDefault();
          void focusNextItem();
          return;
        case previousKey:
          event.stopPropagation();
          event.preventDefault();
          void focusPreviousItem();
          return;
        case ListKeys.HOME:
          event.stopPropagation();
          event.preventDefault();
          void scrollToStart().then(() => {
            const firstId = getItems(id, containerRef)[0]?.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
            if (firstId != null) setFocusedItem(firstId);
          });
          return;
        case ListKeys.END:
          event.stopPropagation();
          event.preventDefault();
          void scrollToEnd().then(() => {
            const items = getItems(id, containerRef);
            const lastId = items[items.length - 1]?.getAttribute(LIST_ITEM_ID_ATTRIBUTE);
            if (lastId != null) setFocusedItem(lastId);
          });
          return;
        case ListKeys.SPACE:
        case ListKeys.ENTER: {
          if ((event.key === ListKeys.SPACE && disableClickOnSpace) || event.repeat) return;
          const focused = focusedRef.current;
          if (focused != null) {
            const item = query(getListItemSelector(focused));
            const ownerDocument = item?.ownerDocument ?? document;
            const canClick = useVirtualFocus || item === ownerDocument.activeElement;
            if (item != null && canClick) {
              event.preventDefault();
              event.stopPropagation();
              item.click();
            }
          }
        }
      }
    },
    // query reads only the container ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusNextItem, focusPreviousItem, id, orientation, scrollToEnd, scrollToStart, setFocusedItem, useVirtualFocus],
  );

  const setFocusedItemId = useCallback(
    (itemId: string | null) => {
      focusedRef.current = itemId != null ? makeListItemId(id, itemId) : null;
      notifyFocusChange(id, itemId, preserveFocusPosition);
    },
    [id, preserveFocusPosition],
  );

  return useMemo(
    () => ({
      id,
      containerProps: {
        onKeyDown: handleKeyDown,
        ref: containerRef,
        tabIndex: hasFocus && preserveFocusPosition ? -1 : 0,
      },
      orientation,
      setFocus: setFocusedItemId,
      async focusLastVisibleItem() {
        const last = await findLastVisibleItem(containerRef.current ?? document.body, getItems(id, containerRef));
        if (last !== null) setFocusedItem(last);
      },
      async focusFirstVisibleItem() {
        const first = await findFirstVisibleItem(containerRef.current ?? document.body, getItems(id, containerRef));
        if (first !== null) setFocusedItem(first);
      },
      focusPreviousItem,
      focusNextItem,
      focusedItemId() {
        const focused = focusedRef.current;
        return focused ? getItemIdFromListItemId(focused) : null;
      },
    }),
    [
      id,
      handleKeyDown,
      orientation,
      hasFocus,
      preserveFocusPosition,
      setFocusedItemId,
      focusPreviousItem,
      focusNextItem,
      setFocusedItem,
    ],
  );
};
