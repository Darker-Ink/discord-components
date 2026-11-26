import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type UIEvent,
} from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useFocusLock } from '../Dialog';
import { FloatingLayer, FloatingLayerContext, type FloatingLayerPlacement } from '../FloatingLayer';
import { ListThin, type ListScrollerHandle } from '../ListScroller';
import { ScrollerNone, ScrollerThin } from '../Scroller';
import { Spinner } from '../Spinner';
import { tokens } from '../tokens';
import { MenuContext, type MenuContextValue } from './MenuContext';
import {
  MenuCheckboxItemRow,
  MenuCompositeControlItemRow,
  MenuControlItemRow,
  MenuCustomItemRow,
  MenuItemRow,
  MenuRadioItemRow,
  MenuSwitchItemRow,
  MenuTextInputItemRow,
  MENU_COLOR_CLASSES,
} from './MenuItemRenderers';
import {
  MenuCheckboxItem,
  MenuControlItem,
  MenuGroup,
  MenuItem,
  MenuRadioItem,
  MenuSeparator,
  MenuSwitchItem,
  MenuTextInputItem,
  type MenuCheckboxItemProps,
  type MenuControlItemProps,
  type MenuGroupProps,
  type MenuItemColor,
  type MenuItemProps,
  type MenuRadioItemProps,
  type MenuSwitchItemProps,
  type MenuTextInputItemProps,
} from './MenuItems';
import {
  useMenuNavigator,
  type MenuNavigator,
  type MenuNavigatorItem,
  type MenuSubmenuDomProps,
} from './useMenuNavigator';
import styles from './Menu.module.css';

export type MenuVariant = 'fixed' | 'flexible';

type MenuEntry =
  | { type: 'separator'; navigable: false }
  | { type: 'groupstart' | 'groupend'; length: number; navigable: false; props: MenuGroupProps }
  | {
      type: 'item';
      key: string;
      navigable: true;
      label: MenuItemProps['label'];
      void_label: MenuItemProps['void_label'];
      children: MenuEntry[] | undefined;
      onChildrenScroll: MenuItemProps['onChildrenScroll'];
      props: MenuItemProps;
      childRowHeight: number | undefined;
      listClassName: string | undefined;
      subMenuClassName: string | undefined;
    }
  | {
      type: 'customitem';
      key: string;
      navigable: boolean;
      render: NonNullable<MenuItemProps['render']>;
      props: MenuItemProps;
    }
  | { type: 'checkbox'; key: string; navigable: true; props: MenuCheckboxItemProps }
  | { type: 'radio'; key: string; navigable: true; props: MenuRadioItemProps }
  | { type: 'switch'; key: string; navigable: true; props: MenuSwitchItemProps }
  | { type: 'textinput'; key: string; navigable: true; props: MenuTextInputItemProps }
  | { type: 'control'; key: string; navigable: true; props: MenuControlItemProps }
  | { type: 'compositecontrol'; key: string; navigable: boolean; children: ReactNode; props: MenuControlItemProps };

const flattenChildren = (children: ReactNode): ReactElement[] =>
  children == null
    ? []
    : Children.toArray(children).flatMap((child) => {
        if (child == null) return [];
        if (Array.isArray(child)) return flattenChildren(child);
        if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment)
          return flattenChildren(child.props.children);
        return isValidElement(child) ? [child] : [];
      });

