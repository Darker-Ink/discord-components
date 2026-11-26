import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { tokens, useToken } from '../tokens';
import styles from './BlobMask.module.css';

const CIRCLE_PATHS: Record<number, string> = {
  48: 'M48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24Z',
  44: 'M44 22C44 34.1502 34.1502 44 22 44C9.84978 44 0 34.1502 0 22C0 9.84978 9.84978 0 22 0C34.1502 0 44 9.84978 44 22Z',
  40: 'M0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40C8.95431 40 0 31.0457 0 20Z',
};

const SQUIRCLE_PATHS: Record<number, string> = {
  52: 'M0 25.6C0 16.6392 0 12.1587 1.7439 8.73615C3.27787 5.72556 5.72556 3.27787 8.73615 1.7439C12.1587 0 16.6392 0 25.6 0H26.4C35.3608 0 39.8413 0 43.2638 1.7439C46.2744 3.27787 48.7221 5.72556 50.2561 8.73615C52 12.1587 52 16.6392 52 25.6V26.4C52 35.3608 52 39.8413 50.2561 43.2638C48.7221 46.2744 46.2744 48.7221 43.2638 50.2561C39.8413 52 35.3608 52 26.4 52H25.6C16.6392 52 12.1587 52 8.73615 50.2561C5.72556 48.7221 3.27787 46.2744 1.7439 43.2638C0 39.8413 0 35.3608 0 26.4V25.6Z',
  48: 'M0 24C0 16.5449 0 12.8174 1.21793 9.87706C2.84183 5.95662 5.95662 2.84183 9.87706 1.21793C12.8174 0 16.5449 0 24 0C31.4551 0 35.1826 0 38.1229 1.21793C42.0434 2.84183 45.1582 5.95662 46.7821 9.87706C48 12.8174 48 16.5449 48 24C48 31.4551 48 35.1826 46.7821 38.1229C45.1582 42.0434 42.0434 45.1582 38.1229 46.7821C35.1826 48 31.4551 48 24 48C16.5449 48 12.8174 48 9.87706 46.7821C5.95662 45.1582 2.84183 42.0434 1.21793 38.1229C0 35.1826 0 31.4551 0 24Z',
  44: 'M0 19.2C0 12.4794 0 9.11906 1.30792 6.55211C2.4584 4.29417 4.29417 2.4584 6.55211 1.30792C9.11906 0 12.4794 0 19.2 0H24.8C31.5206 0 34.8809 0 37.4479 1.30792C39.7058 2.4584 41.5416 4.29417 42.6921 6.55211C44 9.11906 44 12.4794 44 19.2V24.8C44 31.5206 44 34.8809 42.6921 37.4479C41.5416 39.7058 39.7058 41.5416 37.4479 42.6921C34.8809 44 31.5206 44 24.8 44H19.2C12.4794 44 9.11906 44 6.55211 42.6921C4.29417 41.5416 2.4584 39.7058 1.30792 37.4479C0 34.8809 0 31.5206 0 24.8V19.2Z',
  40: 'M0 17.4545C0 11.3449 0 8.29005 1.18902 5.95647C2.23491 3.90379 3.90379 2.23491 5.95647 1.18902C8.29005 0 11.3449 0 17.4545 0H22.5455C28.6551 0 31.71 0 34.0435 1.18902C36.0962 2.23491 37.7651 3.90379 38.811 5.95647C40 8.29005 40 11.3449 40 17.4545V22.5455C40 28.6551 40 31.71 38.811 34.0435C37.7651 36.0962 36.0962 37.7651 34.0435 38.811C31.71 40 28.6551 40 22.5455 40H17.4545C11.3449 40 8.29005 40 5.95647 38.811C3.90379 37.7651 2.23491 36.0962 1.18902 34.0435C0 31.71 0 28.6551 0 22.5455V17.4545Z',
};

const getMaskPath = (size: number, rounded: boolean) => {
  const path = (rounded ? CIRCLE_PATHS : SQUIRCLE_PATHS)[size];
  if (path == null) throw new Error(`Unsupported BlobMask ${rounded ? 'circle' : 'squicle'} size: ${size}`);
  return path;
};

export interface BlobMaskBadgeSize {
  width?: number;
  height?: number;
}

export interface BlobMaskProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  innerClassName?: string;
  isFolder?: boolean;
  selected?: boolean;
  lowerBadgeSize?: BlobMaskBadgeSize;
  highlight?: boolean;
  upperBadge?: ReactNode;
  lowerBadge?: ReactNode;
  rounded?: boolean;
  'aria-hidden'?: boolean;
  /** When false, the content is masked by a plain square instead of the squircle/circle. */
  maskShape?: boolean;
}

interface BlobMaskInnerProps extends BlobMaskProps {
  viewBoxSize: number;
  badgeMaskStroke: number;
  badgeMaskSize: number;
}

