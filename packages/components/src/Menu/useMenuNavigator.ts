import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

export interface MenuNavigatorItem {
  key: string;
  hasAction: boolean;
  children?: MenuNavigatorItem[];
}

interface NavigatorState {
  items: MenuNavigatorItem[];
  focusPath: string[];
  focusIndex: number;
}

const NavigatorActions = {
  NAVIGATE_UP: 'NAVIGATE_UP',
  NAVIGATE_DOWN: 'NAVIGATE_DOWN',
  NAVIGATE_IN: 'NAVIGATE_IN',
  NAVIGATE_OUT: 'NAVIGATE_OUT',
  SELECT_FOCUSED_ITEM: 'SELECT_FOCUSED_ITEM',
  UPDATE_ITEMS: 'UPDATE_ITEMS',
  SET_FOCUS_PATH: 'SET_FOCUS_PATH',
} as const;

type KeyboardNavigatorAction =
  | typeof NavigatorActions.NAVIGATE_UP
  | typeof NavigatorActions.NAVIGATE_DOWN
  | typeof NavigatorActions.NAVIGATE_IN
  | typeof NavigatorActions.NAVIGATE_OUT
  | typeof NavigatorActions.SELECT_FOCUSED_ITEM;

type NavigatorAction =
  | { type: KeyboardNavigatorAction }
  | { type: typeof NavigatorActions.UPDATE_ITEMS; items: MenuNavigatorItem[] }
  | { type: typeof NavigatorActions.SET_FOCUS_PATH; path: string[] };

const indexOfKey = (items: MenuNavigatorItem[], key: string | undefined) => items.findIndex((item) => key === item.key);

const focusedKey = (state: NavigatorState) => state.focusPath[state.focusPath.length - 1];

// The list the focused item is in.
const focusedList = (state: NavigatorState) => {
  let items: MenuNavigatorItem[] | undefined = state.items;
  for (let depth = 0; depth < state.focusPath.length - 1; depth++) {
    if (items == null) return undefined;
    items = items[indexOfKey(items, state.focusPath[depth])].children;
  }
  return items;
};

// Keeps as much of a path as still exists, falling back to the first item of the level that doesn't.
const resolvePath = (items: MenuNavigatorItem[], path: string[]) => {
  let level: MenuNavigatorItem[] | undefined = items;
  const resolved: string[] = [];
  for (let depth = 0; depth < path.length && level != null; depth++) {
    const key = path[depth];
    const index = indexOfKey(level, key);
    if (index < 0 || index >= level.length) {
      const first = level[0];
      if (first != null) resolved.push(first.key);
      break;
    }
    resolved.push(key);
    level = level[index].children;
  }
  return resolved;
};

const withFocusIndex = (state: NavigatorState): NavigatorState => {
  const list = focusedList(state);
  return { ...state, focusIndex: list == null ? -1 : indexOfKey(list, focusedKey(state)) };
};

const reducer = (state: NavigatorState, action: NavigatorAction): NavigatorState => {
  switch (action.type) {
    case NavigatorActions.NAVIGATE_UP: {
      const list = focusedList(state);
      if (list == null) return state;
      let index = (indexOfKey(list, focusedKey(state)) - 1) % list.length;
      if (index < 0) index = list.length - 1;
      if (list[index] == null) return state;
      return withFocusIndex({ ...state, focusPath: [...state.focusPath.slice(0, -1), list[index].key] });
    }
    case NavigatorActions.NAVIGATE_DOWN: {
      const list = focusedList(state);
      if (list == null) return state;
      const index = (indexOfKey(list, focusedKey(state)) + 1) % list.length;
      if (list[index] == null) return state;
      return withFocusIndex({ ...state, focusPath: [...state.focusPath.slice(0, -1), list[index].key] });
    }
    case NavigatorActions.NAVIGATE_IN: {
      const list = focusedList(state);
      if (list == null) return state;
      const child = list[indexOfKey(list, focusedKey(state))]?.children?.[0];
      if (child == null) return state;
      return withFocusIndex({ ...state, focusPath: [...state.focusPath, child.key] });
    }
    case NavigatorActions.NAVIGATE_OUT:
      if (state.focusPath.length <= 1) return state;
      return withFocusIndex({ ...state, focusPath: state.focusPath.slice(0, -1) });
    case NavigatorActions.UPDATE_ITEMS:
      return withFocusIndex({ ...state, items: action.items, focusPath: resolvePath(action.items, state.focusPath) });
    case NavigatorActions.SET_FOCUS_PATH:
      return withFocusIndex({ ...state, focusPath: resolvePath(state.items, action.path) });
    case NavigatorActions.SELECT_FOCUSED_ITEM:
      return state;
  }
};

