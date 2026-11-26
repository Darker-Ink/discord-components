import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { useMediaContext } from '../MediaContext';
import { useWindowFocused } from '@discord-mana/components';
import { preloadZoomedImage } from '../preload';
import type { MediaSourceMetadata, MediaViewerItem } from '../mediaViewerTypes';
import { LazyImage, type LazyImageProps, type LazyImageZoomInfo } from './LazyImage';

export interface LazyImageZoomableProps extends Omit<LazyImageProps, 'onZoom' | 'children'> {
  shouldHideMediaOptions?: boolean;
  sourceMetadata?: MediaSourceMetadata;
  /** Where the viewer was opened from (Discord's analytics location). */
  analyticsSource?: string;
  contentType?: string | null;
  originalContentType?: string | null;
  /** Prefetches the zoomed image on hover; defaults to preloading the media viewer's size. */
  handlePreloadImage?: () => void;
  children?: MediaViewerItem['children'];
}

/** A LazyImage that opens the media viewer when clicked. */
export const LazyImageZoomable = ({
  shouldLink = true,
  autoPlay = false,
  animated = false,
  shouldHideMediaOptions = false,
  analyticsSource,
  contentType,
  originalContentType,
  handlePreloadImage,
  onMouseEnter,
  children,
  ...props
}: LazyImageZoomableProps) => {
  const { openMediaViewer, isWindowFocused: focusOverride } = useMediaContext();
  const windowFocused = useWindowFocused();
  const isWindowFocused = focusOverride ?? windowFocused;
  const { src, width, height, alt, original, srcIsAnimated, sourceMetadata } = props;

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(event);
      if (handlePreloadImage != null) handlePreloadImage();
      else preloadZoomedImage({ src, width, height, options: { srcIsAnimated, original, animated } });
    },
    [onMouseEnter, handlePreloadImage, src, width, height, srcIsAnimated, original, animated],
  );

  const handleZoom = useCallback(
    (event: MouseEvent<HTMLElement>, { zoomThumbnailPlaceholder, trigger }: LazyImageZoomInfo) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
      openMediaViewer?.({
        items: [
          {
            url: src,
            width,
            height,
            type: 'IMAGE',
            alt,
            contentType,
            originalContentType,
            zoomThumbnailPlaceholder,
            animated,
            srcIsAnimated,
            children,
            trigger,
            sourceMetadata,
            original: original ?? src,
          },
        ],
        shouldHideMediaOptions,
        location: analyticsSource ?? 'LazyImageZoomable',
      });
    },
    [
      openMediaViewer,
      src,
      width,
      height,
      alt,
      contentType,
      originalContentType,
      animated,
      srcIsAnimated,
      children,
      sourceMetadata,
      original,
      shouldHideMediaOptions,
      analyticsSource,
    ],
  );

  return (
    <LazyImage
      {...props}
      shouldLink={shouldLink}
      autoPlay={autoPlay}
      animated={animated}
      onZoom={handleZoom}
      onMouseEnter={handleMouseEnter}
      shouldAnimate={isWindowFocused}
    >
      {children as ((props: { src: string; size: { width: number; height: number } }) => ReactNode) | undefined}
    </LazyImage>
  );
};

LazyImageZoomable.displayName = 'LazyImageZoomable';
