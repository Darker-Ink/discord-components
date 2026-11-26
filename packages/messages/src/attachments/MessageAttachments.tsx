import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { MediaMosaic } from '../MediaMosaic/MediaMosaic';
import type {
  MediaMosaicAudioRenderProps,
  MediaMosaicImageRenderProps,
  MediaMosaicItemData,
  MediaMosaicItemProps,
  MediaMosaicRenderProps,
  MediaMosaicVideoRenderProps,
} from '../MediaMosaic/types';
import { useMediaContext } from '../media/MediaContext';
import { getAttachmentSrc, isImageLoaded, loadImage, toURLSafe } from '../media/mediaUrl';
import { hasDimensions } from '../media/sizing';
import { preloadZoomedImage } from '../media/preload';
import { MediaImage, MediaVideoWithAltText } from '../media/MediaRenderers/MediaRenderers';
import { MediaPlayer } from '../media/MediaPlayer/MediaPlayer';
import { formatFileSize, getAttachmentFileName } from '../media/utils/filesize';
import type { ObscureReason } from '../media/constants';
import type { MediaViewerItem } from '../media/mediaViewerTypes';
import { FileAttachment } from './FileAttachment';
import {
  attachmentToMediaViewerItem,
  createMediaViewerHandlers,
  createMosaicItemFromAttachment,
  getAttachmentObscureReason,
} from './attachmentMedia';
import { AttachmentFlags, hasFlag, type APIAttachment, type APIMessageAttachmentContext } from './types';

type AttachmentItem = MediaMosaicItemData<APIAttachment>;

/** Renders an image attachment (the client's `renderImageComponent` for message attachments). */
export const renderAttachmentImage = (
  props: MediaMosaicImageRenderProps<APIAttachment, APIMessageAttachmentContext>,
) => {
  const attachment = props.item.originalItem;
  const { item: _item, message, width, height, onClick, ...rest } = props;
  return (
    <MediaImage
      {...(rest as object)}
      width={width ?? 0}
      height={height ?? 0}
      onClick={onClick as never}
      alt={attachment.description}
      src={getAttachmentSrc({ proxyURL: attachment.proxy_url, url: attachment.url })}
      original={attachment.url}
      placeholder={attachment.placeholder}
      placeholderVersion={attachment.placeholder_version}
      contentType={attachment.content_type}
      originalContentType={attachment.original_content_type}
      srcIsAnimated={hasFlag(attachment.flags, AttachmentFlags.IsAnimated)}
      sourceMetadata={{
        message,
        identifier: {
          type: 'attachment',
          attachmentId: attachment.id,
          filename: attachment.filename,
          title: attachment.title,
          size: attachment.size,
        },
      }}
      analyticsSource="ImageComponentForMessageAttachment"
    />
  );
};

/** Renders a video attachment: the proxy's webp frame as poster, the original file as source. */
export const renderAttachmentVideo = (
  props: MediaMosaicVideoRenderProps<APIAttachment, APIMessageAttachmentContext>,
) => {
  const attachment = props.item.originalItem;
  const poster = toURLSafe(attachment.proxy_url, typeof window !== 'undefined' ? window.location.href : undefined);
  if (poster == null) return null;
  // The media proxy's first frame (a local file's blob: URL takes no parameters).
  const local = poster.protocol === 'blob:';
  if (!local) poster.searchParams.append('format', 'webp');
  const {
    item: _item,
    message,
    onOpenInMediaViewer: _onOpenInMediaViewer,
    onSeekRequest: _onSeekRequest,
    isSingleMosaicItem: _isSingleMosaicItem,
    width,
    height,
    naturalWidth,
    naturalHeight,
    onClick,
    ...rest
  } = props;
  return (
    <MediaVideoWithAltText
      {...(rest as object)}
      width={width ?? 0}
      height={height ?? 0}
      naturalWidth={naturalWidth ?? 0}
      naturalHeight={naturalHeight ?? 0}
      onClick={onClick as never}
      showPlaybackSpeedControl
      alt={attachment.description}
      poster={poster.toString()}
      fileSize={attachment.size}
      fileName={getAttachmentFileName(attachment)}
      src={attachment.url}
      placeholder={attachment.placeholder}
      placeholderVersion={attachment.placeholder_version}
      srcIsAnimated={hasFlag(attachment.flags, AttachmentFlags.IsAnimated)}
      sourceMetadata={{
        message,
        identifier: {
          type: 'attachment',
          attachmentId: attachment.id,
          filename: attachment.filename,
          size: attachment.size,
        },
      }}
    />
  );
};

