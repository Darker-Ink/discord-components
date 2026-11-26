import {
  useContext,
  useMemo,
  type CSSProperties,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { Clickable } from '../Clickable';
import { LoadingDots } from '../LoadingDots';
import { MaskIDs, useRegisterMask } from '../Mask';
import { useRootElementContext } from '../RootElementContext';
import { Tooltip } from '../Tooltip';
import {
  getAvatarSize,
  getAvatarSpecs,
  SpeakingStates,
  type AvatarSize,
  type AvatarSpecs,
  type SpeakingState,
  type StatusBackdropColor,
} from './avatarSizes';
import {
  getStatusBackdropOpacity,
  getStatusMask,
  getStatusSize,
  humanizeStatus,
  StatusTypes,
  useStatusColor,
  type StatusOptions,
  type StatusType,
} from './status';
import styles from './Avatar.module.css';

// Sizes with a mask for each status shape; other sizes can't show a status.
const STATUS_MASK_SIZES = [16, 20, 24, 32, 40, 44, 48, 56, 72, 80, 96, 120];

type MaskKey = keyof typeof MaskIDs;

const getSizedMask = (prefix: string, size: AvatarSize) => {
  const pixels = getAvatarSpecs(size).size;
  if (!STATUS_MASK_SIZES.includes(pixels) || size.startsWith('DEPRECATED')) return null;
  return MaskIDs[`${prefix}_${pixels}` as MaskKey];
};

const getAvatarMask = (
  status: StatusType | null,
  size: AvatarSize,
  isMobile: boolean,
  isTyping: boolean,
  isVR = false,
): string => {
  if (status == null) return MaskIDs.AVATAR_DEFAULT;
  const mask =
    (isTyping ? getSizedMask('AVATAR_STATUS_TYPING', size) : null) ??
    (status === StatusTypes.ONLINE && isVR ? getSizedMask('AVATAR_STATUS_VR', size) : null) ??
    (status === StatusTypes.ONLINE && isMobile && !isVR ? getSizedMask('AVATAR_STATUS_MOBILE', size) : null) ??
    getSizedMask('AVATAR_STATUS_ROUND', size);
  if (mask == null) {
    throw Error(
      `getMaskId(): Unsupported type, size: ${size}, status: ${status}, isMobile: ${isMobile ? 'true' : 'false'}`,
    );
  }
  return mask;
};

const getAvatarDecorationMask = (
  status: StatusType | null | undefined,
  size: AvatarSize,
  isMobile: boolean,
  isTyping: boolean,
  isVR = false,
) => {
  if (status == null) return null;
  return (
    (isTyping ? getSizedMask('AVATAR_DECORATION_STATUS_TYPING', size) : null) ??
    (status === StatusTypes.ONLINE && isVR ? getSizedMask('AVATAR_DECORATION_STATUS_VR', size) : null) ??
    (isMobile && !isVR ? getSizedMask('AVATAR_DECORATION_STATUS_MOBILE', size) : null) ??
    getSizedMask('AVATAR_DECORATION_STATUS_ROUND', size)
  );
};

// The client's English string.
const formatAvatarLabel = (label: string, status: StatusType, isMobile = false, isVR = false) =>
  `${label}, ${humanizeStatus(status, { isMobile, isVR })}`;

export const getStatusRect = (specs: AvatarSpecs, status: StatusType, options: StatusOptions) => {
  const rect = getStatusSize(specs.status, status, options);
  const x =
    (options.isTyping ? specs.size - (rect.width / 2 + specs.status / 2) : specs.size - rect.width) - specs.offset;
  return { ...rect, x, y: specs.size - rect.height - specs.offset };
};

const renderStatusBackdrop = (
  color: StatusBackdropColor | string,
  specs: AvatarSpecs,
  status: StatusType,
  options: StatusOptions,
) => {
  const rect = getStatusRect(specs, status, options);
  const opacity = getStatusBackdropOpacity(status, color);
  const isOnlineVR = status === StatusTypes.ONLINE && options.isVR;
  if (!(options.isMobile || isOnlineVR)) {
    const radius = rect.height / 2 + specs.stroke;
    const center = rect.x + specs.status / 2;
    return <circle style={{ opacity }} fill={color} r={radius} cx={center} cy={center} />;
  }
  const height = rect.height + 2 * specs.stroke;
  return (
    <rect
      fill={color}
      height={height}
      width={rect.width + 2 * specs.stroke}
      style={{ opacity }}
      x={rect.x - specs.stroke}
      y={rect.y - specs.stroke}
      rx={isOnlineVR ? height / 2 : specs.stroke}
    />
  );
};

export const SpeakingSpreadDirections = {
  BOTH: 'BOTH',
  INSET_ONLY: 'INSET_ONLY',
  OUTSET_ONLY: 'OUTSET_ONLY',
} as const;

export type SpeakingSpreadDirection = (typeof SpeakingSpreadDirections)[keyof typeof SpeakingSpreadDirections];

export interface SpeakingStylesConfig {
  spreadDirection?: SpeakingSpreadDirection;
  maxOuterSpreadRadius?: number;
  maxInnerSpreadRadius?: number;
  hideIfVolumeMissing?: boolean;
}

const spreadForVolume = (voiceDb: number, maxRadius: number) =>
  0.5 + (maxRadius - 0.5) / (1 + Math.exp(-0.03 * (voiceDb + 45)));

/** The ring around a speaking user's avatar, sized by their voice volume while the app has focus. */
export const useSpeakingStyles = ({
  voiceStatus,
  voiceDb,
  spreadDirection = SpeakingSpreadDirections.BOTH,
  maxOuterSpreadRadius = 3,
  maxInnerSpreadRadius = 1,
  hideIfVolumeMissing = false,
}: SpeakingStylesConfig & { voiceStatus?: SpeakingState | null; voiceDb: number }) => {
  const { reducedMotion, forcedColors } = useContext(AccessibilityPreferencesContext);
  const { focused: isAppFocused } = useRootElementContext();
  return useMemo(() => {
    const style: CSSProperties = {};
    if (voiceDb === -Infinity && hideIfVolumeMissing) return style;
    if (voiceStatus != null) {
      let outer = 0;
      let inner = 2;
      let border = 3;
      if (voiceDb !== -Infinity && !reducedMotion.enabled && isAppFocused) {
        outer = spreadDirection === 'INSET_ONLY' ? 0 : spreadForVolume(voiceDb, maxOuterSpreadRadius);
        inner = spreadDirection === 'OUTSET_ONLY' ? 0 : spreadForVolume(voiceDb, maxInnerSpreadRadius);
        border = spreadDirection === 'OUTSET_ONLY' ? 0 : inner + 1;
      }
      let color = 'var(--status-speaking)';
      if (forcedColors.enabled) color = 'Highlight';
      else if (voiceStatus === SpeakingStates.PLAYING_SOUNDBOARD) color = 'var(--brand-500)';
      style.boxShadow = `0 0 0 ${outer}px ${color}, inset 0 0 0 ${inner}px ${color}, inset 0 0 0 ${border}px var(--background-base-lower)`;
    }
    if (isAppFocused) style.transition = 'box-shadow 50ms ease-out';
    return style;
  }, [
    voiceStatus,
    isAppFocused,
    reducedMotion.enabled,
    forcedColors.enabled,
    voiceDb,
    spreadDirection,
    maxOuterSpreadRadius,
    maxInnerSpreadRadius,
    hideIfVolumeMissing,
  ]);
};

export interface AvatarImgProps {
  src?: string | null;
  voiceStatus?: SpeakingState | null;
  voiceDb?: number;
  speakingStylesConfig?: SpeakingStylesConfig;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export const AvatarImg = ({
  src,
  voiceStatus,
  className,
  voiceDb = -Infinity,
  speakingStylesConfig,
  ref,
}: AvatarImgProps) => {
  const speakingStyles = useSpeakingStyles({
    voiceStatus,
    voiceDb,
    spreadDirection: SpeakingSpreadDirections.INSET_ONLY,
    maxInnerSpreadRadius: 4,
    ...speakingStylesConfig,
  });
  return (
    <div key={src ?? undefined} ref={ref} className={clsx(styles.avatarStack, className)}>
      <img src={src ?? undefined} alt=" " className={styles.avatar} aria-hidden />
      {voiceStatus != null && <div className={styles.avatarBorder} style={speakingStyles} />}
    </div>
  );
};

AvatarImg.displayName = 'AvatarImg';

interface AvatarInteractionProps {
  onClick?: MouseEventHandler<HTMLElement>;
  onMouseDown?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement> | null;
  onMouseLeave?: MouseEventHandler<HTMLElement> | null;
  className?: string;
  tabIndex?: number;
  avatarDecoration?: string | null;
}

interface AvatarWrapperProps extends AvatarInteractionProps {
  children: ReactNode;
  size: AvatarSize;
  ariaLabel?: string;
  ariaHidden?: boolean;
  status?: StatusType | null;
  isMobile?: boolean;
  isVR?: boolean;
  isTyping?: boolean;
  typingOffset: number;
  specs: AvatarSpecs;
}

// The sized box around an avatar: clickable when it has a click handler, an image otherwise, with the
// optional avatar decoration on top.
const AvatarWrapper = ({
  children,
  size,
  onClick,
  onMouseDown,
  onKeyDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  className,
  tabIndex,
  ariaLabel,
  ariaHidden,
  status,
  isMobile = false,
  isVR = false,
  isTyping = false,
  avatarDecoration,
  typingOffset,
  specs,
}: AvatarWrapperProps) => {
  const style = { width: getAvatarSize(size), height: getAvatarSize(size) };
  const label =
    ariaLabel == null || ariaHidden
      ? undefined
      : status != null
        ? formatAvatarLabel(ariaLabel, status, isMobile, isVR)
        : ariaLabel;
  const decorationSize = 1.2 * specs.size;
  const decorationMask = getAvatarDecorationMask(status, size, isMobile, isTyping, isVR);
  useRegisterMask(avatarDecoration != null ? decorationMask : null);
  const decoration = avatarDecoration != null && (
    <svg
      width={decorationSize + typingOffset}
      height={decorationSize}
      viewBox={`0 0 ${decorationSize + typingOffset} ${decorationSize}`}
      className={styles.avatarDecorationContainer}
      aria-hidden
    >
      <foreignObject
        x={0}
        y={0}
        width={decorationSize}
        height={decorationSize}
        mask={decorationMask != null ? `url(#${decorationMask})` : undefined}
      >
        <img className={styles.avatarDecoration} src={avatarDecoration} alt=" " aria-hidden />
      </foreignObject>
    </svg>
  );
  if (onClick != null || onMouseDown != null) {
    return (
      <Clickable
        className={clsx(styles.wrapper, styles.pointer, className)}
        style={style}
        onClick={onClick}
        tabIndex={tabIndex}
        onContextMenu={onContextMenu}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter ?? undefined}
        onMouseLeave={onMouseLeave ?? undefined}
        aria-label={label}
        aria-hidden={ariaHidden}
      >
        {children}
        {decoration}
      </Clickable>
    );
  }
  return (
    <div
      className={clsx(styles.wrapper, className)}
      style={style}
      onContextMenu={onContextMenu ?? undefined}
      onMouseEnter={onMouseEnter ?? undefined}
      onMouseLeave={onMouseLeave ?? undefined}
      role="img"
      aria-label={label}
      aria-hidden={ariaHidden}
    >
      {children}
      {decoration}
    </div>
  );
};

AvatarWrapper.displayName = 'AvatarWrapper';

export interface AvatarProps extends AvatarInteractionProps {
  src?: string | null;
  status?: StatusType | null;
  size: AvatarSize;
  statusColor?: string | null;
  isMobile?: boolean;
  isVR?: boolean;
  isTyping?: boolean;
  typingIndicatorRef?: Ref<SVGSVGElement>;
  avatarContentRef?: Ref<HTMLDivElement>;
  voiceStatus?: SpeakingState | null;
  voiceDb?: number;
  speakingStylesConfig?: SpeakingStylesConfig;
  statusTooltip?: boolean;
  statusTooltipDelay?: number;
  statusBackdropColor?: StatusBackdropColor | string | null;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
  imageClassName?: string;
  ref?: Ref<SVGSVGElement>;
}

/** A user's round avatar with an optional status dot (or typing indicator) cut out of its corner. */
export const Avatar = (props: AvatarProps) => {
  const {
    src,
    status: statusProp,
    size,
    statusColor,
    isMobile = false,
    isVR = false,
    isTyping = false,
    typingIndicatorRef,
    avatarContentRef,
    voiceStatus,
    voiceDb,
    speakingStylesConfig,
    statusTooltip = false,
    statusTooltipDelay,
    statusBackdropColor,
    'aria-hidden': ariaHidden = false,
    'aria-label': ariaLabel,
    imageClassName,
    ref,
    ...wrapperProps
  } = props;
  const status = statusProp !== StatusTypes.UNKNOWN ? (statusProp ?? null) : null;
  const specs = getAvatarSpecs(size);
  const typingOffset = status != null ? Math.ceil((2.5 * specs.status - specs.status) / 2) : 0;
  const svgSize = specs.size + typingOffset;
  const fill = useStatusColor(status, statusColor);
  const options = { isMobile, isTyping, isVR };
  const avatarMask = getAvatarMask(status, size, isMobile, isTyping, isVR);
  const statusMask = status != null ? getStatusMask(status, options) : null;
  useRegisterMask(avatarMask);
  useRegisterMask(statusMask);
  return (
    <AvatarWrapper
      {...wrapperProps}
      size={size}
      ariaLabel={ariaLabel}
      ariaHidden={ariaHidden}
      status={status}
      specs={specs}
      typingOffset={typingOffset}
    >
      <svg
        ref={ref}
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className={clsx(styles.mask, styles.svg)}
        aria-hidden
      >
        <foreignObject x={0} y={0} width={specs.size} height={specs.size} mask={`url(#${avatarMask})`}>
          <AvatarImg
            ref={avatarContentRef}
            src={src}
            voiceStatus={voiceStatus}
            voiceDb={voiceDb}
            speakingStylesConfig={speakingStylesConfig}
            className={imageClassName}
          />
        </foreignObject>
        {status != null && statusBackdropColor != null
          ? renderStatusBackdrop(statusBackdropColor, specs, status, options)
          : null}
        {status != null ? (
          <Tooltip
            text={statusTooltip ? humanizeStatus(status) : null}
            ariaHidden
            position="top"
            spacing={5 + 1.5 * specs.stroke}
            delay={statusTooltipDelay}
          >
            <g>
              <rect
                {...getStatusRect(specs, status, options)}
                fill={fill}
                mask={`url(#${statusMask})`}
                className={styles.pointerEvents}
              />
              {isTyping ? (
                <LoadingDots
                  ref={typingIndicatorRef}
                  dotRadius={specs.status / 4}
                  x={specs.size - 1.375 * specs.status - specs.offset}
                  y={specs.size - specs.status / 1.333 - specs.offset}
                />
              ) : null}
            </g>
          </Tooltip>
        ) : null}
      </svg>
    </AvatarWrapper>
  );
};

Avatar.displayName = 'Avatar';
