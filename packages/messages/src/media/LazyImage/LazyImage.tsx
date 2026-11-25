import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useMergeRefs } from '@discord-components/components';
import { ImageReadyState, MediaLayoutType } from '../constants';
import { Image, type ImageProps, type ImageRenderProps } from '../Image/Image';
import { GifTag } from '../GifTag/GifTag';
import { getFormatQuality, getSrcWithWidthAndHeight, isAnimatedImage, isImageLoaded, loadImage } from '../mediaUrl';
import { getCoverRatio, getRatio } from '../sizing';
import type { MediaSourceMetadata } from '../mediaViewerTypes';

export interface LazyImageZoomInfo {
  /** The already-loaded thumbnail URL, shown by the media viewer while the full image loads. */
  zoomThumbnailPlaceholder: string;
  trigger: 'CLICK';
}

export interface LazyImageChildProps extends ImageRenderProps {
  animating?: boolean;
}

export interface LazyImageProps extends Omit<
  ImageProps,
  'children' | 'onClick' | 'readyState' | 'width' | 'height' | 'maxWidth' | 'maxHeight'
> {
  src: string;
  original?: string;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  /** Treats the image as animated regardless of its URL. */
  animated?: boolean;
  /** The attachment's IS_ANIMATED flag: webp/avif sources animate too. */
  srcIsAnimated?: boolean;
  autoPlay?: boolean;
  /** Animated media only plays while this is true (the client passes window focus). */
  shouldAnimate?: boolean;
  /** Always show the first frame. */
  freeze?: boolean;
  responsive?: boolean;
  /** Renders a link to the original URL over the image. */
  shouldLink?: boolean;
  shouldRenderAccessory?: boolean;
  zoomThumbnailPlaceholder?: string;
  onZoom?: (event: MouseEvent<HTMLElement>, info: LazyImageZoomInfo) => void;
  onClick?: (event: MouseEvent<HTMLElement>, info: LazyImageZoomInfo) => void;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  children?: (props: LazyImageChildProps) => ReactNode;
  trigger?: string;
  sourceMetadata?: MediaSourceMetadata;
  ref?: Ref<HTMLDivElement>;
}

let visibilityObserver: IntersectionObserver | null | undefined;
const visibilityListeners = new WeakMap<Element, (visible: boolean) => void>();

// Animated images only play while at least 60% of them is on screen.
const getVisibilityObserver = () => {
  if (visibilityObserver === undefined) {
    visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) visibilityListeners.get(entry.target)?.(entry.isIntersecting);
            },
            { threshold: 0.6 },
          );
  }
  return visibilityObserver;
};

const useVisibility = (ref: { current: Element | null }, enabled: boolean) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    const observer = getVisibilityObserver();
    if (!enabled || node == null || observer == null) return;
    visibilityListeners.set(node, setVisible);
    observer.observe(node);
    return () => {
      observer.unobserve(node);
      visibilityListeners.delete(node);
      setVisible(false);
    };
  }, [ref, enabled]);
  return getVisibilityObserver() == null || visible;
};

