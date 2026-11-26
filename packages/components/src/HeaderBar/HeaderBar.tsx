import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  type ComponentType,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { ChevronSmallLeftIcon, ChevronSmallRightIcon, iconA11yProps, type IconColor } from '@discord-components/icons';
import { Clickable } from '../Clickable';
import { FocusRingScope } from '../FocusRing';
import { Heading } from '../Heading';
import { HeadingLevel } from '../HeadingLevel';
import { DEFAULT_TOAST_SURFACE, useToastTopOffsetAnchor } from '../Toast';
import { Tooltip, type TooltipAlign, type TooltipPosition } from '../Tooltip';
import { isMobile } from '../utils/platform';
import { Hamburger } from './Hamburger';
import styles from './HeaderBar.module.css';

/** Provided by layouts with a collapsible sidebar: opens it from the header's hamburger on mobile. */
export const HeaderBarSidebarToggleContext = createContext<MouseEventHandler<HTMLButtonElement> | undefined>(undefined);
HeaderBarSidebarToggleContext.displayName = 'HeaderBarSidebarToggleContext';

export interface HeaderBarIconBadge {
  position?: 'top' | 'bottom';
  type?: 'important' | 'unread';
  text?: string;
}

export interface HeaderBarIconComponentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  size?: 'custom';
  className?: string;
  color?: IconColor;
  colorClass?: string;
  secondaryColorClass?: string;
  'aria-hidden'?: boolean;
}

export interface HeaderBarIconProps {
  className?: string;
  iconClassName?: string;
  children?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  badge?: HeaderBarIconBadge | null;
  color?: IconColor;
  /** Class for the icon's color, instead of `color`. */
  foreground?: string;
  /** Class for the icon's secondary color. */
  background?: string;
  icon: ComponentType<HeaderBarIconComponentProps>;
  iconSize?: number;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  tooltip?: ReactNode;
  tooltipPosition?: TooltipPosition;
  tooltipAlign?: TooltipAlign;
  tooltipDisabled?: boolean;
  tooltipSpacing?: number;
  role?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
  'aria-checked'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'data-jump-section'?: string;
  ref?: Ref<HTMLElement>;
}

const BADGE_MASKS = { top: 0.25, bottom: 0.75 } as const;

// The icon cut out where its badge sits (Discord's header bar badge masks).
const BadgeMask = ({
  position,
  width,
  height,
  rightOverhang,
  bottomOverhang,
  children,
}: {
  position: 'top' | 'bottom';
  width: number;
  height: number;
  rightOverhang: number;
  bottomOverhang: number;
  children: ReactNode;
}) => {
  const id = `svg-mask-header-bar-badge-${position}-${useId()}`;
  return (
    <svg
      width={width + rightOverhang}
      height={height + bottomOverhang}
      viewBox={`0 0 ${width + rightOverhang} ${height + bottomOverhang}`}
    >
      <mask id={id} maskContentUnits="objectBoundingBox" viewBox="0 0 1 1">
        <rect fill="white" x={0} y={0} width={1} height={1} />
        <circle fill="black" cx={0.75} cy={BADGE_MASKS[position]} r={0.25} />
      </mask>
      <foreignObject x={0} y={0} width={width} height={height} overflow="visible" mask={`url(#${id})`}>
        {children}
      </foreignObject>
    </svg>
  );
};

BadgeMask.displayName = 'BadgeMask';

const IconBadge = ({
  badge,
  iconSize,
  children,
}: {
  badge: HeaderBarIconBadge;
  iconSize: number;
  children: ReactNode;
}) => {
  const { width, offset } = useMemo(() => {
    const length = badge.text?.length ?? 0;
    return length <= 0 ? { width: 8, offset: 0 } : { width: 6 + 4 * length, offset: 4 };
  }, [badge.text]);
  const style = useMemo(
    () => ({ '--__badgeWidth': `${width}px`, '--__badgeOffset': `${offset}px` }) as CSSProperties,
    [width, offset],
  );
  const hasText = (badge.text?.length ?? 0) > 0;
  return (
    <>
      <BadgeMask
        position={badge.position === 'top' ? 'top' : 'bottom'}
        height={iconSize + offset}
        width={iconSize + offset}
        rightOverhang={-offset}
        bottomOverhang={-offset}
      >
        {children}
      </BadgeMask>
      <span
        style={style}
        className={clsx(styles.iconBadge, badge.position === 'top' ? styles.iconBadgeTop : styles.iconBadgeBottom, {
          [styles.iconBadgeWithText]: hasText,
          [styles.iconBadgeStyleImportant]: badge.type === 'important',
          [styles.iconBadgeStyleUnread]: badge.type === 'unread',
        })}
      >
        {hasText ? badge.text : null}
      </span>
    </>
  );
};