const BlobMaskInner = ({
  children,
  viewBoxSize,
  className,
  style,
  innerClassName,
  isFolder,
  lowerBadgeSize,
  highlight,
  badgeMaskStroke,
  badgeMaskSize,
  upperBadge,
  lowerBadge,
  rounded = false,
  'aria-hidden': ariaHidden,
  maskShape = true,
}: BlobMaskInnerProps) => {
  const [focused, setFocused] = useState(false);
  const hasUpperBadge = upperBadge != null;
  const hasLowerBadge = lowerBadge != null;
  const id = useId();
  const upperBadgeMaskId = `${id}-upper_badge_masks`;
  const lowerBadgeMaskId = `${id}-lower_badge_masks`;
  const blobMaskId = `${id}-blob_mask`;
  const strokeMaskId = `${id}-stroke_mask`;
  const highlightMaskId = `${id}-highlight_mask`;
  const lowerBadgeWidth = lowerBadgeSize?.width != null ? lowerBadgeSize.width : 16;
  const lowerBadgeHeight = lowerBadgeSize?.height != null ? lowerBadgeSize.height : 16;
  const box = {
    width: isFolder ? viewBoxSize : viewBoxSize + 8,
    height: isFolder ? viewBoxSize : viewBoxSize + 8,
    x: isFolder ? 0 : -4,
    y: isFolder ? 0 : -4,
  };
  const upperBadgeSize = isFolder ? 20 : badgeMaskSize;
  const path = getMaskPath(viewBoxSize, rounded);
  const brandColor = tokens.unsafe_rawColors.BRAND_500.css;

  return (
    <div
      key={`${hasLowerBadge}-${hasUpperBadge}`}
      className={clsx(className, styles.wrapper)}
      style={style}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-hidden={ariaHidden}
    >
      <svg
        key="svg"
        width={box.width}
        height={box.height}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        className={clsx(styles.svg, { [styles.noContain]: highlight, [styles.shiftSVG]: !isFolder })}
        overflow="visible"
        role="none"
      >
        <defs>
          {highlight && <path d={path} id={highlightMaskId} />}
          <path d={path} id={blobMaskId} />
          {upperBadge != null ? (
            <rect
              id={upperBadgeMaskId}
              x={viewBoxSize - upperBadgeSize + badgeMaskStroke}
              y={-badgeMaskStroke}
              width={upperBadgeSize}
              height={upperBadgeSize}
              rx={upperBadgeSize / 2}
              ry={upperBadgeSize / 2}
            />
          ) : null}
          {lowerBadge != null ? (
            <rect
              id={lowerBadgeMaskId}
              x={viewBoxSize - (lowerBadgeWidth + 2 * badgeMaskStroke) + badgeMaskStroke}
              y={viewBoxSize - (lowerBadgeHeight + 2 * badgeMaskStroke) + badgeMaskStroke}
              width={lowerBadgeWidth + 2 * badgeMaskStroke}
              height={lowerBadgeHeight + 2 * badgeMaskStroke}
              rx={badgeMaskSize / 2}
              ry={badgeMaskSize / 2}
            />
          ) : null}
        </defs>
        <mask id={id} fill="black" x={0} y={0} width={viewBoxSize} height={viewBoxSize}>
          {highlight && <use href={`#${highlightMaskId}`} fill="black" />}
          {maskShape ? (
            <use href={`#${blobMaskId}`} fill="white" className={clsx({ [styles.isHighlighted]: highlight })} />
          ) : (
            <rect width={viewBoxSize} height={viewBoxSize} fill="white" />
          )}
          {hasUpperBadge ? <use href={`#${upperBadgeMaskId}`} fill="black" /> : null}
          {hasLowerBadge ? <use href={`#${lowerBadgeMaskId}`} fill="black" /> : null}
        </mask>
        {hasUpperBadge || hasLowerBadge ? (
          <mask id={strokeMaskId}>
            <rect width="150%" height="150%" x="-25%" y="-25%" fill="white" />
            {hasUpperBadge ? <use href={`#${upperBadgeMaskId}`} fill="black" /> : null}
            {hasLowerBadge ? <use href={`#${lowerBadgeMaskId}`} fill="black" /> : null}
          </mask>
        ) : null}
        {focused ? (
          <>
            <g className={styles.focusStroke} mask={`url(#${strokeMaskId})`}>
              <use href={`#${blobMaskId}`} />
            </g>
            <g className={styles.focusFill}>
              {upperBadge != null ? <use href={`#${upperBadgeMaskId}`} /> : null}
              {lowerBadge != null ? <use href={`#${lowerBadgeMaskId}`} /> : null}
            </g>
          </>
        ) : null}
        {highlight && (
          <path
            d={path}
            stroke={brandColor}
            strokeWidth={2}
            className={styles.highlight}
            mask={`url(#${strokeMaskId})`}
          />
        )}
        <foreignObject
          key="foreign-object"
          mask={`url(#${id})`}
          x={0}
          y={0}
          className={innerClassName}
          width={viewBoxSize}
          height={viewBoxSize}
        >
          {children}
        </foreignObject>
      </svg>
      {lowerBadge != null ? <div className={styles.lowerBadge}>{lowerBadge}</div> : null}
      {upperBadge != null ? <div className={styles.upperBadge}>{upperBadge}</div> : null}
    </div>
  );
};

BlobMaskInner.displayName = 'BlobMaskInner';

// The squircle (or circle) mask guild-bar items are drawn in, with cut-outs for the badges in its
// corners and a focus outline drawn around the shape.
export const BlobMask = ({
  lowerBadgeSize = { width: 16, height: 16 },
  highlight = false,
  rounded = false,
  ...props
}: BlobMaskProps) => {
  const avatarSize = useToken(tokens.modules.guildbar.AVATAR_SIZE) as number;
  const folderSize = useToken(tokens.modules.guildbar.FOLDER_SIZE) as number;
  const size = props.isFolder === true ? folderSize : avatarSize;
  return (
    <BlobMaskInner
      {...props}
      rounded={rounded}
      viewBoxSize={size}
      style={{ width: size, height: size }}
      badgeMaskSize={size / 2}
      badgeMaskStroke={2}
      lowerBadgeSize={lowerBadgeSize}
      highlight={highlight}
    />
  );
};

BlobMask.displayName = 'BlobMask';
