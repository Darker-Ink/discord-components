export interface Dimensions {
  width: number;
  height: number;
}

export interface FitOptions extends Dimensions {
  maxWidth: number;
  maxHeight: number;
  minWidth?: number;
  minHeight?: number;
}

/** Scales `width`×`height` down (never up) to fit the max box, then clamps to the min box. */
export const fit = ({ width, height, maxWidth, maxHeight, minWidth = 0, minHeight = 0 }: FitOptions): Dimensions => {
  if (width !== maxWidth || height !== maxHeight) {
    const widthRatio = width > maxWidth ? maxWidth / width : 1;
    width = Math.max(Math.round(width * widthRatio), minWidth);
    height = Math.max(Math.round(height * widthRatio), minHeight);
    const heightRatio = height > maxHeight ? maxHeight / height : 1;
    width = Math.max(Math.round(width * heightRatio), minWidth);
    height = Math.max(Math.round(height * heightRatio), minHeight);
  }
  return { width, height };
};

export interface RatioOptions extends Dimensions {
  maxWidth: number;
  maxHeight: number;
}

/** Scale factor (≤ 1) that makes the media fit inside the max box. */
export const getRatio = ({ width, height, maxWidth, maxHeight }: RatioOptions) => {
  let widthRatio = 1;
  if (width > maxWidth) widthRatio = maxWidth / width;
  width = Math.round(width * widthRatio);
  height = Math.round(height * widthRatio);
  let heightRatio = 1;
  if (height > maxHeight) heightRatio = maxHeight / height;
  return Math.min(widthRatio * heightRatio, 1);
};

/** Scale factor (≤ 1) that makes the media cover the max box, used for mosaic tiles that crop. */
export const getCoverRatio = ({ width, height, maxWidth, maxHeight }: RatioOptions) =>
  width === height ? 1 : Math.min(Math.max(maxWidth / width, maxHeight / height), 1);

export const hasDimensions = ({ width, height }: { width?: number | null; height?: number | null }) =>
  width != null && width !== 0 && height != null && height !== 0;

/** Size of media shown on its own in a modal: at most 75% × 65% of the window, capped at 2000px. */
export const fitToWindow = (width: number, height: number) => {
  const maxHeight = Math.min(Math.round(0.65 * window.innerHeight), Math.round(window.innerHeight));
  return fit({
    width,
    height,
    maxWidth: Math.min(Math.min(Math.round(0.75 * window.innerWidth), Math.round(window.innerWidth)), 2000),
    maxHeight: Math.min(maxHeight, 2000),
  });
};

/** Videos larger than this can't be played inline and link out instead. */
export const isPlayableVideoSize = (width: number, height: number) =>
  (width <= 6016 && height <= 3384) || (width <= 3384 && height <= 6016);
