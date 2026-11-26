import { useCallback, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Clickable, type ClickableProps } from '../Clickable';
import { HiddenVisually } from '../HiddenVisually';
import { getAcronym } from '../Toast';
import { tokens, useToken } from '../tokens';
import styles from './NavItem.module.css';

// Font sizes for acronyms of 1 to 7+ characters.
const ACRONYM_FONT_SIZES = [18, 18, 16, 16, 14, 12, 10];

export type NavItemBackgroundStyle = 'always' | 'on-hover';

export type NavItemLocation = string | { pathname?: string; state?: unknown };

export interface NavItemProps extends Omit<ClickableProps, 'onClick' | 'children' | 'style'> {
  /** When the background shows: always, or only on hover/selected (children only). */
  backgroundStyle?: NavItemBackgroundStyle;
  children?: ReactNode;
  /** Image URL; without one the acronym of `name` is shown. */
  icon?: string | null;
  name?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  /** Location to navigate to on click. */
  to?: NavItemLocation;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  selected?: boolean;
}

const childWrapperClassName = (backgroundStyle: NavItemBackgroundStyle, hoverScale: boolean) =>
  clsx({
    [styles.childWrapper]: true,
    [styles.childWrapperNoHoverBg]: backgroundStyle === 'always',
    [styles.childWrapperHoverScale]: backgroundStyle === 'on-hover' && hoverScale,
  });

// Navigates like the client's router history (push with optional state).
const pushLocation = (to: NavItemLocation) => {
  if (typeof to === 'string') window.history.pushState(null, '', to);
  else window.history.pushState(to.state ?? null, '', to.pathname ?? '');
};

// A guild-bar item: an icon, or the acronym of its name, that highlights on hover and when selected.
export const NavItem = ({
  backgroundStyle = 'always',
  children,
  icon,
  name,
  ariaLabel,
  className,
  style,
  to,
  onClick,
  selected = false,
  ...props
}: NavItemProps) => {
  let acronym: string | undefined;
  let fontSize: number | undefined;
  if (icon == null && name != null) {
    acronym = getAcronym(name);
    fontSize = ACRONYM_FONT_SIZES[acronym.length - 1] ?? ACRONYM_FONT_SIZES[ACRONYM_FONT_SIZES.length - 1];
  }
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (to != null) pushLocation(to);
      onClick?.(event);
    },
    [to, onClick],
  );
  const avatarSize = useToken(tokens.modules.guildbar.AVATAR_SIZE) as number;
  return (
    <Clickable
      {...props}
      onClick={handleClick}
      className={clsx(className, styles.wrapper, { [styles.selected]: selected })}
      style={{ ...style, fontSize }}
      focusProps={{ enabled: false }}
    >
      <HiddenVisually>{ariaLabel != null && ariaLabel !== '' ? ariaLabel : (name ?? '')}</HiddenVisually>
      {acronym != null ? (
        <div className={clsx(childWrapperClassName(backgroundStyle, false), styles.acronym)} aria-hidden>
          {acronym}
        </div>
      ) : null}
      {icon != null ? (
        <img className={styles.icon} src={icon} alt=" " width={avatarSize} height={avatarSize} aria-hidden />
      ) : null}
      {children != null ? <div className={childWrapperClassName(backgroundStyle, true)}>{children}</div> : null}
    </Clickable>
  );
};

NavItem.displayName = 'NavItem';
