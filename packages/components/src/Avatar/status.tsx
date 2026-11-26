import { useMemo } from 'react';
import chroma from 'chroma-js';
import { MaskIDs } from '../Mask';
import { useManaContext } from '../ManaContext';
import { tokens } from '../tokens';
import { StatusBackdropColors, StatusBackdropOpacity, type StatusBackdropColor } from './avatarSizes';

export const StatusTypes = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DND: 'dnd',
  INVISIBLE: 'invisible',
  STREAMING: 'streaming',
  UNKNOWN: 'unknown',
} as const;

export type StatusType = (typeof StatusTypes)[keyof typeof StatusTypes];

export interface StatusOptions {
  isMobile?: boolean;
  isTyping?: boolean;
  isVR?: boolean;
}

// The client's English strings.
const STATUS_LABELS = {
  ONLINE_VR: 'Online via VR',
  ONLINE_MOBILE: 'Online via mobile',
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  IDLE: 'Idle',
  DND: 'Do Not Disturb',
  INVISIBLE: 'Invisible',
  STREAMING: 'Streaming',
};

export const humanizeStatus = (status: StatusType, { isMobile = false, isVR = false }: StatusOptions = {}) => {
  switch (status) {
    case StatusTypes.ONLINE:
      if (isVR) return STATUS_LABELS.ONLINE_VR;
      if (isMobile) return STATUS_LABELS.ONLINE_MOBILE;
      return STATUS_LABELS.ONLINE;
    case StatusTypes.OFFLINE:
      return STATUS_LABELS.OFFLINE;
    case StatusTypes.IDLE:
      return STATUS_LABELS.IDLE;
    case StatusTypes.DND:
      return STATUS_LABELS.DND;
    case StatusTypes.INVISIBLE:
      return STATUS_LABELS.INVISIBLE;
    case StatusTypes.STREAMING:
      return STATUS_LABELS.STREAMING;
    default:
      return null;
  }
};

const getStatusRawColor = (status: StatusType | null | undefined) => {
  switch (status) {
    case StatusTypes.ONLINE:
      return tokens.unsafe_rawColors.GREEN_NEW_38;
    case StatusTypes.IDLE:
      return tokens.unsafe_rawColors.YELLOW_NEW_30;
    case StatusTypes.DND:
      return tokens.unsafe_rawColors.RED_NEW_46;
    case StatusTypes.STREAMING:
      return tokens.unsafe_rawColors.PLATFORM_TWITCH;
    default:
      return tokens.unsafe_rawColors.NEUTRAL_34;
  }
};

// Applies the user's saturation setting to a color (CSS variables and currentColor pass through).
export const useSaturatedColor = (color: string | null | undefined) => {
  const { saturation } = useManaContext();
  return useMemo(() => {
    if (color == null) return null;
    if (color === 'currentColor' || color.startsWith('var(')) return color;
    const parsed = chroma(color);
    return parsed.set('hsl.s', parsed.get('hsl.s') * saturation).hex();
  }, [color, saturation]);
};

/** The fill of a status dot: `color` when given, else the status's own color. */
export const useStatusColor = (status: StatusType | null | undefined, color?: string | null) => {
  const fallback = getStatusRawColor(status).resolve({ saturation: 1 }).hex();
  return useSaturatedColor(color ?? fallback) ?? undefined;
};

export const getStatusMask = (status: StatusType, { isMobile, isTyping, isVR }: StatusOptions) => {
  if (isTyping) return MaskIDs.STATUS_TYPING;
  switch (status) {
    case StatusTypes.IDLE:
      return MaskIDs.STATUS_IDLE;
    case StatusTypes.DND:
      return MaskIDs.STATUS_DND;
    case StatusTypes.STREAMING:
      return MaskIDs.STATUS_STREAMING;
    case StatusTypes.INVISIBLE:
    case StatusTypes.UNKNOWN:
    case StatusTypes.OFFLINE:
      return MaskIDs.STATUS_OFFLINE;
    default:
      if (isVR) return MaskIDs.STATUS_ONLINE_VR;
      if (isMobile) return MaskIDs.STATUS_ONLINE_MOBILE;
      return MaskIDs.STATUS_ONLINE;
  }
};

export const getStatusSize = (size: number, status: StatusType, { isMobile, isTyping, isVR }: StatusOptions) => {
  if (isTyping) return { width: 2.5 * size, height: size };
  if (status === StatusTypes.ONLINE && isVR) return { width: 1.5 * size, height: size };
  return status === StatusTypes.ONLINE && isMobile && !isVR
    ? { width: size, height: 1.5 * size }
    : { width: size, height: size };
};

export const getStatusBackdropOpacity = (status: StatusType, backdropColor: StatusBackdropColor | string) =>
  backdropColor === StatusBackdropColors.WHITE && status === StatusTypes.IDLE
    ? StatusBackdropOpacity.HIGH
    : StatusBackdropOpacity.LOW;