const keyToAction = (key: string): KeyboardNavigatorAction | undefined => {
  switch (key) {
    case 'Enter':
    case ' ':
      return NavigatorActions.SELECT_FOCUSED_ITEM;
    case 'ArrowUp':
      return NavigatorActions.NAVIGATE_UP;
    case 'ArrowDown':
      return NavigatorActions.NAVIGATE_DOWN;
    case 'ArrowRight':
      return NavigatorActions.NAVIGATE_IN;
    case 'ArrowLeft':
      return NavigatorActions.NAVIGATE_OUT;
  }
};

const TEXT_INPUT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password'];

const isTextEditable = (element: HTMLElement) => {
  const tag = element.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') return TEXT_INPUT_TYPES.includes((element as HTMLInputElement).type);
  return element.isContentEditable;
};

// At most one call per `wait` ms; later calls in that window are dropped.
const throttle = <Args extends unknown[]>(fn: (...args: Args) => void, wait: number) => {
  let blocked = false;
  return (...args: Args) => {
    if (blocked) return;
    fn(...args);
    blocked = true;
    setTimeout(() => (blocked = false), wait);
  };
};

class HandlerMemoizer<Handler> {
  handlers = new Map<string, Handler>();
  constructor(private readonly makeHandler: (key: string) => Handler) {}
  get(key: string) {
    let handler = this.handlers.get(key);
    if (handler == null) {
      handler = this.makeHandler(key);
      this.handlers.set(key, handler);
    }
    return handler;
  }
}

export const makeMenuItemId = (navId: string, path: string) => `${navId}-${path}`;

const PATH_SEPARATOR = '--';

export interface MenuItemPropsOptions {
  path: string[];
  hasSubmenu?: boolean;
  navigable?: boolean;
  role?: string;
}

export interface MenuItemDomProps {
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  role: string;
  id: string;
  tabIndex: number;
  onFocus: () => void;
  onMouseEnter: () => void;
}

export interface MenuSubmenuDomProps {
  role: 'menu';
  tabIndex: number;
  'aria-activedescendant': string | undefined;
  focusIndex: number;
  isUsingKeyboardNavigation: boolean;
}

export interface UseMenuNavigatorOptions {
  navId: string;
  items: MenuNavigatorItem[];
  initialFocusPath: string[];
  onSelect?: (path: string[]) => void;
  enabled?: boolean;
  closeMenu?: () => void;
  defaultIsUsingKeyboardNavigation?: boolean;
}