/** Discord's `LazyImage`: picks the proxy URL for the displayed size, loads it, and plays animated media on hover. */
export const LazyImage = ({
  src,
  original,
  width,
  height,
  maxWidth,
  maxHeight,
  minWidth = 0,
  minHeight = 0,
  mediaLayoutType,
  responsive,
  useFullWidth,
  animated = false,
  srcIsAnimated = false,
  autoPlay = false,
  shouldAnimate,
  freeze,
  shouldLink = false,
  shouldRenderAccessory = true,
  zoomThumbnailPlaceholder,
  onZoom,
  onClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  renderAccessory,
  children,
  alt,
  className,
  imageClassName,
  tabIndex,
  limitResponsiveWidth,
  placeholder,
  placeholderVersion,
  dataSafeSrc,
  trigger: _trigger,
  sourceMetadata: _sourceMetadata,
  ref,
}: LazyImageProps) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergeRefs(imageRef, ref);
  const isAnimated = isAnimatedImage({ src, original, animated, srcIsAnimated });
  const [hasMouseOver, setHasMouseOver] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const ratio =
    mediaLayoutType === MediaLayoutType.MOSAIC && useFullWidth
      ? getCoverRatio({ width, height, maxWidth: maxWidth ?? 400, maxHeight: maxHeight ?? 300 })
      : getRatio({ width, height, maxWidth: maxWidth ?? 400, maxHeight: maxHeight ?? 300 });

  const getSrc = (srcRatio: number, freezeFrame = false, unbounded = false) => {
    const bounded = mediaLayoutType === MediaLayoutType.MOSAIC && !unbounded;
    const { format, quality } = getFormatQuality({ src, original, animated, srcIsAnimated, freeze: freezeFrame });
    return getSrcWithWidthAndHeight({
      src,
      width,
      height,
      ratio: srcRatio,
      maxWidth: bounded ? maxWidth : undefined,
      maxHeight: bounded ? maxHeight : undefined,
      format,
      quality,
      animated: !freezeFrame,
      srcIsAnimated,
    });
  };

  const loadSrc = getSrc(ratio, isAnimated);
  const [readyState, setReadyState] = useState<ImageReadyState>(() =>
    isImageLoaded(loadSrc) ? ImageReadyState.READY : ImageReadyState.LOADING,
  );

  useEffect(() => {
    if (readyState !== ImageReadyState.LOADING || (width === 1 && height === 1)) return;
    let active = true;
    const cancel = loadImage(loadSrc, (error) => {
      if (active) setReadyState(error ? ImageReadyState.ERROR : ImageReadyState.READY);
    });
    return () => {
      active = false;
      cancel();
    };
    // Discord starts loading once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useVisibility(imageRef, isAnimated);

  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    if (isAnimated) setHasMouseOver(true);
    onMouseEnter?.(event);
  };
  const handleMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    if (isAnimated) setHasMouseOver(false);
    onMouseLeave?.(event);
  };
  const handleFocus = () => {
    if (isAnimated) setHasFocus(true);
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
  };

  const displayWidth = Math.min(Math.max(Math.round(width * ratio), minWidth ?? 0), maxWidth ?? Infinity);
  const displayHeight = Math.min(Math.max(Math.round(height * ratio), minHeight ?? 0), maxHeight ?? Infinity);
  if (displayWidth === 1 && displayHeight === 1) return null;

  const zoomable = onZoom != null;
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const info: LazyImageZoomInfo = { zoomThumbnailPlaceholder: getSrc(ratio, false, true), trigger: 'CLICK' };
    if (onClick != null) onClick(event, info);
    else if (onZoom != null) {
      event.preventDefault();
      onZoom(event, info);
    }
  };

  let imageSrc = '';
  let imageRenderAccessory: (() => ReactNode) | undefined;
  let animating: boolean | undefined;
  if (readyState === ImageReadyState.LOADING) {
    if (zoomThumbnailPlaceholder != null) imageSrc = zoomThumbnailPlaceholder;
  } else if (readyState === ImageReadyState.READY) {
    if (isAnimated) {
      animating = (autoPlay || hasMouseOver || hasFocus) && (shouldAnimate ?? true) && visible;
      if (animating) {
        imageSrc = getSrc(ratio, freeze);
        imageRenderAccessory = renderAccessory;
      } else {
        imageSrc = getSrc(ratio, freeze || !animated || !autoPlay);
        imageRenderAccessory = () => {
          const accessory = renderAccessory != null ? renderAccessory() : null;
          return shouldRenderAccessory ? hasMouseOver || hasFocus ? accessory : <GifTag /> : null;
        };
      }
    } else {
      imageSrc = getSrc(ratio);
    }
  }

  return (
    <Image
      ref={mergedRef}
      alt={alt}
      readyState={readyState}
      onContextMenu={onContextMenu ?? undefined}
      zoomable={zoomable}
      className={className}
      imageClassName={imageClassName}
      minWidth={minWidth}
      minHeight={minHeight}
      mediaLayoutType={mediaLayoutType ?? (responsive ? MediaLayoutType.RESPONSIVE : MediaLayoutType.STATIC)}
      limitResponsiveWidth={limitResponsiveWidth}
      useFullWidth={useFullWidth}
      tabIndex={tabIndex}
      width={displayWidth}
      height={displayHeight}
      src={imageSrc}
      placeholder={placeholder}
      placeholderVersion={placeholderVersion}
      dataSafeSrc={dataSafeSrc}
      srcIsAnimated={srcIsAnimated}
      onClick={zoomable || onClick != null ? handleClick : undefined}
      original={shouldLink ? (original != null && original !== '' ? original : '') : undefined}
      renderAccessory={imageRenderAccessory}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disableLoadingSpinner={false}
    >
      {children != null
        ? ({ src: childSrc, size, alt: childAlt, mediaLayoutType: layout }) =>
            children({ src: childSrc, size, animating, alt: childAlt, mediaLayoutType: layout })
        : undefined}
    </Image>
  );
};

LazyImage.displayName = 'LazyImage';
