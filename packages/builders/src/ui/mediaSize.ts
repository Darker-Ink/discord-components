import { useSyncExternalStore } from 'react';
import type { AttachmentResolver } from './attachments';
import type {
  APIEmbed,
  APIMediaGalleryItem,
  APIMessageTopLevelComponent,
  APIUnfurledMediaItem,
} from '@discord-mana/messages';

// A payload you send has bare media URLs; the messages Discord returns have each image's size, a proxy URL and
// a content type, which the client needs to lay media out. The builder fills those in from the image itself,
// for rendering only: the document and the exported JSON keep exactly what was written.

export interface MediaSize {
  width: number;
  height: number;
  /** `image/…` or `video/…` when the URL is known to be one, from the element that loaded it. */
  kind: 'image' | 'video' | 'unknown';
}

const sizes = new Map<string, MediaSize | 'loading' | 'error'>();
const listeners = new Set<() => void>();
let version = 0;

const notify = () => {
  version++;
  for (const listener of listeners) listener();
};

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

/** Starts measuring a URL's media (once per URL); `useMediaSizes` re-renders when it is known. */
export const probeMedia = (url: string | null | undefined) => {
  if (url == null || url === '' || sizes.has(url) || typeof window === 'undefined' || !isHttpUrl(url)) return;
  sizes.set(url, 'loading');
  const done = (size: MediaSize | 'error') => {
    sizes.set(url, size);
    notify();
  };
  if (VIDEO_EXTENSION.test(url)) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight, kind: 'video' });
    video.onerror = () => done('error');
    video.src = url;
    return;
  }
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight, kind: 'image' });
  image.onerror = () => done('error');
  image.src = url;
};

export const getMediaSize = (url: string | null | undefined) => {
  if (url == null) return undefined;
  const size = sizes.get(url);
  return typeof size === 'object' ? size : undefined;
};

export const isMediaBroken = (url: string | null | undefined) => url != null && sizes.get(url) === 'error';

/** Re-renders whenever a probed size arrives; returns a counter to use as a memo dependency. */
export const useMediaSizes = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => version,
  );

/** Seeds the cache, e.g. with sizes a test or a server already knows. */
export const setMediaSize = (url: string, size: MediaSize) => {
  sizes.set(url, size);
  notify();
};

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const guessContentType = (url: string, size: MediaSize | undefined) => {
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();
  if (extension != null && CONTENT_TYPES[extension] != null) return CONTENT_TYPES[extension];
  if (size?.kind === 'video') return 'video/mp4';
  if (size?.kind === 'image') return 'image/png';
  return undefined;
};

type Sized = { url?: string; width?: number | null; height?: number | null; proxy_url?: string };

const withSize = <T extends Sized>(media: T | undefined): T | undefined => {
  if (media?.url == null) return media;
  if (media.width != null && media.height != null) return media;
  probeMedia(media.url);
  const size = getMediaSize(media.url);
  return size != null ? { ...media, width: size.width, height: size.height } : media;
};

/** An image field of an embed pointing at an attached file: the local file, sized. */
const resolveImage = <T extends Sized>(media: T, resolve: AttachmentResolver | undefined): T | undefined => {
  const file = media.url != null ? resolve?.(media.url) : undefined;
  if (file == null) return undefined;
  return {
    ...media,
    url: file.url,
    proxy_url: file.url,
    ...(file.width != null ? { width: file.width, height: file.height } : {}),
  };
};

/** The local file behind an attachment:// icon URL, else the URL itself. */
const resolveIcon = (url: string | undefined, resolve: AttachmentResolver | undefined) =>
  url != null ? (resolve?.(url)?.url ?? url) : url;

/**
 * An embed as Discord would return it: sized images and proxy URLs for the author and footer icons. With a
 * resolver, attachment:// URLs show the attached files.
 */
export const prepareEmbed = (embed: APIEmbed, resolve?: AttachmentResolver): APIEmbed => {
  const result: APIEmbed = { type: 'rich', ...embed };
  if (embed.image != null) result.image = resolveImage(embed.image, resolve) ?? withSize(embed.image);
  if (embed.thumbnail != null) result.thumbnail = resolveImage(embed.thumbnail, resolve) ?? withSize(embed.thumbnail);
  if (embed.author?.icon_url != null && embed.author.proxy_icon_url == null) {
    const icon = resolveIcon(embed.author.icon_url, resolve);
    result.author = { ...embed.author, proxy_icon_url: icon };
  }
  if (embed.footer?.icon_url != null && embed.footer.proxy_icon_url == null) {
    const icon = resolveIcon(embed.footer.icon_url, resolve);
    result.footer = { ...embed.footer, proxy_icon_url: icon };
  }
  return result;
};

/**
 * Unfurled media as Discord would return it (size, proxy URL, content type, loaded). With a resolver, an
 * attachment:// URL shows the attached file.
 */
export const prepareMedia = (media: APIUnfurledMediaItem, resolve?: AttachmentResolver): APIUnfurledMediaItem => {
  if (media.url == null) return media;
  if (media.url.startsWith('attachment://')) {
    const file = resolve?.(media.url);
    if (file == null) return media;
    return {
      ...media,
      url: file.url,
      proxy_url: file.url,
      width: file.width,
      height: file.height,
      content_type: file.content_type,
      loading_state: 2,
    };
  }
  probeMedia(media.url);
  const size = getMediaSize(media.url);
  return {
    ...media,
    proxy_url: media.proxy_url ?? media.url,
    width: media.width ?? size?.width,
    height: media.height ?? size?.height,
    content_type: media.content_type ?? guessContentType(media.url, size),
    loading_state: media.loading_state ?? (isMediaBroken(media.url) ? 3 : 2),
  };
};

const prepareComponent = (
  component: Record<string, unknown>,
  resolve: AttachmentResolver | undefined,
): Record<string, unknown> => {
  const result = { ...component };
  if (Array.isArray(result.components))
    result.components = (result.components as Record<string, unknown>[]).map((child) =>
      prepareComponent(child, resolve),
    );
  if (result.accessory != null)
    result.accessory = prepareComponent(result.accessory as Record<string, unknown>, resolve);
  if (result.media != null) result.media = prepareMedia(result.media as APIUnfurledMediaItem, resolve);
  if (result.file != null) {
    const url = (result.file as APIUnfurledMediaItem).url;
    const file = url != null ? resolve?.(url) : undefined;
    result.file = prepareMedia(result.file as APIUnfurledMediaItem, resolve);
    // A received File component carries the file's name and size.
    if (file != null) Object.assign(result, { name: result.name ?? file.filename, size: result.size ?? file.size });
  }
  if (Array.isArray(result.items))
    result.items = (result.items as APIMediaGalleryItem[]).map((item) => ({
      ...item,
      media: prepareMedia(item.media, resolve),
    }));
  return result;
};

/** Components with their media prepared like `prepareMedia`. */
export const prepareComponents = (components: readonly APIMessageTopLevelComponent[], resolve?: AttachmentResolver) =>
  components.map((component) =>
    prepareComponent(component as unknown as Record<string, unknown>, resolve),
  ) as unknown as APIMessageTopLevelComponent[];
