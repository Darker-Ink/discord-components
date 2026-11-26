import { useEffect, useState, type CSSProperties, type HTMLAttributes, type MouseEventHandler } from 'react';
import clsx from 'clsx';
import { Clickable } from '../Clickable';
import { tokens } from '../tokens';
import { Tooltip, type TooltipPosition } from '../Tooltip';
import styles from './GuildIcon.module.css';

export const GuildIconSizes = {
  SMOL: 'Smol',
  MINI: 'Mini',
  SMALLER: 'Smaller',
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  LARGER: 'Larger',
  XLARGE: 'XLarge',
} as const;

export type GuildIconSize = (typeof GuildIconSizes)[keyof typeof GuildIconSizes];

export const GuildIconPixelSizes: Record<GuildIconSize, number> = {
  Smol: 16,
  Mini: 20,
  Smaller: 24,
  Small: 30,
  Medium: 40,
  Large: 50,
  Larger: 64,
  XLarge: 100,
};

// Acronym font sizes by acronym length.
export const GuildIconAcronymSizes: Record<GuildIconSize, number[]> = {
  Smol: [10, 10, 8, 6, 6, 4],
  Mini: [12, 12, 10, 10, 8, 6, 4],
  Smaller: [13, 13, 11, 11, 9, 7, 5],
  Small: [14, 14, 12, 12, 10, 8, 6],
  Medium: [16, 16, 14, 14, 12, 10, 8],
  Large: [18, 18, 16, 16, 14, 12, 10],
  Larger: [19, 19, 17, 17, 15, 13, 11],
  XLarge: [20, 20, 18, 18, 16, 14, 12],
};

/** The parts of a guild the icon reads. */
export interface GuildIconGuild {
  id: string;
  name: string;
  icon?: string | null;
}

export const getGuildAcronym = (name: string | null | undefined) =>
  name != null
    ? name
        .replace(/'s /g, ' ')
        .replace(/\w+/g, (word) => word[0])
        .replace(/\s/g, '')
    : '';

const CDN_ORIGIN = 'https://cdn.discordapp.com';

/** The CDN URL of a guild's icon (animated icons only when `canAnimate`), or null without one. */
export const getGuildIconURL = ({
  id,
  icon,
  size,
  canAnimate = false,
}: {
  id: string;
  icon?: string | null;
  size: number;
  canAnimate?: boolean;
}) => {
  if (icon == null) return null;
  const format = canAnimate && icon.startsWith('a_') ? 'gif' : 'webp';
  return `${CDN_ORIGIN}/icons/${id}/${icon}.${format}?size=${size}`;
};

const toBackgroundImage = (url: string | null | undefined) => (url == null || url === '' ? 'none' : `url(${url})`);

// Keeps showing the previous image until a new one has loaded, like the client's image cache.
const useCachedImage = (url: string | null) => {
  const [state, setState] = useState({ cached: url, loaded: true, seen: [url] });
  // Mirrors the client's componentDidUpdate, which switches images through state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if ((url == null && url !== state.cached) || state.seen.includes(url)) {
      if (state.cached !== url) setState((current) => ({ ...current, cached: url, loaded: true }));
      return;
    }
    if (url == null || url === state.cached || !state.loaded) return;
    let cancelled = false;
    setState((current) => ({ ...current, loaded: false }));
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setState((current) => ({ cached: url, loaded: true, seen: [...current.seen, url] }));
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, state]);
  /* eslint-enable react-hooks/set-state-in-effect */
  return state.loaded ? url : state.cached;
};

export interface GuildIconProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  guild: GuildIconGuild;
  size?: GuildIconSize;
  iconSize?: number;
  iconSrc?: string | null;
  textScale?: number;
  active?: boolean;
  animate?: boolean;
  lossless?: boolean;
  showTooltip?: boolean;
  tooltipPosition?: TooltipPosition;
  onClick?: MouseEventHandler<HTMLElement>;
  /** A link target; Discord routes these inside the client. */
  to?: string;
  showBadge?: boolean;
  badgeStrokeColor?: string;
  style?: CSSProperties;
}

/** A server's icon, or its name's acronym when it has none. */
export const GuildIcon = ({
  guild,
  className,
  active = false,
  size = GuildIconSizes.LARGE,
  iconSize,
  style = {},
  textScale = 1,
  showTooltip = false,
  tooltipPosition = 'top',
  onClick,
  to,
  showBadge: _showBadge = false,
  badgeStrokeColor: _badgeStrokeColor = tokens.unsafe_rawColors.WHITE.css,
  animate = false,
  lossless: _lossless,
  tabIndex,
  iconSrc,
  'aria-hidden': ariaHidden,
  ...props
}: GuildIconProps) => {
  const url =
    iconSrc ??
    getGuildIconURL({
      id: guild.id,
      icon: guild.icon,
      size: iconSize ?? GuildIconPixelSizes[size],
      canAnimate: animate,
    });
  const displayedUrl = useCachedImage(url ?? null);
  const acronymSizes = GuildIconAcronymSizes[size];
  const acronym = getGuildAcronym(guild.name);
  const iconStyle: CSSProperties = { ...style, backgroundImage: toBackgroundImage(displayedUrl) };
  const Tag = onClick != null ? Clickable : 'div';
  const icon = (
    <Tag
      className={clsx(styles.icon, className, styles[`iconSize${size}`], {
        [styles[`iconActive${size}`] ?? '']: active,
        [styles.iconInactive]: !active,
        [styles.noIcon]: guild.icon == null,
      })}
      aria-hidden={ariaHidden}
      style={
        guild.icon == null
          ? {
              fontSize: (acronymSizes[acronym.length] ?? acronymSizes[acronymSizes.length - 1]) * textScale,
              ...iconStyle,
            }
          : iconStyle
      }
      onClick={to != null || onClick == null ? undefined : onClick}
      tabIndex={tabIndex}
      {...props}
    >
      {guild.icon != null || iconSrc != null ? null : <div className={styles.acronym}>{acronym}</div>}
    </Tag>
  );
  const withTooltip = showTooltip ? (
    <Tooltip text={guild.name} position={tooltipPosition} aria-label={false}>
      {icon}
    </Tooltip>
  ) : (
    icon
  );
  return to != null ? (
    <a href={to} aria-hidden={ariaHidden} aria-label={guild.name} tabIndex={tabIndex}>
      {withTooltip}
    </a>
  ) : (
    withTooltip
  );
};

GuildIcon.displayName = 'GuildIcon';
GuildIcon.Sizes = GuildIconSizes;
