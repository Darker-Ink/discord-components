import { useContext, useMemo, type ReactNode } from 'react';
import { createMediaViewerHandlers } from '../attachments/attachmentMedia';
import { MediaContext } from '../media/MediaContext';
import { MediaInteractionContext } from '../media/MediaInteractionContext';
import { getAttachmentSrc } from '../media/mediaUrl';
import type { MediaViewerItem } from '../media/mediaViewerTypes';
import { preloadZoomedImage } from '../media/preload';
import { MediaMosaic } from '../MediaMosaic/MediaMosaic';
import type { MediaMosaicItemProps } from '../MediaMosaic/types';
import type { EmbedSourceMetadata, RenderImageComponent } from './renderProps';
import type { EmbedMedia, EmbedMessage } from './types';
import styles from './Embed.module.css';

export interface EmbedGalleryProps {
  images: EmbedMedia[];
  message: EmbedMessage;
  autoPlayGif?: boolean;
  hiddenSpoiler: boolean;
  isVisible: boolean;
  sourceMetadata: EmbedSourceMetadata;
  renderImageComponent: RenderImageComponent;
  /** Alt text for images without a description. */
  defaultAlt: string;
  /** The GIF favourite star for an image (needs the app's favourites). */
  renderGifFavoriteButton?: (image: EmbedMedia) => () => ReactNode;
}

const noop = () => null;

const preloadViewerItem = (item: MediaViewerItem, hasMultiple: boolean) =>
  preloadZoomedImage({
    src: getAttachmentSrc({ proxyURL: item.proxyUrl ?? undefined, url: item.url }),
    width: item.width ?? 0,
    height: item.height ?? 0,
    hasMultiple,
    options: { srcIsAnimated: item.srcIsAnimated, original: item.original },
  });

/** Images merged from embeds that share a url, laid out in the media mosaic. */
export const EmbedGallery = ({
  images,
  message,
  autoPlayGif,
  hiddenSpoiler,
  isVisible,
  sourceMetadata,
  renderImageComponent,
  defaultAlt,
  renderGifFavoriteButton,
}: EmbedGalleryProps) => {
  const { disableAnimations } = useContext(MediaInteractionContext);
  const { openMediaViewer } = useContext(MediaContext);
  const { srcToOnClickOverride, srcToHandlePreloadImage } = useMemo(
    () =>
      createMediaViewerHandlers(
        images.map((image): MediaViewerItem => ({
          type: 'IMAGE',
          url: image.url,
          proxyUrl: image.proxyURL,
          width: image.width,
          height: image.height,
          placeholder: image.placeholder,
          placeholderVersion: image.placeholderVersion,
          sourceMetadata,
          contentType: image.contentType,
          original: image.url,
          srcIsAnimated: image.srcIsAnimated,
        })),
        {},
        openMediaViewer,
        preloadViewerItem,
        'Embed',
      ),
    [images, sourceMetadata, openMediaViewer],
  );
  const items = useMemo(
    () =>
      images.map((image, index): MediaMosaicItemProps<EmbedMedia, EmbedMessage> => {
        const src = getAttachmentSrc(image);
        const hasAlt = image.description != null && image.description !== '';
        return {
          message,
          item: {
            uniqueId: `${image.url}--${index}`,
            originalItem: image,
            type: 'IMAGE',
            downloadUrl: image.url,
            width: image.width,
            height: image.height,
            srcIsAnimated: image.srcIsAnimated,
            spoiler: false,
          },
          autoPlayGif: !!autoPlayGif && !disableAnimations && !hiddenSpoiler,
          onClick: srcToOnClickOverride[src],
          handlePreloadImage: srcToHandlePreloadImage[src],
          getObscureReason: () => null,
          renderImageComponent: (props) =>
            renderImageComponent({
              ...(props as unknown as Parameters<RenderImageComponent>[0]),
              src,
              original: image.url,
              alt: hasAlt ? image.description : defaultAlt,
              disableAltTextDisplay: !hasAlt,
              mosaicStyleAlt: true,
              placeholder: image.placeholder,
              placeholderVersion: image.placeholderVersion,
              srcIsAnimated: image.srcIsAnimated,
              hiddenSpoilers: hiddenSpoiler,
              shouldLink: isVisible && (props.shouldLink as boolean | undefined),
              sourceMetadata,
              analyticsSource: 'Embed',
            }),
          renderVideoComponent: noop,
          renderAudioComponent: noop,
          renderPlaintextFilePreview: noop,
          renderGenericFileComponent: noop,
          gifFavoriteButton: renderGifFavoriteButton?.(image),
          canRemoveItem: false,
          canEditItem: false,
          onRemoveItem: noop,
          onEditItem: noop,
        };
      }),
    [
      images,
      message,
      autoPlayGif,
      disableAnimations,
      hiddenSpoiler,
      isVisible,
      srcToOnClickOverride,
      srcToHandlePreloadImage,
      sourceMetadata,
      renderImageComponent,
      defaultAlt,
      renderGifFavoriteButton,
    ],
  );
  return (
    <div className={styles.embedMedia}>
      <MediaMosaic hideClipMessageNotice items={items} />
    </div>
  );
};

EmbedGallery.displayName = 'EmbedGallery';
