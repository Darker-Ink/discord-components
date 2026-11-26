import { useMemo, useRef, type MouseEvent, type Ref } from 'react';
import clsx from 'clsx';
import { Tooltip } from '@discord-components/components';
import { MediaMosaic } from '../MediaMosaic/MediaMosaic';
import type {
  MediaMosaicImageRenderProps,
  MediaMosaicItemData,
  MediaMosaicItemProps,
  MediaMosaicItemType,
  MediaMosaicRenderProps,
  MediaMosaicVideoRenderProps,
} from '../MediaMosaic/types';
import { ImageReadyState, ObscureReason } from '../media/constants';
import { useMediaContext } from '../media/MediaContext';
import { Image } from '../media/Image/Image';
import { MediaImage, MediaVideoWithAltText } from '../media/MediaRenderers/MediaRenderers';
import { getAttachmentSrc, isImageLoaded, loadImage, toURLSafe } from '../media/mediaUrl';
import { hasDimensions } from '../media/sizing';
import { preloadZoomedImage } from '../media/preload';
import type { MediaViewerItem } from '../media/mediaViewerTypes';
import { createMediaViewerHandlers, isImageContentType, isVideoContentType } from '../attachments/attachmentMedia';
import styles from './MediaGalleryPlaceholder.module.css';

export const UnfurledMediaItemLoadingState = {
  UNKNOWN: 0,
  LOADING: 1,
  LOADED_SUCCESS: 2,
  LOADED_NOT_FOUND: 3,
} as const;

export const UnfurledMediaItemFlags = {
  IsAnimated: 1 << 0,
} as const;

/** An unfurled media item of a Components v2 message, as the API sends it. */
export interface APIUnfurledMediaItem {
  url: string;
  proxy_url?: string;
  width?: number | null;
  height?: number | null;
  content_type?: string;
  original_content_type?: string;
  placeholder?: string;
  placeholder_version?: number;
  loading_state?: number;
  flags?: number;
  attachment_id?: string;
}

export interface APIMediaGalleryItem {
  media: APIUnfurledMediaItem;
  description?: string | null;
  spoiler?: boolean;
}

/** The client's record for unfurled media (camelCase). */
export interface UnfurledMediaItem {
  url: string;
  proxyUrl: string;
  width?: number | null;
  height?: number | null;
  placeholder?: string;
  placeholderVersion?: number;
  contentType?: string;
  originalContentType?: string;
  loadingState?: number;
  flags: number;
}

export interface MediaGalleryItem {
  media: UnfurledMediaItem;
  description?: string | null;
  spoiler: boolean;
}

/** Converts API unfurled media to the client's record (the client's `toUnfurledMediaItem`). */
export const createUnfurledMediaItem = (media: APIUnfurledMediaItem): UnfurledMediaItem => ({
  url: media.url,
  proxyUrl: media.proxy_url ?? media.url,
  height: media.height,
  width: media.width,
  placeholder: media.placeholder,
  placeholderVersion: media.placeholder_version,
  contentType: media.content_type,
  originalContentType: media.original_content_type,
  loadingState: media.loading_state,
  flags: media.flags ?? 0,
});

/** Gallery media renders as an image or video when the content type says so and it has a size. */
export const getUnfurledMediaMosaicType = ({ contentType, width, height }: UnfurledMediaItem): MediaMosaicItemType => {
  if (width != null && width > 0 && height != null && height > 0) {
    if (isImageContentType(contentType)) return 'IMAGE';
    if (isVideoContentType(contentType)) return 'VIDEO';
  }
  return 'VISUAL_PLACEHOLDER';
};

const getViewerType = (media: UnfurledMediaItem) =>
  isImageContentType(media.contentType)
    ? 'IMAGE'
    : isVideoContentType(media.contentType) && toURLSafe(media.proxyUrl, window.location.href) != null
      ? 'VIDEO'
      : 'INVALID';

const isAnimated = (media: UnfurledMediaItem) =>
  (media.flags & UnfurledMediaItemFlags.IsAnimated) === UnfurledMediaItemFlags.IsAnimated;

/** The media viewer item for gallery media. */
export const unfurledMediaToMediaViewerItem = (media: UnfurledMediaItem, message?: unknown) => ({
  ...media,
  type: getViewerType(media),
  original: media.url,
  srcIsAnimated: isAnimated(media),
  sourceMetadata: { message },
});