/** Renders an audio attachment as the audio player card. */
export const renderAttachmentAudio = (
  props: MediaMosaicAudioRenderProps<APIAttachment, APIMessageAttachmentContext>,
) => {
  const attachment = props.item.originalItem;
  return (
    <>
      <MediaPlayer
        src={attachment.url}
        fileName={getAttachmentFileName(attachment)}
        fileSize={formatFileSize(attachment.size)}
        fileSizeBytes={attachment.size}
        type={MediaPlayer.Types.AUDIO}
        className={props.className}
        playable={props.playable}
        autoMute={false}
        onVolumeShow={props.onVolumeShow}
        onVolumeHide={props.onVolumeHide}
        mimeType={props.mimeType}
        onPlay={props.onPlay}
      />
      {props.renderAdjacentContent?.()}
    </>
  );
};

/** Renders any other attachment as a file card. */
export const renderAttachmentFile = (props: MediaMosaicRenderProps<APIAttachment, APIMessageAttachmentContext>) => {
  const attachment = props.item.originalItem;
  return (
    <FileAttachment
      className={props.className}
      url={attachment.url}
      fileName={getAttachmentFileName(attachment)}
      fileSize={attachment.size}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      renderAdjacentContent={props.renderAdjacentContent}
    />
  );
};

const preloadViewerItem = (item: MediaViewerItem, hasMultiple: boolean) => {
  if (item.type !== 'IMAGE') return;
  if (!hasDimensions(item)) {
    if (!isImageLoaded(item.url)) loadImage(item.url);
    return;
  }
  preloadZoomedImage({
    src: getAttachmentSrc({ proxyURL: item.proxyUrl, url: item.url }),
    width: item.width!,
    height: item.height!,
    hasMultiple,
    options: item,
  });
};

export interface MessageAttachmentsRenderers {
  renderImageComponent: (props: MediaMosaicImageRenderProps<APIAttachment, APIMessageAttachmentContext>) => ReactNode;
  renderVideoComponent: (props: MediaMosaicVideoRenderProps<APIAttachment, APIMessageAttachmentContext>) => ReactNode;
  renderAudioComponent: (props: MediaMosaicAudioRenderProps<APIAttachment, APIMessageAttachmentContext>) => ReactNode;
  /** Text files the client previews inline; rendered as file cards unless overridden. */
  renderPlaintextFilePreview: (props: MediaMosaicRenderProps<APIAttachment, APIMessageAttachmentContext>) => ReactNode;
  renderGenericFileComponent: (props: MediaMosaicRenderProps<APIAttachment, APIMessageAttachmentContext>) => ReactNode;
}

export const DEFAULT_ATTACHMENT_RENDERERS: MessageAttachmentsRenderers = {
  renderImageComponent: renderAttachmentImage,
  renderVideoComponent: renderAttachmentVideo,
  renderAudioComponent: renderAttachmentAudio,
  renderPlaintextFilePreview: renderAttachmentFile,
  renderGenericFileComponent: renderAttachmentFile,
};

