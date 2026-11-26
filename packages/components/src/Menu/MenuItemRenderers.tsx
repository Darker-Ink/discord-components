import {
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { ChevronSmallRightIcon } from '@discord-mana/icons';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Badge } from '../Badge';
import { Checkbox } from '../Checkbox';
import { Clickable } from '../Clickable';
import { MarqueeText } from '../MarqueeText';
import { RadioIndicator } from '../RadioGroup';
import { Spinner, SpinnerTypes } from '../Spinner';
import { Switch } from '../Switch';
import { Text, textVariantClassNames } from '../Text';
import { TextInput } from '../TextInput';
import { MenuContext, MenuInteractionType } from './MenuContext';
import type {
  MenuCheckboxItemProps,
  MenuControlHandle,
  MenuControlItemProps,
  MenuCustomItemRenderProps,
  MenuIconSource,
  MenuItemColor,
  MenuItemProps,
  MenuLabel,
  MenuRadioItemProps,
  MenuSwitchItemProps,
  MenuTextInputItemProps,
} from './MenuItems';
import type { MenuItemDomProps } from './useMenuNavigator';
import styles from './Menu.module.css';

export const MENU_COLOR_CLASSES: Record<MenuItemColor, string> = {
  default: styles.colorDefault,
  brand: styles.colorBrand,
  danger: styles.colorDanger,
  premium: styles.colorPremium,
  'premium-gradient': styles.colorPremiumGradient,
  success: styles.colorSuccess,
};

const itemClassName = clsx(styles.item, textVariantClassNames['body-sm/medium']);
const customItemClassName = clsx(styles.customItem, textVariantClassNames['body-sm/medium']);

const resolveLabel = <State,>(label: MenuLabel<State>, state: State): ReactNode =>
  typeof label === 'function' ? label(state) : label;

// Keyboard navigation scrolls the focused item into view; the mouse doesn't.
const useScrollIntoView = () => {
  const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
  return useCallback(
    (ref: RefObject<HTMLElement | null>) => {
      if (keyboardModeEnabled) ref.current?.scrollIntoView({ block: 'nearest' });
    },
    [keyboardModeEnabled],
  );
};

const isRenderableNode = (value: unknown): value is ReactNode =>
  value == null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  isValidElement(value);

const renderIcon = (
  icon: MenuIconSource | undefined,
  containerClassName: string,
  iconProps?: MenuItemProps['iconProps'],
) => {
  if (isRenderableNode(icon)) return icon;
  const Icon = icon;
  return (
    <div className={containerClassName}>
      <Icon color="currentColor" {...iconProps} className={clsx(styles.icon, iconProps?.className)} />
    </div>
  );
};

const Subtext = ({ children, lineClamp }: { children: ReactNode; lineClamp?: number }) => (
  <Text
    variant="body-xs/normal"
    className={clsx(styles.subtext, { [styles.subtextLineClamp]: lineClamp != null })}
    lineClamp={lineClamp}
  >
    {children}
  </Text>
);

Subtext.displayName = 'MenuSubtext';

export interface MenuItemRowProps extends Omit<MenuItemProps, 'id' | 'children'> {
  hasSubmenu?: boolean;
  isFocused: boolean;
  menuItemProps: MenuItemDomProps & { 'aria-haspopup'?: boolean };
  onClose: () => void;
  onFocus?: () => void;
}

