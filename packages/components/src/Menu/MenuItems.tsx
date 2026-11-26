import type { ComponentType, MouseEvent, ReactElement, ReactNode, Ref, UIEvent } from 'react';
import type { IconProps } from '@discord-components/icons';
import type { BadgeProps, BadgeType } from '../Badge';
import type { MenuInteractionType } from './MenuContext';

// Menu children are descriptions: these components render nothing themselves. Menu reads their
// props, builds the navigable item tree and renders each kind of item.

export type MenuItemColor = 'default' | 'brand' | 'danger' | 'premium' | 'premium-gradient' | 'success';

export type MenuIcon = ComponentType<IconProps<'color'>>;

// An icon component, or an element (or other node) rendered as is.
export type MenuIconSource = MenuIcon | ReactElement | string | number | boolean | null;

export type MenuLabel<State> = ReactNode | ((state: State) => ReactNode);

export interface MenuItemRenderState {
  isFocused: boolean;
  disabled?: boolean;
}

export type MenuLeadingAccessory =
  | ({ type: 'icon'; icon: MenuIcon; color?: string; className?: string } & Omit<
      IconProps<'color'>,
      'color' | 'className'
    >)
  | { type: 'emoji'; emojiId?: string; src?: string; animated?: boolean }
  | { type: 'image'; src: string }
  | { type: 'avatar'; src: string }
  | { type: 'roleDot'; variant?: 'dot' | 'circle'; color?: string; colors?: unknown }
  | { type: 'status'; status: string }
  | { type: 'guildTag'; element: ReactNode };

export type MenuTrailingIndicator = { type: 'icon'; icon: MenuIcon; color?: string; className?: string } & Omit<
  IconProps<'color'>,
  'color' | 'className'
>;

export type MenuItemAction = (event: MouseEvent<HTMLElement>) => void;

export interface MenuCustomItemRenderProps {
  color: MenuItemColor;
  disabled: boolean;
  isFocused: boolean;
}

export interface MenuItemProps {
  id: string;
  label?: MenuLabel<Omit<MenuItemProps, 'id'> & { isFocused: boolean }>;
  // A label for the empty-menu placeholder and other unlocalised content.
  void_label?: MenuLabel<Omit<MenuItemProps, 'id'> & { isFocused: boolean }>;
  color?: MenuItemColor;
  icon?: MenuIconSource;
  iconLeft?: MenuIconSource;
  iconProps?: Partial<IconProps<'color'>>;
  leadingAccessory?: MenuLeadingAccessory;
  trailingIndicator?: MenuTrailingIndicator;
  shortcut?: ReactNode;
  subtext?: ReactNode;
  subtextLineClamp?: number;
  loading?: boolean;
  badge?: BadgeType | BadgeProps;
  disabled?: boolean;
  action?: MenuItemAction;
  className?: string;
  focusedClassName?: string;
  dontCloseOnActionIfHoldingShiftKey?: boolean;
  dontCloseOnAction?: boolean;
  // Submenu items.
  children?: ReactNode;
  childRowHeight?: number;
  onChildrenScroll?: (event: UIEvent<HTMLDivElement>) => void;
  listClassName?: string;
  subMenuClassName?: string;
  // Renders a custom item instead of the standard row.
  render?: (props: MenuCustomItemRenderProps) => ReactNode;
  navigable?: boolean;
  keepItemStyles?: boolean;
}

export const MenuItem = (_props: MenuItemProps) => null;

MenuItem.displayName = 'MenuItem';

export interface MenuGroupProps {
  label?: ReactNode;
  className?: string;
  color?: MenuItemColor;
  children?: ReactNode;
}

export const MenuGroup = (_props: MenuGroupProps) => null;

MenuGroup.displayName = 'MenuGroup';

export const MenuSeparator = () => null;

MenuSeparator.displayName = 'MenuSeparator';

export interface MenuCheckboxItemProps {
  id: string;
  label?: MenuLabel<MenuItemRenderState>;
  void_label?: MenuLabel<MenuItemRenderState>;
  color?: MenuItemColor;
  checked: boolean;
  subtext?: ReactNode;
  subtextLineClamp?: number;
  leftIcon?: MenuIconSource;
  leadingAccessory?: MenuLeadingAccessory;
  disabled?: boolean;
  action: MenuItemAction;
  className?: string;
  focusedClassName?: string;
}

export const MenuCheckboxItem = (_props: MenuCheckboxItemProps) => null;

MenuCheckboxItem.displayName = 'MenuCheckboxItem';

export interface MenuRadioItemProps {
  id: string;
  group: string;
  label?: MenuLabel<MenuItemRenderState>;
  void_label?: MenuLabel<MenuItemRenderState>;
  color?: MenuItemColor;
  checked: boolean;
  subtext?: ReactNode;
  subtextLineClamp?: number;
  leftIcon?: MenuIconSource;
  leadingAccessory?: MenuLeadingAccessory;
  disabled?: boolean;
  action: MenuItemAction;
}

export const MenuRadioItem = (_props: MenuRadioItemProps) => null;

MenuRadioItem.displayName = 'MenuRadioItem';

export interface MenuSwitchItemProps {
  id: string;
  label?: ReactNode;
  color?: MenuItemColor;
  subtext?: ReactNode;
  subtextLineClamp?: number;
  checked: boolean;
  disabled?: boolean;
  action: (checked: boolean) => void;
  className?: string;
}

export const MenuSwitchItem = (_props: MenuSwitchItemProps) => null;

MenuSwitchItem.displayName = 'MenuSwitchItem';

export interface MenuTextInputItemProps {
  id: string;
  label?: ReactNode;
  color?: MenuItemColor;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  'aria-label'?: string;
}

export const MenuTextInputItem = (_props: MenuTextInputItemProps) => null;

MenuTextInputItem.displayName = 'MenuTextInputItem';

// What a control's element exposes to the menu item around it.
export interface MenuControlHandle {
  focus?: () => void;
  blur?: () => void;
  // Returns true when activating the control should close the menu.
  activate?: () => boolean;
}

export interface MenuControlRenderProps {
  onClose: () => void;
  disabled?: boolean;
  isFocused: boolean;
  onInteraction: (type?: MenuInteractionType) => void;
  tabIndex: number;
}

export interface MenuControlItemProps {
  id: string;
  label?: ReactNode;
  color?: MenuItemColor;
  // A single control (a slider, a search field); without it, `children` is a composite control.
  control?: (props: MenuControlRenderProps, ref: Ref<MenuControlHandle>) => ReactNode;
  disabled?: boolean;
  showDefaultFocus?: boolean;
  interactive?: boolean;
  children?: ReactNode;
}

export const MenuControlItem = (_props: MenuControlItemProps) => null;

MenuControlItem.displayName = 'MenuControlItem';