export const useMenuNavigator = ({
  navId,
  items,
  initialFocusPath,
  onSelect,
  enabled = true,
  closeMenu,
  defaultIsUsingKeyboardNavigation = false,
}: UseMenuNavigatorOptions) => {
  const enabledRef = useRef(enabled);
  useLayoutEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const [state, dispatchNow] = useReducer(reducer, { items, focusPath: initialFocusPath, focusIndex: -1 });
  // Holding an arrow key repeats it faster than items can scroll into view.
  const dispatch = useMemo(() => throttle(dispatchNow, 30), [dispatchNow]);
  useEffect(() => {
    dispatchNow({ type: NavigatorActions.UPDATE_ITEMS, items });
  }, [items]);

  const { focusPath } = state;
  const [hasFocus, setHasFocus] = useState(false);
  const [isUsingKeyboardNavigation, setIsUsingKeyboardNavigation] = useState(defaultIsUsingKeyboardNavigation);
  const [{ onItemFocusMemoizer, onItemMouseEnterMemoizer }] = useState(() => ({
    onItemFocusMemoizer: new HandlerMemoizer((path) => () => {
      setHasFocus(true);
      dispatchNow({ type: NavigatorActions.SET_FOCUS_PATH, path: path.split(PATH_SEPARATOR) });
    }),
    onItemMouseEnterMemoizer: new HandlerMemoizer((path) => () => {
      setIsUsingKeyboardNavigation(false);
      dispatchNow({ type: NavigatorActions.SET_FOCUS_PATH, path: path.split(PATH_SEPARATOR) });
    }),
  }));

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!enabledRef.current) return;
      if (event.key === 'Escape' && closeMenu != null) {
        event.stopPropagation();
        event.preventDefault();
        closeMenu();
      }
      const action = keyToAction(event.key);
      const target = event.target as HTMLElement;
      switch (action) {
        case NavigatorActions.NAVIGATE_UP:
        case NavigatorActions.NAVIGATE_DOWN:
        case NavigatorActions.NAVIGATE_IN:
        case NavigatorActions.NAVIGATE_OUT:
          // Left and right move the caret in text fields.
          if (
            isTextEditable(target) &&
            (action === NavigatorActions.NAVIGATE_IN || action === NavigatorActions.NAVIGATE_OUT)
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          setIsUsingKeyboardNavigation(true);
          dispatch({ type: action });
          return;
        case NavigatorActions.SELECT_FOCUSED_ITEM: {
          if (event.repeat || target.tabIndex >= 0) return;
          event.preventDefault();
          event.stopPropagation();
          const key = focusedKey(state);
          const item = focusedList(state)?.find((candidate) => candidate.key === key);
          if (item?.children != null && item.children.length > 0 && !item.hasAction) {
            setIsUsingKeyboardNavigation(true);
            dispatch({ type: NavigatorActions.NAVIGATE_IN });
            return;
          }
          setIsUsingKeyboardNavigation(false);
          dispatch({ type: action });
          if (onSelect != null) {
            onSelect(focusPath);
            return;
          }
          const ownerDocument = target.ownerDocument ?? document;
          const id = focusPath != null ? makeMenuItemId(navId, focusPath.join(PATH_SEPARATOR)) : navId;
          ownerDocument.getElementById(id)?.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              shiftKey: event.shiftKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
              view: ownerDocument.defaultView ?? window,
            }),
          );
        }
      }
    },
    [dispatch, navId, focusPath, onSelect, closeMenu, state],
  );

  const onFocus = useCallback(() => {
    if (!hasFocus) setHasFocus(true);
  }, [hasFocus]);

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (
        event.target !== event.currentTarget &&
        !event.currentTarget.contains(event.relatedTarget as Node | null) &&
        hasFocus
      )
        setHasFocus(false);
    },
    [hasFocus],
  );

  const onMouseLeave = useCallback(() => {
    dispatchNow({ type: NavigatorActions.SET_FOCUS_PATH, path: [] });
    setHasFocus(false);
  }, []);

  const isFocused = useCallback((path: string[]) => path.every((key, index) => focusPath[index] === key), [focusPath]);

  const getContainerProps = useCallback(
    () => ({
      role: 'menu',
      id: navId,
      tabIndex: -1,
      onKeyDown,
      onFocus,
      onBlur,
      onMouseLeave,
      'aria-activedescendant': focusPath.length > 0 ? makeMenuItemId(navId, focusPath.join(PATH_SEPARATOR)) : undefined,
    }),
    [navId, onKeyDown, onFocus, onBlur, onMouseLeave, focusPath],
  );

  const getSubmenuProps = useCallback(
    ({ path }: { path: string[] }): MenuSubmenuDomProps => ({
      role: 'menu',
      tabIndex: -1,
      'aria-activedescendant': isFocused(path) ? makeMenuItemId(navId, focusPath.join(PATH_SEPARATOR)) : undefined,
      focusIndex: state.focusIndex,
      isUsingKeyboardNavigation,
    }),
    [navId, focusPath, isFocused, state.focusIndex, isUsingKeyboardNavigation],
  );

  const getItemProps = useCallback(
    ({ path, hasSubmenu = false, navigable = true, role = 'menuitem' }: MenuItemPropsOptions): MenuItemDomProps => {
      const key = path.join(PATH_SEPARATOR);
      return {
        ...(hasSubmenu ? { 'aria-expanded': isFocused(path), 'aria-haspopup': true } : {}),
        role,
        id: makeMenuItemId(navId, key),
        tabIndex: -1,
        onFocus: navigable ? onItemFocusMemoizer.get(key) : () => {},
        onMouseEnter: navigable ? onItemMouseEnterMemoizer.get(key) : () => {},
      };
    },
    [navId, isFocused, onItemFocusMemoizer, onItemMouseEnterMemoizer],
  );

  return useMemo(
    () => ({
      dispatch,
      getContainerProps,
      getSubmenuProps,
      getItemProps,
      isFocused,
      isUsingKeyboardNavigation,
    }),
    [dispatch, getContainerProps, getSubmenuProps, getItemProps, isFocused, isUsingKeyboardNavigation],
  );
};

export type MenuNavigator = ReturnType<typeof useMenuNavigator>;