export const MenuItemRow = (props: MenuItemRowProps) => {
  const {
    color = 'default',
    label,
    void_label: voidLabel,
    icon,
    iconLeft,
    leadingAccessory,
    shortcut,
    subtext,
    subtextLineClamp,
    hasSubmenu,
    loading,
    badge,
    disabled,
    isFocused,
    menuItemProps,
    action,
    onClose,
    onFocus,
    className,
    focusedClassName,
    dontCloseOnActionIfHoldingShiftKey,
    dontCloseOnAction,
    iconProps,
  } = props;
  const { onSelect, onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLElement>(null);
  const scrollIntoView = useScrollIntoView();

  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onInteraction?.({ type: MenuInteractionType.DEFAULT });
      if (action == null) return false;
      if (!(event.shiftKey && dontCloseOnActionIfHoldingShiftKey) && !dontCloseOnAction) onClose();
      onSelect?.();
      // The menu closes first; the action runs on the next frame.
      (event.nativeEvent.view ?? window).requestAnimationFrame(() => action(event));
    },
    [action, onClose, onSelect, dontCloseOnActionIfHoldingShiftKey, dontCloseOnAction, onInteraction],
  );

  useEffect(() => {
    if (isFocused) {
      scrollIntoView(ref);
      onFocus?.();
    }
  }, [isFocused, onFocus, scrollIntoView]);

  return (
    <Clickable
      innerRef={ref}
      className={clsx(
        itemClassName,
        styles.labelContainer,
        MarqueeText.rowClassName,
        MENU_COLOR_CLASSES[color],
        className,
        { [styles.disabled]: disabled, [styles.focused]: isFocused },
        isFocused && focusedClassName,
      )}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      {...menuItemProps}
      data-menu-item="true"
      data-marquee-active={isFocused}
    >
      {leadingAccessory?.type === 'status' ? (
        <div className={styles.statusAccessory} />
      ) : (
        iconLeft != null && renderIcon(iconLeft, styles.iconContainerLeft, iconProps)
      )}
      <div className={styles.label}>
        {resolveLabel(voidLabel ?? label, { ...props, isFocused })}
        {subtext != null && <Subtext lineClamp={subtextLineClamp}>{subtext}</Subtext>}
      </div>
      {shortcut != null && <div className={styles.shortcutContainer}>{shortcut}</div>}
      {badge != null && (
        <div className={styles.badgeContainer}>
          {typeof badge === 'object' && 'type' in badge ? <Badge {...badge} /> : <Badge type={badge} />}
        </div>
      )}
      {loading && (
        <div className={styles.iconContainer}>
          <Spinner type={SpinnerTypes.PULSING_ELLIPSIS} />
        </div>
      )}
      {icon != null && renderIcon(icon, styles.iconContainer, iconProps)}
      {hasSubmenu && (
        <div className={styles.iconContainer}>
          <ChevronSmallRightIcon size="md" color="currentColor" className={styles.caret} />
        </div>
      )}
    </Clickable>
  );
};

MenuItemRow.displayName = 'MenuItemRow';

export interface MenuCustomItemRowProps {
  children: (props: MenuCustomItemRenderProps) => ReactNode;
  color?: MenuItemColor;
  isFocused?: boolean;
  disabled?: boolean;
  keepItemStyles?: boolean;
  menuItemProps: MenuItemDomProps;
  action?: MenuItemProps['action'];
  dontCloseOnActionIfHoldingShiftKey?: boolean;
  dontCloseOnAction?: boolean;
  onClose: () => void;
}

export const MenuCustomItemRow = ({
  children,
  color = 'default',
  isFocused = false,
  disabled = false,
  keepItemStyles = false,
  menuItemProps,
  action,
  dontCloseOnActionIfHoldingShiftKey,
  dontCloseOnAction,
  onClose,
}: MenuCustomItemRowProps) => {
  const ref = useRef<HTMLElement>(null);
  const scrollIntoView = useScrollIntoView();
  useEffect(() => {
    if (isFocused) scrollIntoView(ref);
  }, [isFocused, scrollIntoView]);
  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (action == null) return false;
      if (!(event.shiftKey && dontCloseOnActionIfHoldingShiftKey) && !dontCloseOnAction) onClose();
      requestAnimationFrame(() => action(event));
    },
    [action, onClose, dontCloseOnActionIfHoldingShiftKey, dontCloseOnAction],
  );
  const className = keepItemStyles
    ? clsx(itemClassName, MENU_COLOR_CLASSES[color], { [styles.focused]: isFocused })
    : customItemClassName;
  return (
    <Clickable
      innerRef={ref}
      className={className}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      {...menuItemProps}
    >
      {children({ color, disabled, isFocused })}
    </Clickable>
  );
};

