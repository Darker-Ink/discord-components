import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import chroma from 'chroma-js';
import clsx from 'clsx';
import { Clickable } from '../Clickable';
import { useMergeRefs } from '../hooks';
import { Text } from '../Text';
import { tokens } from '../tokens';
import { createFocusManager } from './focusManager';
import styles from './TabBar.module.css';

export type TabBarType = 'side' | 'top' | 'top-pill';
export type TabBarLook = 'grey' | 'brand' | 'custom';
export type TabBarOrientation = 'horizontal' | 'vertical';
export type TabBarItemId = string | number;

const TYPE_CLASSES: Record<TabBarType, string> = {
  side: styles.side,
  top: styles.top,
  'top-pill': styles.topPill,
};

const withAlpha = (color: string, alpha: number | null = null) => {
  if (!chroma.valid(color)) return null;
  const parsed = chroma(color);
  return parsed.alpha(alpha ?? parsed.alpha()).css();
};

const panelId = (id: string) => `${id.replace(/\s+/g, '-').toLowerCase()}-tab`;

const sideItemStyle = (color: string | undefined, state?: 'Selected' | 'Hover') => {
  if (color == null) return undefined;
  const style: CSSProperties = {};
  if (state === 'Selected') {
    style.backgroundColor = color;
    style.color = tokens.unsafe_rawColors.WHITE.css;
  } else {
    if (state === 'Hover') style.backgroundColor = withAlpha(color, 0.1) ?? undefined;
    style.color = color;
  }
  return style;
};

export interface TabBarHeaderProps {
  className?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  children?: ReactNode;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  ref?: Ref<HTMLElement>;
}

const Header = ({
  className,
  onClick,
  children,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  ref,
}: TabBarHeaderProps) =>
  onClick == null ? (
    <div className={clsx(styles.header, className)}>
      <Text tag="div" variant="heading-xs/medium" color="text-muted" className={styles.headerText} ref={ref}>
        {children}
      </Text>
    </div>
  ) : (
    <Clickable
      innerRef={ref}
      className={clsx(styles.header, className)}
      onClick={onClick}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      focusProps={{ offset: { top: -6 } }}
    >
      <Text tag="div" variant="heading-xs/medium" color="text-muted" className={styles.headerText}>
        {children}
      </Text>
    </Clickable>
  );

Header.displayName = 'TabBar.Header';

const Separator = ({ style }: { style?: CSSProperties }) => <div className={styles.separator} style={style} />;

Separator.displayName = 'TabBar.Separator';

export interface TabBarPanelProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  ref?: Ref<HTMLDivElement>;
}

const Panel = ({ children, id, ref, ...props }: TabBarPanelProps) => (
  <div {...props} ref={ref} role="tabpanel" id={panelId(id)} tabIndex={-1}>
    {children}
  </div>
);

Panel.displayName = 'TabBar.Panel';

export interface TabBarItemProps {
  children?: ReactNode;
  className?: string;
  id?: TabBarItemId;
  // Provided by the TabBar.
  selectedItem?: TabBarItemId | null;
  onItemSelect?: (id: TabBarItemId | undefined) => void;
  itemType?: TabBarType;
  color?: string;
  variant?: 'destructive';
  disabled?: boolean;
  look?: TabBarLook;
  disableItemStyles?: boolean;
  role?: 'tab' | 'button';
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  clickableRef?: Ref<HTMLElement>;
  innerRef?: Ref<HTMLElement>;
  'aria-label'?: string;
}

