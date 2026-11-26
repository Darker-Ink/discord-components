import type { MediaViewerItem, MediaViewerOpenOptions } from '../media/mediaViewerTypes';
import { getAttachmentSrc } from '../media/mediaUrl';
import { ObscureReason } from '../media/constants';
import type { MediaMosaicItemData, MediaMosaicItemType } from '../MediaMosaic/types';
import { isPlaintextPreviewFile } from './plaintextExtensions';
import { AttachmentFlags, hasFlag, type APIAttachment, type APIMessageAttachmentContext } from './types';

const IMAGE_FILE_RE = /\.(png|jpe?g|jfif|webp|gif|heic|heif|dng|avif)$/i;
const VIDEO_FILE_RE = /\.(mp4|webm|mov|qt)$/i;
const AUDIO_FILE_RE = /\.(mp3|m4a|ogg|opus|wav|flac)$/i;

export const isImageFile = (filename: string | null | undefined) => filename != null && IMAGE_FILE_RE.test(filename);
export const isVideoFile = (filename: string | null | undefined) => filename != null && VIDEO_FILE_RE.test(filename);
export const isImageContentType = (contentType: string | null | undefined) => contentType?.split('/')[0] === 'image';
export const isVideoContentType = (contentType: string | null | undefined) => contentType?.split('/')[0] === 'video';

/**
 * How an attachment shows up in the mosaic. Images and videos only render inline when
 * `inlineAttachmentMedia` is on and they have dimensions; otherwise they become file cards.
 */
export const getAttachmentMosaicType = (
  attachment: APIAttachment,
  inlineAttachmentMedia: boolean,
): MediaMosaicItemType => {
  const { filename, width, height } = attachment;
  if (inlineAttachmentMedia && width != null && width > 0 && height != null && height > 0) {
    if (isImageFile(filename)) return 'IMAGE';
    if (isVideoFile(filename) && attachment.proxy_url != null)
      return hasFlag(attachment.flags, AttachmentFlags.IsClip) ? 'CLIP' : 'VIDEO';
    return 'INVALID';
  }
  if (AUDIO_FILE_RE.test(filename) && attachment.url != null) return 'AUDIO';
  if (attachment.url != null && isPlaintextPreviewFile(filename)) return 'PLAINTEXT_PREVIEW';
  return 'OTHER';
};

export const createMosaicItemFromAttachment = (
  attachment: APIAttachment,
  inlineAttachmentMedia: boolean,
): MediaMosaicItemData<APIAttachment> => ({
  uniqueId: attachment.id,
  originalItem: attachment,
  type: getAttachmentMosaicType(attachment, inlineAttachmentMedia),
  downloadUrl: attachment.url,
  height: attachment.height,
  width: attachment.width,
  spoiler: hasFlag(attachment.flags, AttachmentFlags.IsSpoiler),
  contentType: attachment.content_type,
  srcIsAnimated: hasFlag(attachment.flags, AttachmentFlags.IsAnimated),
});

/** The media viewer item for an attachment (the client's `attachmentToMediaItem`). */
export const attachmentToMediaViewerItem = (
  attachment: APIAttachment,
  message?: APIMessageAttachmentContext,
): Omit<MediaViewerItem, 'type'> & { type: MediaViewerItem['type'] | 'INVALID' } => ({
  url: attachment.url,
  proxyUrl: attachment.proxy_url,
  height: attachment.height,
  width: attachment.width,
  contentType: attachment.content_type,
  originalContentType: attachment.original_content_type,
  placeholder: attachment.placeholder,
  placeholderVersion: attachment.placeholder_version,
  flags: hasFlag(attachment.flags, AttachmentFlags.IsAnimated) ? 1 : 0,
  type: isImageFile(attachment.filename) ? 'IMAGE' : isVideoFile(attachment.filename) ? 'VIDEO' : 'INVALID',
  alt: attachment.description,
  sourceMetadata: {
    message,
    identifier: {
      type: 'attachment',
      attachmentId: attachment.id,
      filename: attachment.filename,
      title: attachment.title,
      size: attachment.size,
    },
  },
  original: attachment.url,
  srcIsAnimated: hasFlag(attachment.flags, AttachmentFlags.IsAnimated),
});

/** Default obscure reason: attachments flagged as spoilers. */
export const getAttachmentObscureReason = (item: MediaMosaicItemData<APIAttachment>) =>
  hasFlag(item.originalItem.flags, AttachmentFlags.IsSpoiler) ? ObscureReason.SPOILER : null;

export interface MediaViewerHandlers {
  srcToOnClickOverride: Record<
    string,
    (
      event: { preventDefault: () => void; currentTarget: EventTarget | null },
      overrides?: Partial<MediaViewerItem>,
    ) => void
  >;
  srcToHandlePreloadImage: Record<string, () => void>;
  srcToSeekOverride: Record<string, (timeMs: number) => void>;
}

/**
 * For mosaics with several media: clicking any of them opens the media viewer on that item with all of them
 * in the carousel (the client's `getMediaViewerHandlers`).
 */
export const createMediaViewerHandlers = (
  items: MediaViewerItem[],
  options: Omit<MediaViewerOpenOptions, 'items' | 'startingIndex'>,
  openMediaViewer: ((options: MediaViewerOpenOptions) => void) | undefined,
  preload: (item: MediaViewerItem, hasMultiple: boolean) => void,
  location?: string,
): MediaViewerHandlers => {
  const handlers: MediaViewerHandlers = {
    srcToOnClickOverride: {},
    srcToHandlePreloadImage: {},
    srcToSeekOverride: {},
  };
  for (const [index, item] of items.entries()) {
    const src = getAttachmentSrc({ proxyURL: item.proxyUrl, url: item.url });
    handlers.srcToOnClickOverride[src] = (event, overrides) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
      openMediaViewer?.({
        ...options,
        items: overrides == null ? items : items.map((other) => (other === item ? { ...other, ...overrides } : other)),
        startingIndex: index,
        location: location ?? 'zoomedMediaModalHelper',
      });
    };
    handlers.srcToHandlePreloadImage[src] = () => preload(item, items.length > 1);
    handlers.srcToSeekOverride[src] = (timeMs) =>
      openMediaViewer?.({
        ...options,
        items: items.map((other) => (other === item ? { ...other, initialTimeSec: timeMs / 1000 } : other)),
        startingIndex: index,
        location: location ?? 'zoomedMediaModalHelper',
      });
  }
  return handlers;
};
