import { fit } from './sizing';

const GIF_RE = /\.gif($|\?|#)/i;
const WEBP_RE = /\.webp($|\?|#)/i;
const AVIF_RE = /\.avif($|\?|#)/i;
const PNG_RE = /\.png($|\?|#)/i;

export const DISCORD_CDN_HOST = 'cdn.discordapp.com';

export const getDevicePixelRatio = () => (typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1);

let webpSupport: boolean | undefined;
export const canUseWebp = () => {
  if (webpSupport == null) {
    try {
      webpSupport = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      webpSupport = false;
    }
  }
  return webpSupport;
};

export const isDiscordCdnUrl = (url: string | null | undefined) => {
  if (url == null) return false;
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.href : undefined).hostname === DISCORD_CDN_HOST;
  } catch {
    return false;
  }
};

export const toURLSafe = (url: string, base?: string) => {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
};

/** The URL the client loads for an attachment: the media proxy when there is one, otherwise the original. */
export const getAttachmentSrc = ({ proxyURL, url }: { proxyURL?: string | null; url: string }) =>
  proxyURL != null && proxyURL !== '' ? proxyURL : url;

export interface AnimatedSource {
  src: string;
  original?: string | null;
  animated?: boolean;
  srcIsAnimated?: boolean | null;
}

export const isAnimatedImage = ({ src, original, animated, srcIsAnimated }: AnimatedSource) => {
  const source = original != null && original !== '' ? original : src;
  return !!animated || GIF_RE.test(source) || (!!srcIsAnimated && (WEBP_RE.test(source) || AVIF_RE.test(source)));
};

export const isGifUrl = (url: string) => GIF_RE.test(url);
export const isWebpUrl = (url: string) => WEBP_RE.test(url);
export const isAvifUrl = (url: string) => AVIF_RE.test(url);

export interface FormatQuality {
  format: string | null;
  quality: string | null;
}

/** Discord asks the media proxy for lossy webp unless the image animates (frozen frames are png). */
export const getFormatQuality = ({
  freeze = false,
  ...source
}: AnimatedSource & { freeze?: boolean }): FormatQuality => {
  let format: string | null = null;
  let quality: string | null = null;
  if (canUseWebp() && (freeze || !isAnimatedImage(source))) {
    format = 'webp';
    if (PNG_RE.test(source.src) || AVIF_RE.test(source.src)) quality = 'lossless';
  } else if (freeze) {
    format = 'png';
  }
  return { format, quality };
};

export interface SizedSrcOptions {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  format?: string | null;
  quality?: string | null;
  animated?: boolean;
  srcIsAnimated?: boolean | null;
}

/** Appends the media proxy's resize parameters (`format`, `quality`, `animated`, `width`, `height`). */
export const buildSizedSrc = ({
  src,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  format = null,
  quality = null,
  animated = false,
  srcIsAnimated = false,
}: SizedSrcOptions) => {
  // Local files (data: and blob: URLs) can't take query parameters.
  if (src.startsWith('data:image') || src.startsWith('blob:') || isDiscordCdnUrl(src)) return src;
  const [base, search] = src.split('?');
  const query: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search ?? '')) if (key !== '') query[key] = value;
  if (format != null) query.format = format;
  if (quality != null) query.quality = quality;
  if (animated && srcIsAnimated && (WEBP_RE.test(src) || AVIF_RE.test(src))) query.animated = 'true';
  if (AVIF_RE.test(src)) query.format = 'webp';
  const capped = fit({ width: targetWidth, height: targetHeight, maxWidth: 4096, maxHeight: 4096 });
  if (capped.width !== sourceWidth || capped.height !== sourceHeight) {
    query.width = String(capped.width | 0);
    query.height = String(capped.height | 0);
  }
  const keys = Object.keys(query);
  if (keys.length === 0) return base;
  return `${base}?${keys.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&')}`;
};

export interface SrcWithWidthAndHeightOptions {
  src: string;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  ratio?: number;
  format?: string | null;
  quality?: string | null;
  animated?: boolean;
  srcIsAnimated?: boolean | null;
}

export type MediaUrlBuilder = (options: SizedSrcOptions) => string;

let mediaUrlBuilder: MediaUrlBuilder = buildSizedSrc;

/**
 * Replaces how sized media URLs are built (e.g. to target another image proxy). The builder receives the source
 * URL, its natural size and the size to request, already multiplied by the device pixel ratio.
 */
export const setMediaUrlBuilder = (builder: MediaUrlBuilder | null) => {
  mediaUrlBuilder = builder ?? buildSizedSrc;
};

export const getMediaUrlBuilder = () => mediaUrlBuilder;

/** The client's `getSrcWithWidthAndHeight`: the URL to request for media displayed at `ratio` of its size. */
export const getSrcWithWidthAndHeight = ({
  src,
  width,
  height,
  maxWidth,
  maxHeight,
  ratio = 1,
  format = null,
  quality = null,
  animated = false,
  srcIsAnimated = false,
}: SrcWithWidthAndHeightOptions) => {
  let targetWidth = width;
  let targetHeight = height;
  if (ratio < 1) {
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
  }
  if (maxWidth != null) targetWidth = Math.min(targetWidth, maxWidth);
  if (maxHeight != null) targetHeight = Math.min(targetHeight, maxHeight);
  const dpr = getDevicePixelRatio();
  return mediaUrlBuilder({
    src,
    sourceWidth: width,
    sourceHeight: height,
    targetWidth: targetWidth * dpr,
    targetHeight: targetHeight * dpr,
    format,
    quality,
    animated,
    srcIsAnimated,
  });
};

interface LoadedImage {
  url: string;
  loaded: boolean;
  width?: number;
  height?: number;
  callbacks?: Set<(error: boolean, image: LoadedImage) => void>;
  fails?: number;
  retry?: ReturnType<typeof setTimeout>;
}

const MAX_CACHED_IMAGES = 1000;
const imageCache = new Map<string, LoadedImage>();

const remember = (url: string, entry: LoadedImage) => {
  imageCache.delete(url);
  imageCache.set(url, entry);
  if (imageCache.size > MAX_CACHED_IMAGES) imageCache.delete(imageCache.keys().next().value!);
};

export const isImageLoaded = (url: string) => imageCache.get(url)?.loaded === true;

/** Loads `url` once (retrying with backoff), sharing the result between everyone who asks. Returns a canceller. */
export const loadImage = (url: string, callback?: (error: boolean, image: LoadedImage) => void) => {
  let entry = imageCache.get(url);
  if (entry?.loaded) {
    callback?.(false, entry);
    return () => {};
  }
  if (entry == null) {
    const pending: LoadedImage = { url, loaded: false, fails: 0 };
    entry = pending;
    remember(url, pending);
    const attempt = () => {
      const image = new Image();
      image.onload = () => {
        const done: LoadedImage = { url, loaded: true, width: image.width, height: image.height };
        remember(url, done);
        pending.callbacks?.forEach((cb) => cb(false, done));
      };
      image.onerror = () => {
        pending.fails = (pending.fails ?? 0) + 1;
        if (pending.fails < 5) {
          pending.retry = setTimeout(attempt, Math.min(500 * 2 ** pending.fails, 30000));
        } else {
          imageCache.delete(url);
          pending.callbacks?.forEach((cb) => cb(true, pending));
        }
      };
      image.src = url;
    };
    attempt();
  }
  if (callback == null) return () => {};
  const listener = callback.bind(null);
  (entry.callbacks ??= new Set()).add(listener);
  const current = entry;
  return () => {
    current.callbacks?.delete(listener);
  };
};
