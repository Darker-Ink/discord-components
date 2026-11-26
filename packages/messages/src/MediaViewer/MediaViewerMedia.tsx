import {
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { animated } from '@react-spring/web';
import { LazyImage } from '../media/LazyImage/LazyImage';
import { MediaVideo } from '../media/MediaVideo/MediaVideo';
import type { MediaPlayerHandle } from '../media/MediaPlayer/MediaPlayer';
import { getAttachmentSrc, toURLSafe } from '../media/mediaUrl';
import { isPlayableVideoSize } from '../media/sizing';
import type { MediaViewerItem } from '../media/mediaViewerTypes';
import { useMediaViewerZoom } from './MediaViewerZoomContext';
import styles from './MediaViewerImage.module.css';

const DISCORD_CDN_HOST = 'cdn.discordapp.com';
const GIF_PROVIDER_HOSTS = new Set([
  'media.tenor.com',
  'media.tenor.co',
  'c.tenor.com',
  'static.klipy.com',
  'media.giphy.com',
  'i.giphy.com',
]);

/** Media served by Discord's CDN, media proxy, or an allowed GIF provider. */
export const isDiscordAssetUrl = (url: string, contentType?: string | null, originalContentType?: string | null) => {
  const parsed = toURLSafe(url);
  if (parsed == null) return false;
  if (parsed.hostname === DISCORD_CDN_HOST || /^.*\.discordapp\.net$/.test(parsed.hostname)) return true;
  if (contentType != null && originalContentType != null && contentType !== originalContentType)
    return /^.*\.media\.discordapp\.net$/.test(parsed.hostname);
  return GIF_PROVIDER_HOSTS.has(parsed.hostname);
};

/**
 * The full-size URL of proxied media: resize parameters dropped and media proxy URLs pointed at the CDN
 * (the client's `getOriginalMediaUrl`).
 */
export const getOriginalMediaUrl = (url: string, format?: string) => {
  const parsed = toURLSafe(url);
  if (parsed == null || parsed.host === DISCORD_CDN_HOST) return url;
  for (const param of ['width', 'height', 'quality', 'size']) parsed.searchParams.delete(param);
  if (parsed.origin === 'https://media.discordapp.net') parsed.host = DISCORD_CDN_HOST;
  const hadFormat = parsed.searchParams.has('format');
  parsed.searchParams.delete('format');
  if (!hadFormat && format != null) parsed.searchParams.append('format', format);
  return parsed.toString();
};

export const getVideoPosterUrl = (proxyUrl: string) => {
  const url = toURLSafe(proxyUrl);
  if (url == null) return null;
  url.searchParams.append('format', 'webp');
  return url.toString();
};

interface Rect {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  offset: { x: number; y: number };
  delta: { x: number; y: number };
}

// Pans by `delta`, but never past the point where an edge of the zoomed media would leave its side of the window.
const clampOffset = ({ width, height, viewportWidth, viewportHeight, offset, delta }: Rect) => {
  const left = (viewportWidth - width) / 2 + offset.x;
  const top = (viewportHeight - height) / 2 + offset.y;
  const right = (viewportWidth + width) / 2 + offset.x;
  const bottom = (viewportHeight + height) / 2 + offset.y;
  let { x, y } = offset;
  if (width > viewportWidth) {
    x += delta.x;
    if (left + delta.x > 0) x = (width - viewportWidth) / 2;
    if (right + delta.x < viewportWidth) x = (viewportWidth - width) / 2;
  }
  if (height > viewportHeight) {
    y += delta.y;
    if (top + delta.y > 0) y = (height - viewportHeight) / 2;
    if (bottom + delta.y < viewportHeight) y = (viewportHeight - height) / 2;
  }
  return { x, y };
};

const useElementSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});
  useLayoutEffect(() => {
    const node = ref.current;
    if (node == null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.borderBoxSize?.[0]?.inlineSize, height: entry.borderBoxSize?.[0]?.blockSize });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
};