const BrokenImageIcon = ({ className, ref }: { className?: string; ref?: Ref<SVGSVGElement> }) => (
  <svg aria-hidden role="img" ref={ref} width={24} height={24} viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M21 5V11.59L18 8.59L14 12.59L10 8.59L6 12.59L3 9.59V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5ZM18 11.42L21 14.42V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V12.42L6 15.42L10 11.42L14 15.42L18 11.42Z"
    />
  </svg>
);

BrokenImageIcon.displayName = 'BrokenImageIcon';

/** Gallery media that is still loading, failed, or was not found. */
export const MediaGalleryPlaceholder = (props: MediaMosaicRenderProps<MediaGalleryItem>) => {
  const media = props.item.originalItem.media;
  const { i18n } = useMediaContext();
  const iconRef = useRef<SVGSVGElement>(null);
  if (media.loadingState === UnfurledMediaItemLoadingState.LOADED_NOT_FOUND)
    return (
      <Tooltip
        text={i18n.IMAGE_NOT_FOUND}
        position="bottom"
        align="center"
        targetElementRef={iconRef as Ref<HTMLElement>}
      >
        <div
          className={clsx(props.className, styles.notFoundPlaceholder, {
            [styles.hiddenSpoilers]: props.hiddenSpoilers,
          })}
          style={{ width: 350, height: 350 }}
          role="img"
        >
          <BrokenImageIcon ref={iconRef} className={styles.brokenImageIcon} />
        </div>
      </Tooltip>
    );
  return (
    <Image
      className={clsx(props.className, { [styles.hiddenSpoilers]: props.hiddenSpoilers })}
      readyState={
        media.loadingState === UnfurledMediaItemLoadingState.LOADING ? ImageReadyState.LOADING : ImageReadyState.ERROR
      }
      src=""
      width={350}
      height={350}
      maxWidth={props.maxWidth}
      maxHeight={props.maxHeight}
      mediaLayoutType={props.mediaLayoutType}
      useFullWidth={props.useFullWidth}
      zoomable={false}
    />
  );
};

MediaGalleryPlaceholder.displayName = 'MediaGalleryPlaceholder';

export const renderGalleryImage = (props: MediaMosaicImageRenderProps<MediaGalleryItem>) => {
  const { item, message, width, height, onClick, ...rest } = props;
  const media = item.originalItem.media;
  return (
    <MediaImage
      {...(rest as object)}
      width={width ?? 0}
      height={height ?? 0}
      onClick={onClick as never}
      alt={item.originalItem.description}
      src={media.proxyUrl}
      original={media.url}
      placeholder={media.placeholder}
      placeholderVersion={media.placeholderVersion}
      contentType={media.contentType}
      originalContentType={media.originalContentType}
      sourceMetadata={{ message }}
      analyticsSource="renderImageComponentForGalleryItem"
      srcIsAnimated={item.srcIsAnimated}
    />
  );
};

export const renderGalleryVideo = (props: MediaMosaicVideoRenderProps<MediaGalleryItem>) => {
  const {
    item,
    message,
    width,
    height,
    naturalWidth,
    naturalHeight,
    onClick,
    onSeekRequest: _onSeekRequest,
    onOpenInMediaViewer: _onOpenInMediaViewer,
    isSingleMosaicItem: _isSingleMosaicItem,
    ...rest
  } = props;
  const media = item.originalItem.media;
  const poster = toURLSafe(media.proxyUrl, window.location.href);
  if (poster == null) return null;
  poster.searchParams.append('format', 'webp');
  return (
    <MediaVideoWithAltText
      {...(rest as object)}
      width={width ?? 0}
      height={height ?? 0}
      naturalWidth={naturalWidth ?? 0}
      naturalHeight={naturalHeight ?? 0}
      onClick={onClick as never}
      poster={poster.toString()}
      alt={item.originalItem.description ?? undefined}
      src={media.proxyUrl}
      placeholder={media.placeholder}
      placeholderVersion={media.placeholderVersion}
      sourceMetadata={{ message }}
    />
  );
};

const renderNothing = () => null;

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

export interface MediaGalleryProps<M = unknown> {
  /** The gallery component's `items` (API format). */
  items: APIMediaGalleryItem[];
  /** The message the gallery belongs to; passed through to renderers and the media viewer. */
  message?: M;
  /** Overrides why an item is hidden; defaults to the item's `spoiler`. */
  getObscureReason?: (item: MediaMosaicItemData<MediaGalleryItem>) => ObscureReason | null;
  shouldHideMediaOptions?: boolean;
  onMediaItemContextMenu?: (event: MouseEvent<HTMLElement>, media: UnfurledMediaItem) => void;
  renderGifFavoriteButton?: (
    media: UnfurledMediaItem,
  ) => ReturnType<NonNullable<MediaMosaicItemProps['gifFavoriteButton']>>;
}