const parseEntries = (children: ReactNode): MenuEntry[] =>
  flattenChildren(children).reduce<MenuEntry[]>((entries, child) => {
    if (child.type === MenuSeparator) {
      entries.push({ type: 'separator', navigable: false });
      return entries;
    }
    if (child.type === MenuGroup) {
      const props = child.props as MenuGroupProps;
      const groupEntries = parseEntries(props.children);
      if (groupEntries.length > 0) {
        entries.push({ type: 'groupstart', length: groupEntries.length, navigable: false, props });
        entries.push(...groupEntries);
        entries.push({ type: 'groupend', length: groupEntries.length, navigable: false, props });
      }
      return entries;
    }
    if (child.type === MenuItem) {
      const props = child.props as MenuItemProps;
      entries.push(
        props.render != null
          ? { type: 'customitem', key: props.id, navigable: props.navigable ?? true, render: props.render, props }
          : {
              type: 'item',
              key: props.id,
              navigable: true,
              label: props.label,
              void_label: props.void_label,
              children: props.children ? parseEntries(props.children) : undefined,
              onChildrenScroll: props.onChildrenScroll,
              props,
              childRowHeight: props.childRowHeight,
              listClassName: props.listClassName,
              subMenuClassName: props.subMenuClassName,
            },
      );
      return entries;
    }
    if (child.type === MenuCheckboxItem) {
      const props = child.props as MenuCheckboxItemProps;
      entries.push({ type: 'checkbox', key: props.id, navigable: true, props });
      return entries;
    }
    if (child.type === MenuRadioItem) {
      const props = child.props as MenuRadioItemProps;
      entries.push({ type: 'radio', key: props.id, navigable: true, props });
      return entries;
    }
    if (child.type === MenuSwitchItem) {
      const props = child.props as MenuSwitchItemProps;
      entries.push({ type: 'switch', key: props.id, navigable: true, props });
      return entries;
    }
    if (child.type === MenuTextInputItem) {
      const props = child.props as MenuTextInputItemProps;
      entries.push({ type: 'textinput', key: props.id, navigable: true, props });
      return entries;
    }
    if (child.type === MenuControlItem) {
      const props = child.props as MenuControlItemProps;
      entries.push(
        props.control != null
          ? { type: 'control', key: props.id, navigable: true, props }
          : {
              type: 'compositecontrol',
              key: props.id,
              navigable: props.interactive !== false,
              children: props.children,
              props,
            },
      );
      return entries;
    }
    const type = child.type as unknown;
    const name = typeof type === 'function' ? (type as { name?: string }).name : type;
    throw Error(
      `Menu API only allows Items and groups of Items as children. Received ${String(name ?? child)} (${typeof child}) instead`,
    );
  }, []);

const toNavigatorItems = (entries: MenuEntry[]): MenuNavigatorItem[] =>
  entries.reduce<MenuNavigatorItem[]>((items, entry) => {
    if (entry.navigable && 'key' in entry) {
      items.push({
        key: entry.key,
        hasAction: entry.type === 'item' && entry.props.action != null,
        children: entry.type === 'item' && entry.children != null ? toNavigatorItems(entry.children) : undefined,
      });
    }
    return items;
  }, []);

const sameNavigatorItems = (a: MenuNavigatorItem[] | undefined, b: MenuNavigatorItem[] | undefined): boolean => {
  if (a === b) return true;
  if (a == null || b == null || a.length !== b.length) return false;
  return a.every(
    (item, index) =>
      item.key === b[index].key &&
      item.hasAction === b[index].hasAction &&
      sameNavigatorItems(item.children, b[index].children),
  );
};

const MenuSeparatorRow = () => (
  <div
    role="separator"
    className={styles.separator}
    style={{ '--custom-menu-separator-margin': '8px' } as CSSProperties}
  />
);

MenuSeparatorRow.displayName = 'MenuSeparator';

const MenuGroupRow = ({
  contents,
  label,
  className,
  color = 'default',
}: {
  contents: ReactNode[];
  label?: ReactNode;
  className?: string;
  color?: MenuItemColor;
}) =>
  contents.length === 0 ? null : (
    <div aria-label={typeof label === 'string' ? label : undefined} role="group" className={className}>
      {label != null ? (
        <div className={clsx(styles.groupLabel, styles.hideInteraction, MENU_COLOR_CLASSES[color])}>{label}</div>
      ) : null}
      {contents}
    </div>
  );

MenuGroupRow.displayName = 'MenuGroup';

// Submenus open beside their item, flipping to the left when there's no room.
const SubmenuPlacementContext = createContext<FloatingLayerPlacement>('right-start');

SubmenuPlacementContext.displayName = 'MenuSubmenuPlacementContext';

// Submenus line their first item up with their parent item.
const SUBMENU_ALIGNMENT_SPACING = -(
  (tokens.modules.menu.BORDER_WIDTH.resolve({}) as number) +
  (tokens.modules.menu.SCROLLER_BLOCK_PADDING.resolve({}) as number)
);

interface SubmenuProps {
  parentItem: ReactNode;
  isFocused: boolean;
  menuSubmenuProps: MenuSubmenuDomProps;
}

