import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type { EmbedMessage } from './types';

/** Identifies the message and embed a piece of media belongs to (used by the media viewer). */
export interface EmbedSourceMetadata {
  message?: EmbedMessage;
  identifier: { type: 'embed'; embedIndex: number };
}

export interface LinkComponentProps {
  href: string;
  className?: string;
  tabIndex?: number;
  children?: ReactNode;
  target?: string;
  rel?: string;
  title?: string;
  messageId?: string;
  channelId?: string;
}

export type RenderLinkComponent = (props: LinkComponentProps) => ReactNode;

/** What an embed asks its image renderer for (thumbnails, images, video posters, gifv posters). */
export interface EmbedImageComponentProps {
  src: string;
  original?: string;
  alt?: string;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  responsive?: boolean;
  limitResponsiveWidth?: boolean;
  containerClassName?: string;
  imageClassName?: string;
  shouldLink?: boolean;
  autoPlay?: boolean;
  animated?: boolean;
  freeze?: boolean;
  srcIsAnimated?: boolean;
  placeholder?: string;
  placeholderVersion?: number;
  disableAltTextDisplay?: boolean;
  hiddenSpoilers?: boolean;
  mosaicStyleAlt?: boolean;
  tabIndex?: number;
  dataSafeSrc?: string;
  renderAccessory?: (() => ReactNode) | null;
  onClick?: MouseEventHandler<HTMLElement> | null;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  children?: (state: {
    src: string;
    size: { width: number; height: number };
    animating: boolean;
    alt?: string;
  }) => ReactNode;
  sourceMetadata?: EmbedSourceMetadata;
  analyticsSource?: string;
  style?: CSSProperties;
}

export type RenderImageComponent = (props: EmbedImageComponentProps) => ReactNode;

/** What an embed asks its video renderer for (videos the client can play itself). */
export interface EmbedVideoComponentProps {
  poster: string;
  src: string;
  placeholder?: string;
  placeholderVersion?: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  responsive?: boolean;
  autoPlay?: boolean;
  playable?: boolean;
  autoMute?: boolean | (() => boolean);
  volume?: number | (() => number);
  onEnded?: () => void;
  onPlay?: (...args: unknown[]) => void;
  onPause?: (...args: unknown[]) => void;
  onMute?: (muted: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onControlsHide?: () => void;
  onControlsShow?: () => void;
  disableClickToUnmute?: boolean;
  sourceMetadata?: EmbedSourceMetadata;
}

export type RenderVideoComponent = (props: EmbedVideoComponentProps) => ReactNode;
