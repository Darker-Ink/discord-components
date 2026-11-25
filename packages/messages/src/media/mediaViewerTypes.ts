import type { ReactNode } from 'react';

export interface MediaSourceMetadata {
  /** The message the media belongs to (API format), if any. */
  message?: unknown;
  identifier?:
    | { type: 'attachment'; attachmentId: string; filename?: string; title?: string; size?: number }
    | { type: 'embed'; embedIndex?: number }
    | { type: string; [key: string]: unknown };
}

/** One piece of media the viewer can show, as the client builds it from attachments, embeds and components. */
export interface MediaViewerItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  /** Media proxy URL; the viewer loads this when present. */
  proxyUrl?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  contentType?: string | null;
  originalContentType?: string | null;
  placeholder?: string | null;
  placeholderVersion?: number | null;
  flags?: number;
  /** The original (non-proxied) URL, used for "Open in Browser" and downloads. */
  original?: string;
  animated?: boolean;
  srcIsAnimated?: boolean;
  /** Already-loaded thumbnail shown while the full image loads. */
  zoomThumbnailPlaceholder?: string;
  trigger?: string;
  initialTimeSec?: number;
  sourceMetadata?: MediaSourceMetadata;
  children?: (props: { src: string; size: { width: number; height: number }; alt?: string | null }) => ReactNode;
}

export interface MediaViewerOpenOptions {
  items: MediaViewerItem[];
  startingIndex?: number;
  shouldHideMediaOptions?: boolean;
  location?: string;
  onClose?: () => void;
}