const MenuSubmenu = ({
  subMenuClassName,
  parentItem,
  isFocused,
  menuSubmenuProps,
  renderSubmenu,
}: SubmenuProps & { subMenuClassName?: string; renderSubmenu: () => ReactNode }) => {
  const placement = useContext(SubmenuPlacementContext);
  const { focusIndex: _focusIndex, isUsingKeyboardNavigation: _keyboard, ...submenuProps } = menuSubmenuProps;
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  return (
    <FloatingLayer
      open={hovered || isFocused}
      viewportPadding={48}
      shiftPadding={8}
      maxHeight={360}
      onOpenChange={setHovered}
      spacing={4}
      alignmentSpacing={SUBMENU_ALIGNMENT_SPACING}
      placement={placement}
      portal={false}
      crossAccessFlip={false}
      trigger="hover"
      renderLayer={({ placement: resolvedPlacement }) => (
        <SubmenuPlacementContext.Provider value={resolvedPlacement}>
          <div className={styles.submenuPaddingContainer}>
            <div className={clsx(styles.submenu, subMenuClassName)} {...submenuProps} ref={ref}>
              <ScrollerThin className={clsx(styles.scroller, styles.scrollerWithScrollbar)}>
                {renderSubmenu()}
              </ScrollerThin>
            </div>
          </div>
        </SubmenuPlacementContext.Provider>
      )}
    >
      {({ ref: triggerRef, props }) => (
        <div ref={triggerRef} {...props}>
          {parentItem}
        </div>
      )}
    </FloatingLayer>
  );
};

MenuSubmenu.displayName = 'MenuSubmenu';