const Item = ({
  children,
  className,
  id,
  selectedItem,
  onItemSelect,
  itemType,
  color,
  variant,
  disabled = false,
  look = 'grey',
  disableItemStyles = false,
  role = 'tab',
  onClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  clickableRef,
  innerRef,
  'aria-label': ariaLabel,
}: TabBarItemProps) => {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const ref = useMergeRefs(innerRef, clickableRef);
  const selected = selectedItem === id;
  const isButton = role === 'button';

  const getStyle = (): CSSProperties | undefined => {
    if (color == null) return undefined;
    switch (itemType) {
      case 'side':
        if ((id != null && selectedItem === id) || active) return sideItemStyle(color, 'Selected');
        return hover ? sideItemStyle(color, 'Hover') : sideItemStyle(color);
      case 'top':
        if (selectedItem === id) return { borderColor: color, color };
        if (hover)
          return { borderColor: withAlpha(color, 0.1) ?? undefined, color: withAlpha(color, 0.6) ?? undefined };
        return { borderColor: 'transparent', color: withAlpha(color, 0.4) ?? undefined };
      case 'top-pill':
        if (selectedItem === id) return { backgroundColor: withAlpha(color, 0.2) ?? undefined, color };
        return { backgroundColor: color, color: tokens.unsafe_rawColors.WHITE.css };
      default:
        return undefined;
    }
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    if (onClick != null) onClick(event);
    else onItemSelect?.(id);
  };

  return (
    <Clickable
      className={clsx(className, {
        [styles.item]: !disableItemStyles,
        [styles.brand]: look === 'brand',
        [styles.selected]: color == null && selected,
        [styles.themed]: look === 'grey',
        [styles.disabled]: color == null && disabled,
        [styles.destructive]: variant === 'destructive',
      })}
      style={getStyle()}
      role={role}
      aria-selected={isButton ? undefined : selected}
      aria-controls={isButton ? undefined : selected ? panelId(`${id}`) : undefined}
      aria-disabled={disabled}
      tabIndex={isButton ? (disabled === true ? -1 : 0) : selected ? 0 : -1}
      onMouseEnter={(event) => {
        if (color != null) setHover(true);
        onMouseEnter?.(event);
      }}
      onClick={handleClick}
      onMouseLeave={(event) => {
        if (color != null) {
          setHover(false);
          setActive(false);
        }
        onMouseLeave?.(event);
      }}
      onMouseUp={color != null ? () => setActive(false) : undefined}
      onMouseDown={() => {
        if (color != null) setActive(true);
      }}
      onContextMenu={onContextMenu}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={ariaLabel}
      innerRef={ref}
    >
      <Text
        variant={itemType === 'top' ? 'body-sm/semibold' : 'body-md/medium'}
        color="none"
        className={styles.itemText}
      >
        {children}
      </Text>
    </Clickable>
  );
};

Item.displayName = 'TabBar.Item';

export interface TabBarProps {
  className?: string;
  children?: ReactNode;
  type?: TabBarType;
  style?: CSSProperties;
  'aria-label'?: string;
  orientation?: TabBarOrientation;
  selectedItem?: TabBarItemId | null;
  onItemSelect?: (id: TabBarItemId | undefined) => void;
  look?: TabBarLook;
}

export const TabBar = ({
  className,
  children,
  type = 'side',
  style,
  'aria-label': ariaLabel,
  orientation = 'horizontal',
  selectedItem,
  onItemSelect,
  look = 'grey',
}: TabBarProps) => {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const getNodeForKeydownEvent = async (event: KeyboardEvent<HTMLDivElement>) => {
    const focusManager = createFocusManager({
      getFocusableElements: () => {
        const element = tabBarRef.current;
        return element != null ? Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]')) : [];
      },
      getActiveElement: () => tabBarRef.current?.ownerDocument.activeElement,
    });
    const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    switch (event.key) {
      case previousKey:
        return focusManager.getPreviousFocusableElement();
      case nextKey:
        return focusManager.getNextFocusableElement();
      case 'Home':
        return focusManager.getFirstFocusableElement();
      case 'End':
        return focusManager.getLastFocusableElement();
    }
    return null;
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLDivElement>) => {
    const node = await getNodeForKeydownEvent(event);
    if (node != null) {
      event.preventDefault();
      node.focus();
    }
  };

  const renderChildren = (nodes: ReactNode) => {
    // With nothing selected, the first enabled item renders as selected.
    let assignedDefault = false;
    return Children.toArray(nodes).map((child, index) => {
      if (!isValidElement<TabBarItemProps>(child)) return null;
      let selected = selectedItem;
      if (
        selectedItem == null &&
        !assignedDefault &&
        child.type === Item &&
        child.props.id != null &&
        child.props.disabled !== true
      ) {
        selected = child.props.id;
        assignedDefault = true;
      }
      return cloneElement(child as ReactElement<TabBarItemProps>, {
        key: child.key ?? index,
        selectedItem: selected,
        onItemSelect,
        itemType: type,
        look,
      });
    });
  };

  return (
    <div
      ref={tabBarRef}
      className={clsx(className, TYPE_CLASSES[type])}
      style={style}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
    >
      {children != null ? renderChildren(children) : null}
    </div>
  );
};

TabBar.displayName = 'TabBar';
TabBar.Header = Header;
TabBar.Item = Item;
TabBar.Separator = Separator;
TabBar.Panel = Panel;