IconBadge.displayName = 'IconBadge';

const HeaderBarIcon = ({
  className,
  iconClassName,
  children,
  selected = false,
  disabled = false,
  badge,
  color,
  foreground,
  background,
  icon: Icon,
  iconSize = 24,
  onClick,
  onContextMenu,
  tooltip = null,
  tooltipPosition = 'bottom',
  tooltipAlign,
  tooltipDisabled,
  tooltipSpacing,
  role,
  'aria-label': ariaLabelProp,
  'aria-hidden': ariaHidden,
  'aria-checked': ariaChecked,
  'aria-expanded': ariaExpanded,
  'aria-haspopup': ariaHasPopup,
  'data-jump-section': dataJumpSection,
  ref,
}: HeaderBarIconProps) => {
  const secondaryColor = background != null ? { secondaryColorClass: background } : {};
  const renderIcon = (hidden: boolean | undefined) => (
    <Icon
      x={0}
      y={0}
      width={iconSize}
      height={iconSize}
      size="custom"
      className={clsx(iconClassName, styles.icon)}
      colorClass={foreground ?? undefined}
      color={color ?? 'currentColor'}
      aria-hidden={hidden}
      {...secondaryColor}
    />
  );
  let ariaLabel = ariaLabelProp;
  if (ariaLabel == null && typeof tooltip === 'string') ariaLabel = tooltip;
  return (
    <Tooltip
      __unsupportedReactNodeAsText={tooltip}
      position={tooltipPosition}
      align={tooltipAlign}
      shouldShow={!tooltipDisabled}
      spacing={tooltipSpacing}
      ariaHidden
    >
      {onClick == null ? (
        <div
          ref={ref as Ref<HTMLDivElement>}
          className={clsx(className, styles.iconWrapper, { [styles.iconDisabled]: disabled })}
          aria-label={ariaLabel}
        >
          {renderIcon(ariaHidden)}
        </div>
      ) : (
        <Clickable
          innerRef={ref}
          tag="div"
          onClick={disabled ? undefined : onClick}
          onContextMenu={disabled ? undefined : onContextMenu}
          className={clsx(className, {
            [styles.iconWrapper]: true,
            [styles.clickable]: !disabled && onClick != null,
            [styles.selected]: selected,
            [styles.iconDisabled]: disabled,
          })}
          role={role}
          aria-label={ariaLabel}
          aria-hidden={ariaHidden}
          aria-disabled={disabled}
          aria-checked={ariaChecked}
          aria-haspopup={ariaHasPopup}
          aria-expanded={ariaExpanded}
          tabIndex={disabled || onClick == null ? -1 : 0}
          data-jump-section={dataJumpSection}
        >
          {badge == null ? (
            renderIcon(undefined)
          ) : (
            <IconBadge iconSize={iconSize} badge={badge}>
              {renderIcon(undefined)}
            </IconBadge>
          )}
          {children}
        </Clickable>
      )}
    </Tooltip>
  );
};

HeaderBarIcon.displayName = 'HeaderBar.Icon';

const HeaderBarChannelIcon = ({ className, ref, ...props }: HeaderBarIconProps) => (
  <HeaderBarIcon {...props} className={clsx(styles.channelIcon, className)} ref={ref} />
);

HeaderBarChannelIcon.displayName = 'HeaderBar.ChannelIcon';

export interface HeaderBarTitleProps {
  className?: string;
  wrapperClassName?: string;
  children?: ReactNode;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  id?: string;
  /** Default text color instead of the heading's. */
  muted?: boolean;
  level?: number;
  ref?: Ref<HTMLElement>;
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-selected'?: boolean;
  'aria-controls'?: string;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}

