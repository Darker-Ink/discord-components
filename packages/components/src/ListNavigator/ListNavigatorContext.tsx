import {
  createContext,
  createRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type { ListNavigator } from './useListNavigator';
import {
  LIST_ID_ATTRIBUTE,
  LIST_ITEM_ID_ATTRIBUTE,
  ListOrientation,
  makeListItemId,
  subscribeToFocusChange,
} from './utils';

interface ListItemContextValue {
  id: string;
  setFocus: (itemId: string | null) => void;
}

interface ListContainerContextValue {
  id: string;
  onKeyDown: (event: KeyboardEvent) => void;
  orientation: ListOrientation;
  ref: RefObject<HTMLElement | null>;
  tabIndex: number;
}

const NO_LIST: ListContainerContextValue = {
  id: 'NO_LIST',
  onKeyDown() {},
  orientation: ListOrientation.VERTICAL,
  ref: createRef(),
  tabIndex: -1,
};

const ListItemContext = createContext<ListItemContextValue>({ id: 'NO_LIST', setFocus() {} });

ListItemContext.displayName = 'ListNavigatorItemContext';

export const ListNavigatorContainerContext = createContext<ListContainerContextValue>(NO_LIST);

ListNavigatorContainerContext.displayName = 'ListNavigatorContainerContext';

export interface ListItemProps {
  role: string;
  [LIST_ITEM_ID_ATTRIBUTE]: string;
  tabIndex: number;
  onFocus: () => void;
}

/** Props for one navigable item: only the focused item is tabbable. */
export const useListItem = (itemId: string): ListItemProps => {
  const [tabIndex, setTabIndex] = useState(-1);
  const { id, setFocus } = useContext(ListItemContext);
  const onFocus = useCallback(() => setFocus(itemId), [itemId, setFocus]);
  useLayoutEffect(
    () =>
      subscribeToFocusChange(id, (focusedId, preserveFocusPosition) => {
        setTabIndex(preserveFocusPosition && focusedId === itemId ? 0 : -1);
      }),
    [itemId, id],
  );
  return { role: 'listitem', [LIST_ITEM_ID_ATTRIBUTE]: makeListItemId(id, itemId), tabIndex, onFocus };
};

export const useTreeItem = (itemId: string, level = 1) => ({
  ...useListItem(itemId),
  role: 'treeitem',
  'aria-level': level,
});

export interface ListContainerProps {
  role: string;
  tabIndex: number;
  [LIST_ID_ATTRIBUTE]: string;
  onKeyDown: (event: KeyboardEvent) => void;
  ref: RefObject<HTMLElement | null>;
  'aria-orientation': ListOrientation;
}

export const useListContainerProps = (): ListContainerProps => {
  const { id, onKeyDown, ref, tabIndex, orientation } = useContext(ListNavigatorContainerContext);
  return { role: 'list', tabIndex, [LIST_ID_ATTRIBUTE]: id, onKeyDown, ref, 'aria-orientation': orientation };
};

export const useListContainerRef = () => useContext(ListNavigatorContainerContext).ref;

export const getListContainerProps = ({
  id,
  containerProps: { onKeyDown, ref, tabIndex },
  orientation,
}: ListNavigator) => ({
  role: 'list',
  onKeyDown,
  ref,
  [LIST_ID_ATTRIBUTE]: id,
  tabIndex,
  'aria-orientation': orientation,
});

export const ListNavigatorContainer = ({ children }: { children: (props: ListContainerProps) => ReactNode }) =>
  children(useListContainerProps());

ListNavigatorContainer.displayName = 'ListNavigatorContainer';

export const ListNavigatorItem = ({ children, id }: { children: (props: ListItemProps) => ReactNode; id: string }) =>
  children(useListItem(id));

ListNavigatorItem.displayName = 'ListNavigatorItem';

export const ListNavigatorProvider = ({ children, navigator }: { children: ReactNode; navigator: ListNavigator }) => {
  const {
    id,
    setFocus,
    containerProps: { onKeyDown, ref, tabIndex },
    orientation,
  } = navigator;
  const itemContext = useMemo(() => ({ id, setFocus }), [id, setFocus]);
  const containerContext = useMemo(
    () => ({ onKeyDown, orientation, ref, id, tabIndex }),
    [onKeyDown, orientation, ref, id, tabIndex],
  );
  return (
    <ListNavigatorContainerContext.Provider value={containerContext}>
      <ListItemContext.Provider value={itemContext}>{children}</ListItemContext.Provider>{' '}
    </ListNavigatorContainerContext.Provider>
  );
};

ListNavigatorProvider.displayName = 'ListNavigatorProvider';