MenuCustomItemRow.displayName = 'MenuCustomItemRow';

export interface MenuCheckboxItemRowProps extends Omit<MenuCheckboxItemProps, 'id'> {
  isFocused: boolean;
  menuItemProps: MenuItemDomProps;
}

export const MenuCheckboxItemRow = ({
  color = 'default',
  label,
  void_label: voidLabel,
  checked,
  subtext,
  subtextLineClamp,
  leftIcon,
  disabled,
  isFocused,
  menuItemProps,
  action,
  className,
  focusedClassName,
}: MenuCheckboxItemRowProps) => {
  const { onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLElement>(null);
  const scrollIntoView = useScrollIntoView();
  useEffect(() => {
    if (isFocused) scrollIntoView(ref);
  }, [isFocused, scrollIntoView]);
  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      action(event);
      onInteraction?.({ type: MenuInteractionType.CHECKBOX });
    },
    [action, onInteraction],
  );
  return (
    <Clickable
      innerRef={ref}
      className={clsx(
        itemClassName,
        styles.checkboxContainer,
        styles.labelContainer,
        MarqueeText.rowClassName,
        MENU_COLOR_CLASSES[color],
        className,
        { [styles.disabled]: disabled, [styles.focused]: isFocused },
        isFocused && focusedClassName,
      )}
      onClick={disabled ? undefined : onClick}
      {...menuItemProps}
      aria-checked={checked}
      aria-disabled={disabled}
      data-marquee-active={isFocused}
    >
      {leftIcon != null && renderIcon(leftIcon, styles.iconContainerLeft)}
      <div className={styles.label}>
        {resolveLabel(voidLabel ?? label, { isFocused, disabled })}
        {subtext != null && <Subtext lineClamp={subtextLineClamp}>{subtext}</Subtext>}
      </div>
      <div className={styles.iconContainer}>
        <Checkbox checked={checked} disabled={disabled} displayOnly usageVariant="indicator" />
      </div>
    </Clickable>
  );
};

MenuCheckboxItemRow.displayName = 'MenuCheckboxItemRow';

export interface MenuRadioItemRowProps extends Omit<MenuRadioItemProps, 'id' | 'group'> {
  isFocused: boolean;
  menuItemProps: MenuItemDomProps;
}

export const MenuRadioItemRow = ({
  color = 'default',
  label,
  void_label: voidLabel,
  checked,
  subtext,
  subtextLineClamp,
  leftIcon,
  disabled,
  isFocused,
  menuItemProps,
  action,
}: MenuRadioItemRowProps) => {
  const { onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLElement>(null);
  const scrollIntoView = useScrollIntoView();
  useEffect(() => {
    if (isFocused) scrollIntoView(ref);
  }, [isFocused, scrollIntoView]);
  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      action(event);
      onInteraction?.({ type: MenuInteractionType.RADIO });
    },
    [action, onInteraction],
  );
  return (
    <Clickable
      innerRef={ref}
      className={clsx(itemClassName, styles.labelContainer, MarqueeText.rowClassName, MENU_COLOR_CLASSES[color], {
        [styles.disabled]: disabled,
        [styles.focused]: isFocused,
      })}
      onClick={disabled ? undefined : onClick}
      {...menuItemProps}
      aria-checked={checked}
      aria-disabled={disabled}
      data-marquee-active={isFocused}
    >
      {leftIcon != null && renderIcon(leftIcon, styles.iconContainerLeft)}
      <div className={styles.label}>
        {resolveLabel(voidLabel ?? label, { isFocused, disabled })}
        {subtext != null && <Subtext lineClamp={subtextLineClamp}>{subtext}</Subtext>}
      </div>
      <div className={styles.iconContainer}>
        <RadioIndicator checked={checked} disabled={disabled} />
      </div>
    </Clickable>
  );
};