const HeaderBarTitle = ({
  className,
  wrapperClassName,
  children,
  onContextMenu,
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  id,
  muted = false,
  level = 1,
  ref,
  role,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-selected': ariaSelected,
  'aria-controls': ariaControls,
  'aria-current': ariaCurrent,
}: HeaderBarTitleProps) => {
  const heading = (
    <HeadingLevel forceLevel={level}>
      <Heading
        variant="body-md/medium"
        color={muted ? 'text-default' : undefined}
        className={clsx(className, styles.title, { [styles.titleClickable]: onClick != null })}
        id={id}
      >
        {children}
      </Heading>
    </HeadingLevel>
  );
  return onClick != null ? (
    <Clickable
      innerRef={ref}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      className={clsx(wrapperClassName, styles.titleWrapper)}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-selected={ariaSelected}
      aria-controls={ariaControls}
      aria-current={ariaCurrent}
    >
      {heading}
    </Clickable>
  ) : (
    <div
      ref={ref as Ref<HTMLDivElement>}
      className={clsx(wrapperClassName, styles.titleWrapper)}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      role={role}
      aria-label={ariaLabel}
      aria-selected={ariaSelected}
      aria-controls={ariaControls}
      aria-current={ariaCurrent}
    >
      {heading}
    </div>
  );
};

HeaderBarTitle.displayName = 'HeaderBar.Title';

const HeaderBarDivider = ({ className }: { className?: string }) => (
  <svg className={clsx(styles.dot, className)} {...iconA11yProps({})} width={24} height={24} viewBox="0 0 4 4">
    <circle cx="2" cy="2" r="2" fill="currentColor" />
  </svg>
);

HeaderBarDivider.displayName = 'HeaderBar.Divider';

export interface HeaderBarCaretProps {
  direction?: 'right' | 'left';
  className?: string;
}

const HeaderBarCaret = ({ direction = 'right', className }: HeaderBarCaretProps) =>
  direction === 'right' ? (
    <ChevronSmallRightIcon size="md" color="currentColor" className={clsx(styles.caret, className)} />
  ) : (
    <ChevronSmallLeftIcon size="md" color="currentColor" className={clsx(styles.caret, className)} />
  );

HeaderBarCaret.displayName = 'HeaderBar.Caret';

export interface HeaderBarProps {
  className?: string;
  innerClassName?: string;
  toolbarClassName?: string;
  children?: ReactNode;
  /** Rendered below the bar's row, inside the section. */
  childrenBottom?: ReactNode;
  toolbar?: ReactNode;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  role?: string;
  scrollable?: boolean;
  transparent?: boolean;
  hidden?: boolean;
  disableFocusRingScope?: boolean;
  /** Keeps toasts on the app surface below this bar. */
  keepToastsBelow?: boolean;
}

// The app's channel header: a row of titles and icons with a toolbar on the end.
export const HeaderBar = ({
  className,
  innerClassName,
  toolbarClassName,
  children,
  childrenBottom,
  toolbar,
  onDoubleClick,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  role,
  scrollable,
  transparent = false,
  hidden = false,
  disableFocusRingScope = false,
  keepToastsBelow = false,
}: HeaderBarProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const toggleSidebar = useContext(HeaderBarSidebarToggleContext);
  useToastTopOffsetAnchor(DEFAULT_TOAST_SURFACE, sectionRef, keepToastsBelow && !hidden && !transparent);
  const content = (
    <>
      <div className={styles.upperContainer}>
        <div
          className={clsx(styles.children, innerClassName, { [styles.scrollable]: scrollable })}
          onDoubleClick={onDoubleClick}
        >
          {isMobile && toggleSidebar != null ? (
            <Hamburger onClick={toggleSidebar} className={styles.hamburger} />
          ) : null}
          {children}
        </div>
        {toolbar != null ? <div className={clsx(styles.toolbar, toolbarClassName)}>{toolbar}</div> : null}
      </div>
      {childrenBottom}
    </>
  );
  return (
    <section
      className={clsx(className, styles.container, {
        [styles.themed]: !transparent,
        [styles.transparent]: transparent,
        [styles.themedMobile]: isMobile,
        [styles.hidden]: hidden,
      })}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      role={role}
      ref={sectionRef}
    >
      {disableFocusRingScope ? content : <FocusRingScope containerRef={sectionRef}>{content}</FocusRingScope>}
    </section>
  );
};

HeaderBar.displayName = 'HeaderBar';
HeaderBar.Icon = HeaderBarIcon;
HeaderBar.ChannelIcon = HeaderBarChannelIcon;
HeaderBar.Title = HeaderBarTitle;
HeaderBar.Divider = HeaderBarDivider;
HeaderBar.Caret = HeaderBarCaret;