/** Click to zoom in towards the pointer (2.5×), drag or scroll to pan, click again to zoom out. */
export const MediaViewerZoomable = memo(({ children }: { children: ReactNode }) => {
  const { scale, x, y, setOffset, zoomed, setZoomed } = useMediaViewerZoom();
  const { ref, width = 0, height = 0 } = useElementSize();
  const dragging = useRef(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const pan = (deltaX: number, deltaY: number) => {
    const next = clampOffset({
      width: width * scale.goal,
      height: height * scale.goal,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      offset: { x: x.goal, y: y.goal },
      delta: { x: deltaX, y: deltaY },
    });
    setOffset(next.x, next.y, { immediate: true });
  };

  return (
    <animated.div
      ref={ref}
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (zoomed && event.button === 0) {
          event.preventDefault();
          dragging.current = true;
          setDragStart({ x: event.clientX, y: event.clientY });
        }
      }}
      onMouseUp={(event: MouseEvent<HTMLDivElement>) => {
        if (!zoomed) {
          if (event.button === 0) {
            setZoomed(true);
            const fromCenterX = event.clientX - window.innerWidth / 2;
            const fromCenterY = event.clientY - window.innerHeight / 2;
            const next = clampOffset({
              width: width * scale.goal,
              height: height * scale.goal,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              offset: { x: 0, y: 0 },
              delta: { x: -fromCenterX * (scale.goal - 1), y: -fromCenterY * (scale.goal - 1) },
            });
            setOffset(next.x, next.y);
          }
          return;
        }
        // A click (not a drag) zooms back out.
        if ((event.clientX - dragStart.x) ** 2 + (event.clientY - dragStart.y) ** 2 < 400) setZoomed(false);
        dragging.current = false;
      }}
      onMouseMove={(event: MouseEvent<HTMLDivElement>) => {
        if (dragging.current) pan(event.movementX, event.movementY);
      }}
      onWheel={(event) => {
        if (!event.ctrlKey) pan(-event.deltaX, -event.deltaY);
      }}
      onMouseLeave={() => {
        dragging.current = false;
      }}
      onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      style={{ scale, x, y, cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
    >
      {children}
    </animated.div>
  );
});

MediaViewerZoomable.displayName = 'MediaViewerZoomable';

export interface MediaViewerPlaybackHandle {
  hasPlayback: () => boolean;
  togglePlayback: () => void;
}

export interface MediaViewerMediaProps {
  media: MediaViewerItem & {
    poster?: string;
    autoPlay?: boolean;
    autoMute?: boolean | (() => boolean);
    renderLinkComponent?: (props: Record<string, unknown>) => ReactNode;
  };
  playbackRef?: Ref<MediaViewerPlaybackHandle>;
  /** Sensitive media stays blurred and paused until revealed. */
  obscured?: boolean;
  maxWidth: number;
  maxHeight: number;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
}

/** One item of the media viewer: a zoomable image, or a video in the media player. */
export const MediaViewerMedia = memo(
  ({ media, playbackRef, obscured = false, maxWidth, maxHeight, onContextMenu }: MediaViewerMediaProps) => {
    const { width, height, url, proxyUrl, alt, type, ...rest } = media;
    const { zoomed } = useMediaViewerZoom();
    const src =
      zoomed && isDiscordAssetUrl(url, media.contentType, media.originalContentType)
        ? getOriginalMediaUrl(url)
        : getAttachmentSrc({ proxyURL: proxyUrl, url });
    const hasSize = width != null && width !== 0 && height != null && height !== 0;
    const playable =
      type === 'VIDEO' && hasSize && proxyUrl != null && !obscured && isPlayableVideoSize(width!, height!);
    const playerRef = useRef<MediaPlayerHandle>(null);

    useImperativeHandle(
      playbackRef,
      () => ({
        hasPlayback: () => playable,
        togglePlayback: () => {
          if (playable) playerRef.current?.togglePlayback();
        },
      }),
      [playable],
    );

    if (type === 'VIDEO' && hasSize && proxyUrl != null) {
      const poster = media.poster ?? getVideoPosterUrl(proxyUrl);
      if (poster == null) return null;
      return (
        <MediaVideo
          src={src}
          width={width!}
          height={height!}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          poster={poster}
          naturalWidth={width!}
          naturalHeight={height!}
          autoMute={media.autoMute}
          renderLinkComponent={media.renderLinkComponent}
          autoPlay={media.autoPlay ?? !obscured}
          alt={alt ?? undefined}
          onContextMenu={onContextMenu}
          disableArrowKeySeek
          mediaPlayerRef={playerRef}
          showPlaybackSpeedControl={media.sourceMetadata?.message != null}
          initialTimeSec={media.initialTimeSec}
          placeholder={media.placeholder}
          placeholderVersion={media.placeholderVersion}
        />
      );
    }
    if (type !== 'IMAGE') return null;
    return (
      <MediaViewerZoomable>
        {hasSize ? (
          <LazyImage
            src={src}
            original={rest.original}
            width={width!}
            height={height!}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            useFullWidth
            shouldLink={false}
            className={styles.media}
            animated={!obscured && rest.animated}
            srcIsAnimated={rest.srcIsAnimated}
            autoPlay={!obscured}
            alt={alt}
            onContextMenu={onContextMenu}
            placeholder={rest.placeholder}
            placeholderVersion={rest.placeholderVersion}
            zoomThumbnailPlaceholder={rest.zoomThumbnailPlaceholder}
            sourceMetadata={rest.sourceMetadata}
          >
            {rest.children}
          </LazyImage>
        ) : (
          <img
            src={src}
            alt={alt ?? undefined}
            onContextMenu={onContextMenu}
            className={styles.dimensionlessImage}
            style={{ maxWidth, maxHeight }}
          />
        )}
      </MediaViewerZoomable>
    );
  },
);

MediaViewerMedia.displayName = 'MediaViewerMedia';
