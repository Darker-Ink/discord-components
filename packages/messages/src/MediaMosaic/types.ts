import type { MouseEvent, ReactNode } from 'react';
import type { MediaLayoutType, ObscureReason } from '../media/constants';

/** How the mosaic renders an item. Visual types take part in the grid; the rest are listed under it. */
export type MediaMosaicItemType =
  'IMAGE' | 'VIDEO' | 'CLIP' | 'AUDIO' | 'PLAINTEXT_PREVIEW' | 'OTHER' | 'INVALID' | 'VISUAL_PLACEHOLDER';

export const isVisualMediaType = (type: MediaMosaicItemType) =>
  type === 'IMAGE' || type === 'VIDEO' || type === 'CLIP' || type === 'VISUAL_PLACEHOLDER';

/** One entry of the mosaic, wrapping the source object (an attachment, a gallery item, …). */
export interface MediaMosaicItemData<T = unknown> {
  uniqueId: string;
  originalItem: T;
  type: MediaMosaicItemType;
  downloadUrl: string;
  width?: number | null;
  height?: number | null;
  spoiler: boolean;
  contentType?: string | null;
  srcIsAnimated: boolean;
}

/** What every `render*Component` of a mosaic item receives. */
export interface MediaMosaicRenderProps<T = unknown, M = unknown> {
  item: MediaMosaicItemData<T>;
  message: M;
  width?: number | null;
  height?: number | null;
  className?: string;
  onClick?: (event: MouseEvent<HTMLElement>, overrides?: Record<string, unknown>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  renderAdjacentContent?: () => ReactNode;
  hiddenSpoilers?: boolean;
  mediaLayoutType?: MediaLayoutType;
  maxWidth?: number;
  maxHeight?: number;
  useFullWidth?: boolean;
  [key: string]: unknown;
}

export interface MediaMosaicImageRenderProps<T = unknown, M = unknown> extends MediaMosaicRenderProps<T, M> {
  autoPlay?: boolean;
  shouldHideMediaOptions?: boolean;
  renderAccessory?: () => ReactNode;
  containerClassName?: string;
  imageClassName?: string;
  shouldLink?: boolean;
  responsive?: boolean;
  handlePreloadImage?: () => void;
  onMouseEnter?: () => void;
}

export interface MediaMosaicVideoRenderProps<T = unknown, M = unknown> extends MediaMosaicRenderProps<T, M> {
  onSeekRequest?: (timeMs: number) => void;
  onOpenInMediaViewer?: (timeMs: number) => void;
  naturalWidth?: number | null;
  naturalHeight?: number | null;
  playable?: boolean;
  responsive?: boolean;
  mimeType?: string[];
  onControlsShow?: () => void;
  onControlsHide?: () => void;
  downloadable?: boolean;
  isSingleMosaicItem?: boolean;
  allowFullScreen?: boolean;
  onPlay?: (autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
}

export interface MediaMosaicAudioRenderProps<T = unknown, M = unknown> extends MediaMosaicRenderProps<T, M> {
  playable?: boolean;
  mimeType?: string[];
  onVolumeShow?: () => void;
  onVolumeHide?: () => void;
  onPlay?: (autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
}

export type MediaMosaicRenderer<P> = (props: P) => ReactNode;

/** Everything one mosaic item needs: the item, how to render each type, and its actions. */
export interface MediaMosaicItemProps<T = unknown, M = unknown> {
  item: MediaMosaicItemData<T>;
  message: M;
  className?: string;
  autoPlayGif?: boolean;
  canRemoveItem?: boolean;
  onRemoveItem?: (item: MediaMosaicItemData<T>) => void;
  canEditItem?: boolean;
  onEditItem?: (item: MediaMosaicItemData<T>) => void;
  /** Why the item is hidden (spoiler, sensitive media), or null. */
  getObscureReason: (item: MediaMosaicItemData<T>, message: M) => ObscureReason | null;
  onClick?: (event: MouseEvent<HTMLElement>, overrides?: Record<string, unknown>) => void;
  onSeekRequest?: (timeMs: number) => void;
  onOpenInMediaViewer?: (timeMs: number) => void;
  handlePreloadImage?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  onPlay?: (autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
  renderImageComponent: MediaMosaicRenderer<MediaMosaicImageRenderProps<T, M>>;
  renderVideoComponent: MediaMosaicRenderer<MediaMosaicVideoRenderProps<T, M>>;
  renderAudioComponent: MediaMosaicRenderer<MediaMosaicAudioRenderProps<T, M>>;
  renderPlaintextFilePreview: MediaMosaicRenderer<MediaMosaicRenderProps<T, M>>;
  renderGenericFileComponent: MediaMosaicRenderer<MediaMosaicRenderProps<T, M>>;
  renderVisualPlaceholderComponent?: MediaMosaicRenderer<MediaMosaicRenderProps<T, M>>;
  /** Renders the GIF favorite star over images (needs the client's favorites; none by default). */
  gifFavoriteButton?: () => ReactNode;
  allowFullScreen?: boolean;
  /** Hides download buttons (forum channels can turn media downloads off). */
  shouldHideMediaOptions?: boolean;
}
