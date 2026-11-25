import { fit, hasDimensions, type Dimensions } from './sizing';
import { getFormatQuality, getSrcWithWidthAndHeight, loadImage, type AnimatedSource } from './mediaUrl';

/** The box the media viewer shows media in; `hasMultiple` reserves room for the carousel arrows. */
export const getMediaViewerMaxSize = (
  hasMultiple: boolean,
  media: Partial<Dimensions>,
  win: Pick<Window, 'innerWidth' | 'innerHeight'> = window,
): Dimensions => {
  const { innerWidth, innerHeight } = win;
  const maxWidth = innerWidth - (hasMultiple ? 76 : 24) * 2;
  const maxHeight = innerHeight - 176;
  if (!hasDimensions(media)) return { width: maxWidth, height: maxHeight };
  const { width, height } = media as Dimensions;
  const constrained = fit({ width, height, maxWidth, maxHeight });
  const wide = fit({ width, height, maxWidth: innerWidth - 544, maxHeight: innerHeight - (hasMultiple ? 88 : 36) * 2 });
  return constrained.width >= wide.width ? constrained : wide;
};

export interface PreloadImageOptions extends Omit<AnimatedSource, 'src'> {
  freeze?: boolean;
}

/** Warms the cache with the URL the media viewer will request, so opening it is instant. */
export const preloadImage = ({
  src,
  dimensions: { maxWidth, maxHeight, imageWidth, imageHeight },
  options: { srcIsAnimated, original, animated, freeze } = {},
  callback,
}: {
  src: string;
  dimensions: { maxWidth: number; maxHeight: number; imageWidth: number; imageHeight: number };
  options?: PreloadImageOptions;
  callback?: (error: boolean) => void;
}) => {
  if (imageWidth === 1 && imageHeight === 1) return;
  const { format, quality } = getFormatQuality({ src, original, animated, srcIsAnimated, freeze });
  const url = getSrcWithWidthAndHeight({
    src,
    width: imageWidth,
    height: imageHeight,
    maxWidth,
    maxHeight,
    srcIsAnimated,
    format,
    quality,
  });
  return loadImage(url, (error) => callback?.(error));
};

export const preloadZoomedImage = ({
  src,
  width,
  height,
  hasMultiple = false,
  options,
}: {
  src: string;
  width: number;
  height: number;
  hasMultiple?: boolean;
  options?: PreloadImageOptions;
}) => {
  const { width: maxWidth, height: maxHeight } = getMediaViewerMaxSize(hasMultiple, { width, height });
  preloadImage({ src, dimensions: { maxWidth, maxHeight, imageWidth: width, imageHeight: height }, options });
};