export interface MessageAttachmentsProps extends Partial<MessageAttachmentsRenderers> {
  /** The message's `attachments`, as the API sends them. */
  attachments: APIAttachment[];
  /** The message they belong to; only `content` and `flags` are read (for the remove button). */
  message?: APIMessageAttachmentContext;
  /** Shows the hover edit/remove buttons (the author's own message). */
  canDeleteAttachments?: boolean;
  onRemoveAttachment?: (attachment: APIAttachment) => void;
  onEditAttachment?: (attachment: APIAttachment) => void;
  onMediaItemContextMenu?: (event: MouseEvent<HTMLElement>, attachment: APIAttachment) => void;
  onPlay?: (attachment: APIAttachment, autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
  /** Overrides why an attachment is hidden; defaults to the spoiler flag. */
  getObscureReason?: (item: AttachmentItem, message: APIMessageAttachmentContext) => ObscureReason | null;
  allowFullScreen?: boolean;
  /** Hides download buttons (Discord does in forums that turned media downloads off). */
  shouldHideMediaOptions?: boolean;
  /** Renders the GIF favorite star for an animated image attachment. */
  renderGifFavoriteButton?: (attachment: APIAttachment) => ReactNode;
}

const EMPTY_MESSAGE: APIMessageAttachmentContext = {};

/** A message's attachments laid out as Discord does: the media mosaic plus file cards. */
export const MessageAttachments = ({
  attachments,
  message = EMPTY_MESSAGE,
  canDeleteAttachments = false,
  onRemoveAttachment,
  onEditAttachment,
  onMediaItemContextMenu,
  onPlay,
  getObscureReason = getAttachmentObscureReason,
  allowFullScreen = true,
  shouldHideMediaOptions = false,
  renderGifFavoriteButton,
  renderImageComponent = renderAttachmentImage,
  renderVideoComponent = renderAttachmentVideo,
  renderAudioComponent = renderAttachmentAudio,
  renderPlaintextFilePreview = renderAttachmentFile,
  renderGenericFileComponent = renderAttachmentFile,
}: MessageAttachmentsProps) => {
  const { gifAutoPlay, inlineAttachmentMedia, openMediaViewer } = useMediaContext();

  const items = useMemo(() => {
    const visible = attachments.filter((attachment) => !hasFlag(attachment.flags, AttachmentFlags.IsThumbnail));
    if (visible.length === 0) return [];
    const viewerItems = visible
      .map((attachment) => attachmentToMediaViewerItem(attachment, message))
      .filter((item): item is MediaViewerItem => item.type !== 'INVALID');
    const options = { shouldHideMediaOptions };
    const handlers = createMediaViewerHandlers(
      viewerItems,
      options,
      openMediaViewer,
      preloadViewerItem,
      'Media Mosaic',
    );
    const clickHandlers =
      viewerItems.length > 1
        ? handlers
        : createMediaViewerHandlers([], options, openMediaViewer, preloadViewerItem, 'Media Mosaic');
    return visible.map((attachment): MediaMosaicItemProps<APIAttachment, APIMessageAttachmentContext> => {
      const props: MediaMosaicItemProps<APIAttachment, APIMessageAttachmentContext> = {
        message,
        item: createMosaicItemFromAttachment(attachment, inlineAttachmentMedia),
        autoPlayGif: gifAutoPlay,
        canRemoveItem: canDeleteAttachments && (visible.length > 1 || (message.content ?? '') !== ''),
        onRemoveItem: (item) => onRemoveAttachment?.(item.originalItem),
        canEditItem: canDeleteAttachments,
        onEditItem: (item) => onEditAttachment?.(item.originalItem),
        getObscureReason,
        onContextMenu:
          onMediaItemContextMenu != null
            ? (event) => {
                event.stopPropagation();
                event.preventDefault();
                onMediaItemContextMenu(event, attachment);
              }
            : undefined,
        renderAudioComponent,
        renderImageComponent,
        renderVideoComponent,
        renderPlaintextFilePreview,
        renderGenericFileComponent,
        onPlay: (autoPlayed, currentTimeMs, durationMs) => onPlay?.(attachment, autoPlayed, currentTimeMs, durationMs),
        gifFavoriteButton: renderGifFavoriteButton != null ? () => renderGifFavoriteButton(attachment) : undefined,
        allowFullScreen,
        shouldHideMediaOptions,
      };
      const src = getAttachmentSrc({ proxyURL: attachment.proxy_url, url: attachment.url });
      props.onOpenInMediaViewer = handlers.srcToSeekOverride[src];
      if (src in clickHandlers.srcToOnClickOverride) {
        props.onClick = clickHandlers.srcToOnClickOverride[src] as MediaMosaicItemProps['onClick'];
        props.handlePreloadImage = clickHandlers.srcToHandlePreloadImage[src];
        props.onSeekRequest = clickHandlers.srcToSeekOverride[src];
      }
      return props;
    });
  }, [
    attachments,
    message,
    shouldHideMediaOptions,
    openMediaViewer,
    inlineAttachmentMedia,
    gifAutoPlay,
    canDeleteAttachments,
    onRemoveAttachment,
    onEditAttachment,
    getObscureReason,
    onMediaItemContextMenu,
    renderAudioComponent,
    renderImageComponent,
    renderVideoComponent,
    renderPlaintextFilePreview,
    renderGenericFileComponent,
    onPlay,
    renderGifFavoriteButton,
    allowFullScreen,
  ]);

  if (items.length === 0) return null;
  return <MediaMosaic items={items} />;
};

MessageAttachments.displayName = 'MessageAttachments';