// A submenu with fixed-height rows renders them in a virtualized list.
const MenuSubmenuList = ({
  parentItem,
  isFocused,
  menuSubmenuProps,
  rows,
  rowHeight,
  onScroll,
  listClassName,
}: SubmenuProps & {
  rows: ReactNode[];
  rowHeight: number;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  listClassName?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<ListScrollerHandle>(null);
  const { isUsingKeyboardNavigation, focusIndex, ...submenuProps } = menuSubmenuProps;
  const [hovered, setHovered] = useState(false);
  useLayoutEffect(() => {
    if (isFocused) ref.current?.focus();
  }, [isFocused]);
  useEffect(() => {
    if (isFocused && focusIndex >= 0 && isUsingKeyboardNavigation)
      listRef.current?.scrollToIndex({ section: 0, row: focusIndex });
  }, [isFocused, isUsingKeyboardNavigation, focusIndex]);
  return (
    <FloatingLayer
      open={hovered || isFocused}
      onOpenChange={setHovered}
      trigger="hover"
      spacing={4}
      placement="right-start"
      autoFlip
      portal={false}
      viewportPadding={48}
      shiftPadding={8}
      maxHeight={360}
      renderLayer={() =>
        rows.length > 0 && (
          <div className={styles.submenuPaddingContainer}>
            <div className={styles.submenu} {...submenuProps} ref={ref}>
              <ListThin
                ref={listRef}
                className={listClassName}
                paddingTop={6}
                paddingBottom={6}
                style={{ paddingLeft: 8 }}
                onScroll={onScroll}
                sections={[rows.length]}
                sectionHeight={0}
                rowHeight={rowHeight}
                renderRow={({ row }) => rows[row]}
              />
            </div>
          </div>
        )
      }
    >
      {({ ref: triggerRef, props }) => (
        <div ref={triggerRef} {...props}>
          {parentItem}
        </div>
      )}
    </FloatingLayer>
  );
};

MenuSubmenuList.displayName = 'MenuSubmenuList';

const NOOP = () => {};

const renderEntries = (entries: MenuEntry[], navigator: MenuNavigator, parentPath: string[], onClose: () => void) => {
  let itemsSinceSeparator = 0;
  const groups: ReactNode[][] = [];
  return entries.reduce<ReactNode[]>((rendered, entry, index) => {
    const target = groups.length > 0 ? groups[groups.length - 1] : rendered;
    switch (entry.type) {
      case 'separator':
        target.push(<MenuSeparatorRow key={`separator-${index}`} />);
        itemsSinceSeparator = 0;
        break;
      case 'groupstart':
        if (itemsSinceSeparator > 0 && entry.length > 0) {
          target.push(<MenuSeparatorRow key={`separator-${index}`} />);
          itemsSinceSeparator = 0;
        }
        groups.push([]);
        break;
      case 'groupend':
        if (groups.length > 0)
          rendered.push(<MenuGroupRow key={`group-${index}`} contents={groups.pop()!} {...entry.props} />);
        break;
      case 'item': {
        const { children, childRowHeight, onChildrenScroll, listClassName, subMenuClassName } = entry;
        const hasSubmenu = children != null;
        const path = [...parentPath, entry.key];
        const isFocused = navigator.isFocused(path);
        const { id: _id, children: _children, ...itemProps } = entry.props;
        const row = (
          <MenuItemRow
            key={entry.key}
            {...itemProps}
            {...(entry.label != null ? { label: entry.label } : { void_label: entry.void_label })}
            hasSubmenu={hasSubmenu}
            isFocused={isFocused}
            menuItemProps={{
              ...navigator.getItemProps({ path, hasSubmenu }),
              ...(hasSubmenu ? { 'aria-haspopup': true } : {}),
            }}
            onClose={onClose}
          />
        );
        if (!hasSubmenu) target.push(row);
        else if (childRowHeight != null)
          target.push(
            <MenuSubmenuList
              key={`${entry.key}-submenu`}
              parentItem={row}
              isFocused={isFocused}
              menuSubmenuProps={navigator.getSubmenuProps({ path })}
              rows={renderEntries(children, navigator, path, onClose)}
              rowHeight={childRowHeight}
              onScroll={onChildrenScroll}
              listClassName={listClassName}
            />,
          );
        else
          target.push(
            <MenuSubmenu
              key={`${entry.key}-submenu`}
              subMenuClassName={subMenuClassName}
              parentItem={row}
              isFocused={isFocused}
              menuSubmenuProps={navigator.getSubmenuProps({ path })}
              renderSubmenu={() => renderEntries(children, navigator, path, onClose)}
            />,
          );
        itemsSinceSeparator++;
        break;
      }
      case 'customitem': {
        const path = [...parentPath, entry.key];
        target.push(
          <MenuCustomItemRow
            key={entry.key}
            color={entry.props.color}
            disabled={entry.props.disabled}
            keepItemStyles={entry.props.keepItemStyles}
            action={entry.props.action}
            dontCloseOnAction={entry.props.dontCloseOnAction}
            dontCloseOnActionIfHoldingShiftKey={entry.props.dontCloseOnActionIfHoldingShiftKey}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path, navigable: entry.navigable })}
            onClose={onClose}
          >
            {entry.render}
          </MenuCustomItemRow>,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'checkbox': {
        const path = [...parentPath, entry.key];
        const { id: _id, ...props } = entry.props;
        target.push(
          <MenuCheckboxItemRow
            key={entry.key}
            {...props}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path, role: 'menuitemcheckbox' })}
          />,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'radio': {
        const path = [...parentPath, entry.key];
        const { id: _id, group: _group, ...props } = entry.props;
        target.push(
          <MenuRadioItemRow
            key={entry.key}
            {...props}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path, role: 'menuitemradio' })}
          />,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'switch': {
        const path = [...parentPath, entry.key];
        const { id: _id, ...props } = entry.props;
        target.push(
          <MenuSwitchItemRow
            key={entry.key}
            {...props}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path, role: 'menuitemcheckbox' })}
          />,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'textinput': {
        const path = [...parentPath, entry.key];
        const { id: _id, ...props } = entry.props;
        target.push(
          <MenuTextInputItemRow
            key={entry.key}
            {...props}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path })}
          />,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'control': {
        const path = [...parentPath, entry.key];
        const { id: _id, children: _children, control, ...props } = entry.props;
        target.push(
          <MenuControlItemRow
            key={entry.key}
            {...props}
            control={control!}
            isFocused={navigator.isFocused(path)}
            isUsingKeyboardNavigation={navigator.isUsingKeyboardNavigation}
            menuItemProps={navigator.getItemProps({ path })}
            onClose={onClose}
          />,
        );
        itemsSinceSeparator++;
        break;
      }
      case 'compositecontrol': {
        const path = [...parentPath, entry.key];
        target.push(
          <MenuCompositeControlItemRow
            key={entry.key}
            color={entry.props.color}
            disabled={entry.props.disabled}
            showDefaultFocus={entry.props.showDefaultFocus}
            isFocused={navigator.isFocused(path)}
            menuItemProps={navigator.getItemProps({ path })}
          >
            {entry.children}
          </MenuCompositeControlItemRow>,
        );
        itemsSinceSeparator++;
      }
    }
    return rendered;
  }, []);
};