MenuRadioItemRow.displayName = 'MenuRadioItemRow';

export interface MenuSwitchItemRowProps extends Omit<MenuSwitchItemProps, 'id'> {
  isFocused: boolean;
  menuItemProps: MenuItemDomProps;
}

export const MenuSwitchItemRow = ({
  color = 'default',
  label,
  subtext,
  subtextLineClamp,
  checked,
  disabled = false,
  isFocused,
  menuItemProps,
  action,
  className,
}: MenuSwitchItemRowProps) => {
  const { onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLElement>(null);
  const scrollIntoView = useScrollIntoView();
  useEffect(() => {
    if (isFocused) scrollIntoView(ref);
  }, [isFocused, scrollIntoView]);
  const onClick = useCallback(() => {
    action(!checked);
    onInteraction?.({ type: MenuInteractionType.SWITCH });
  }, [action, checked, onInteraction]);
  return (
    <Clickable
      innerRef={ref}
      className={clsx(itemClassName, styles.switchItem, MENU_COLOR_CLASSES[color], className, {
        [styles.disabled]: disabled,
        [styles.focused]: isFocused,
      })}
      onClick={disabled ? undefined : onClick}
      aria-checked={checked}
      aria-disabled={disabled}
      {...menuItemProps}
    >
      {label != null ? (
        <div className={styles.labelContainer}>
          <div className={styles.label}>
            {label}
            {subtext != null && <Subtext lineClamp={subtextLineClamp}>{subtext}</Subtext>}
          </div>
        </div>
      ) : null}
      <div className={styles.switchContainer} aria-hidden>
        <Switch checked={checked} disabled={disabled} displayOnly />
      </div>
    </Clickable>
  );
};

MenuSwitchItemRow.displayName = 'MenuSwitchItemRow';

const MEASURE_STYLE: CSSProperties = {
  position: 'absolute',
  visibility: 'hidden',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

export interface MenuTextInputItemRowProps extends Omit<MenuTextInputItemProps, 'id'> {
  isFocused: boolean;
  menuItemProps: MenuItemDomProps;
}

export const MenuTextInputItemRow = ({
  color = 'default',
  label,
  value,
  onChange,
  placeholder = '',
  maxLength,
  disabled = false,
  'aria-label': ariaLabel,
  isFocused,
  menuItemProps,
}: MenuTextInputItemRowProps) => {
  const { onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [minWidth, setMinWidth] = useState<number | null>(null);
  const scrollIntoView = useScrollIntoView();

  // The field is at least wide enough to show its whole placeholder.
  useLayoutEffect(() => {
    if (placeholder === '' || measureRef.current == null || inputRef.current == null) {
      setMinWidth(null);
      return;
    }
    const computed = window.getComputedStyle(inputRef.current);
    const measure = measureRef.current;
    measure.style.font = computed.font;
    measure.style.letterSpacing = computed.letterSpacing;
    const width = measure.getBoundingClientRect().width;
    const padding = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight);
    setMinWidth(Math.ceil(width + (Number.isNaN(padding) ? 24 : padding) + 2));
  }, [placeholder]);

  useEffect(() => {
    if (isFocused) {
      scrollIntoView(ref);
      inputRef.current?.focus();
    }
  }, [isFocused, scrollIntoView]);

  const handleChange = useCallback(
    (next: string) => {
      onChange(next);
      onInteraction?.({ type: MenuInteractionType.DEFAULT });
    },
    [onChange, onInteraction],
  );

  return (
    <div
      ref={ref}
      className={clsx(itemClassName, styles.textInputItem, styles.hideInteraction, MENU_COLOR_CLASSES[color], {
        [styles.disabled]: disabled,
      })}
      aria-disabled={disabled}
      {...menuItemProps}
    >
      {label != null ? (
        <div className={styles.labelContainer}>
          <div className={styles.label}>{label}</div>
        </div>
      ) : null}
      <div className={styles.textInputWrapper} style={minWidth != null ? { minWidth } : undefined}>
        <span ref={measureRef} aria-hidden style={MEASURE_STYLE}>
          {placeholder}
        </span>
        <TextInput
          inputRef={inputRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
};

MenuTextInputItemRow.displayName = 'MenuTextInputItemRow';

export interface MenuControlItemRowProps extends Omit<MenuControlItemProps, 'id' | 'control' | 'children'> {
  control: NonNullable<MenuControlItemProps['control']>;
  isFocused: boolean;
  isUsingKeyboardNavigation?: boolean;
  menuItemProps: MenuItemDomProps;
  onClose: () => void;
}

export const MenuControlItemRow = ({
  color = 'default',
  label,
  control,
  disabled,
  isFocused,
  isUsingKeyboardNavigation = false,
  showDefaultFocus = false,
  interactive = true,
  menuItemProps,
  onClose,
}: MenuControlItemRowProps) => {
  const { onInteraction } = useContext(MenuContext);
  const ref = useRef<HTMLDivElement>(null);
  const controlRef = useRef<MenuControlHandle>(null);
  const scrollIntoView = useScrollIntoView();
  useLayoutEffect(() => {
    if (isFocused) {
      scrollIntoView(ref);
      controlRef.current?.focus?.();
    } else if (isUsingKeyboardNavigation) controlRef.current?.blur?.();
  }, [isFocused, isUsingKeyboardNavigation, scrollIntoView]);
  const onClick = useCallback(() => {
    if (controlRef.current?.activate?.()) onClose();
  }, [onClose]);
  const handleInteraction = useCallback(
    (type?: MenuInteractionType) => onInteraction?.({ type: type ?? MenuInteractionType.DEFAULT }),
    [onInteraction],
  );
  // The control receives the ref to attach, as Discord's control items do; it isn't read here.
  const element = control(
    { onClose, disabled, isFocused, onInteraction: handleInteraction, tabIndex: menuItemProps.tabIndex },
    // eslint-disable-next-line react-hooks/refs
    controlRef,
  );
  return (
    <div
      onClick={onClick}
      className={clsx(itemClassName, MENU_COLOR_CLASSES[color], {
        [styles.disabled]: disabled,
        [styles.focused]: showDefaultFocus && isFocused,
        [styles.hideInteraction]: !showDefaultFocus,
        [styles.nonInteractive]: !interactive,
      })}
      aria-disabled={disabled}
      {...menuItemProps}
    >
      {label != null ? (
        <div className={styles.labelContainer}>
          <div className={styles.label}>{label}</div>
        </div>
      ) : null}
      {element}
    </div>
  );
};

MenuControlItemRow.displayName = 'MenuControlItemRow';

export interface MenuCompositeControlItemRowProps {
  color?: MenuItemColor;
  disabled?: boolean;
  isFocused: boolean;
  showDefaultFocus?: boolean;
  menuItemProps: MenuItemDomProps;
  children?: ReactNode;
}

export const MenuCompositeControlItemRow = ({
  color = 'default',
  disabled,
  isFocused,
  showDefaultFocus = false,
  menuItemProps,
  children,
}: MenuCompositeControlItemRowProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollIntoView = useScrollIntoView();
  useLayoutEffect(() => {
    if (!isFocused) return;
    const element = ref.current;
    if (element == null) return;
    scrollIntoView(ref);
    element.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [isFocused, scrollIntoView]);
  return (
    <div
      ref={ref}
      className={clsx(itemClassName, MENU_COLOR_CLASSES[color], {
        [styles.disabled]: disabled,
        [styles.focused]: showDefaultFocus && isFocused,
        [styles.hideInteraction]: !showDefaultFocus,
      })}
      aria-disabled={disabled}
      {...menuItemProps}
    >
      {children}
    </div>
  );
};

MenuCompositeControlItemRow.displayName = 'MenuCompositeControlItemRow';