const getGalleryObscureReason = (item: MediaMosaicItemData<MediaGalleryItem>) =>
  item.originalItem.spoiler ? ObscureReason.SPOILER : null;

/** Components v2's Media Gallery: the attachment mosaic at Components v2 width (up to 600px). */
export const MediaGallery = <M,>({
  items: apiItems,
  message,
  getObscureReason = getGalleryObscureReason,
  shouldHideMediaOptions = false,
  onMediaItemContextMenu,
  renderGifFavoriteButton,
}: MediaGalleryProps<M>) => {
  const { gifAutoPlay, openMediaViewer } = useMediaContext();
  const items = useMemo(() => {
    const galleryItems: MediaGalleryItem[] = apiItems.map((item) => ({
      media: createUnfurledMediaItem(item.media),
      description: item.description,
      spoiler: item.spoiler ?? false,
    }));
    const viewerItems = galleryItems
      .map((item) => unfurledMediaToMediaViewerItem(item.media, message))
      .filter(
        (item): item is MediaViewerItem & ReturnType<typeof unfurledMediaToMediaViewerItem> => item.type !== 'INVALID',
      );
    const handlers =
      viewerItems.length > 1
        ? createMediaViewerHandlers(
            viewerItems as MediaViewerItem[],
            { shouldHideMediaOptions },
            openMediaViewer,
            preloadViewerItem,
            'Media Mosaic',
          )
        : { srcToOnClickOverride: {}, srcToHandlePreloadImage: {}, srcToSeekOverride: {} };
    return galleryItems.map((galleryItem, index): MediaMosaicItemProps<MediaGalleryItem, M | undefined> => {
      const { media } = galleryItem;
      const props: MediaMosaicItemProps<MediaGalleryItem, M | undefined> = {
        message,
        item: {
          uniqueId: `${media.proxyUrl}--${index}`,
          originalItem: galleryItem,
          type: getUnfurledMediaMosaicType(media),
          downloadUrl: media.url,
          height: media.height,
          width: media.width,
          spoiler: galleryItem.spoiler,
          contentType: media.contentType,
          srcIsAnimated: isAnimated(media),
        },
        onContextMenu: onMediaItemContextMenu != null ? (event) => onMediaItemContextMenu(event, media) : undefined,
        autoPlayGif: gifAutoPlay,
        getObscureReason: (item) => getObscureReason(item),
        renderImageComponent: renderGalleryImage as MediaMosaicItemProps<
          MediaGalleryItem,
          M | undefined
        >['renderImageComponent'],
        renderVideoComponent: renderGalleryVideo as MediaMosaicItemProps<
          MediaGalleryItem,
          M | undefined
        >['renderVideoComponent'],
        renderVisualPlaceholderComponent: MediaGalleryPlaceholder as MediaMosaicItemProps<
          MediaGalleryItem,
          M | undefined
        >['renderVisualPlaceholderComponent'],
        renderAudioComponent: renderNothing,
        renderPlaintextFilePreview: renderNothing,
        renderGenericFileComponent: renderNothing,
        gifFavoriteButton: renderGifFavoriteButton != null ? () => renderGifFavoriteButton(media) : undefined,
        onPlay: () => {},
        canRemoveItem: false,
        canEditItem: false,
        onRemoveItem: () => {},
        onEditItem: () => {},
        shouldHideMediaOptions,
      };
      const src = getAttachmentSrc({ proxyURL: media.proxyUrl, url: media.url });
      if (src in handlers.srcToOnClickOverride) {
        props.onClick = handlers.srcToOnClickOverride[src] as MediaMosaicItemProps['onClick'];
        props.handlePreloadImage = handlers.srcToHandlePreloadImage[src];
        props.onSeekRequest = handlers.srcToSeekOverride[src];
      }
      return props;
    });
  }, [
    apiItems,
    message,
    shouldHideMediaOptions,
    openMediaViewer,
    gifAutoPlay,
    getObscureReason,
    onMediaItemContextMenu,
    renderGifFavoriteButton,
  ]);
  return (
    <div>
      <MediaMosaic items={items} isInAppComponentsV2 hideClipMessageNotice />
    </div>
  );
};

MediaGallery.displayName = 'MediaGallery';