const EMPTY_FACE = '♫ (つ｡◕‿‿◕｡)つ ♪';
const EMPTY_FACE_ALT = '♫ ⊂(｡◕‿‿◕｡⊂) ♪';

const MenuEmptyLabel = () => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const [face, setFace] = useState(EMPTY_FACE);
  useEffect(() => {
    if (reducedMotion.enabled) return;
    const interval = setInterval(
      () => setFace((current) => (current === EMPTY_FACE ? EMPTY_FACE_ALT : EMPTY_FACE)),
      700,
    );
    return () => clearInterval(interval);
  }, [reducedMotion.enabled]);
  return <div style={{ width: '100%', textAlign: 'center' }}>{face}</div>;
};

MenuEmptyLabel.displayName = 'MenuEmptyLabel';

export interface MenuProps {
  navId: string;
  variant?: MenuVariant;
  hideScroller?: boolean;
  className?: string;
  children?: ReactNode;
  onClose: () => void;
  onSelect?: MenuContextValue['onSelect'];
  onInteraction?: MenuContextValue['onInteraction'];
  'aria-label'?: string;
  // Discord marks menus moved to the current API; it isn't rendered.
  'data-menu-migrated'?: boolean;
}

export const Menu = ({
  navId,
  variant = 'flexible',
  hideScroller = false,
  className,
  children,
  onClose,
  onSelect,
  onInteraction,
  'aria-label': ariaLabel,
}: MenuProps) => {
  const entries = parseEntries(children);
  const navigatorItems = toNavigatorItems(entries);
  // The navigator only sees new items when the item tree really changes.
  const itemsRef = useRef<MenuNavigatorItem[]>(navigatorItems);
  // eslint-disable-next-line react-hooks/refs -- keeps a stable item tree between renders, as Discord does.
  if (!sameNavigatorItems(itemsRef.current, navigatorItems)) itemsRef.current = navigatorItems;
  const firstKey = entries.find((entry): entry is Extract<MenuEntry, { key: string }> => 'key' in entry)?.key;
  const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
  const navigator = useMenuNavigator({
    navId,
    // eslint-disable-next-line react-hooks/refs -- see above.
    items: itemsRef.current,
    initialFocusPath: keyboardModeEnabled && firstKey != null ? [firstKey] : [],
    closeMenu: onClose,
    defaultIsUsingKeyboardNavigation: keyboardModeEnabled,
  });

  const ref = useRef<HTMLDivElement>(null);
  const layer = useContext(FloatingLayerContext);
  // Inside a focus-managing floating layer, the layer traps focus instead.
  const layerManagesFocus = (layer?.focus ?? 'none') !== 'none';
  useFocusLock(ref, { disable: layerManagesFocus });
  useEffect(() => {
    if (layerManagesFocus) ref.current?.focus();
  }, [layerManagesFocus]);

  const Scroller = hideScroller ? ScrollerNone : ScrollerThin;
  const context = useMemo(() => ({ onSelect, onInteraction }), [onSelect, onInteraction]);

  return (
    <MenuContext.Provider value={context}>
      <div
        className={clsx(styles.menu, styles[variant], className)}
        style={
          {
            '--custom-menu-viewport-padding': '16px',
            '--custom-menu-flexible-min-width': '188px',
          } as CSSProperties
        }
        {...navigator.getContainerProps()}
        ref={ref}
        aria-label={ariaLabel}
      >
        <Scroller className={clsx(styles.scroller, { [styles.scrollerWithScrollbar]: !hideScroller })}>
          {entries.length === 0 && (
            <MenuItemRow
              disabled
              void_label={() => <MenuEmptyLabel />}
              menuItemProps={navigator.getItemProps({ path: ['empty'] })}
              isFocused={false}
              onFocus={NOOP}
              onClose={onClose}
            />
          )}
          {entries.length > 0 && renderEntries(entries, navigator, [], onClose)}
        </Scroller>
      </div>
    </MenuContext.Provider>
  );
};

Menu.displayName = 'Menu';

// The placeholder shown while a lazily loaded menu loads.
export const MenuSpinner = () => (
  <div className={clsx(styles.menu, styles.loader, styles.flexible)}>
    <Spinner />
  </div>
);

MenuSpinner.displayName = 'MenuSpinner';
