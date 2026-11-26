import { createContext, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Clickable, Tooltip } from '@discord-mana/components';
import { PencilIcon, TrashIcon, XSmallIcon } from '@discord-mana/icons';
import { ImageReadyState, MediaLayoutType, ObscureReason, SENSITIVE_OBSCURE_REASONS } from '../media/constants';
import { useMediaContext } from '../media/MediaContext';
import { Image } from '../media/Image/Image';
import { DownloadLink } from '../media/DownloadLink/DownloadLink';
import { ObscuredContent } from '../media/ObscuredContent/ObscuredContent';
import { fit, getRatio } from '../media/sizing';
import {
  isVisualMediaType,
  type MediaMosaicItemData,
  type MediaMosaicItemProps,
  type MediaMosaicItemType,
} from './types';
import styles from './MediaMosaicItem.module.css';
import hoverStyles from './HoverButtons.module.css';

/** Supplies the GIF favorite button the image renderer shows as its accessory. */
export const GifFavoriteButtonContext = createContext<() => ReactNode>(() => null);

GifFavoriteButtonContext.displayName = 'GifFavoriteButtonContext';

const useElementWidth = (ref: { current: HTMLElement | null }, onWidth: (width: number) => void) => {
  useLayoutEffect(() => {
    const node = ref.current;
    if (node == null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.borderBoxSize?.[0]?.inlineSize ?? parseFloat(window.getComputedStyle(node).width || '0');
      onWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, onWidth]);
};

export interface MediaMosaicHoverButtonsProps {
  /** `[type, subtype]` of the file. */
  mimeType: string[];
  downloadURL: string;
  onRemoveItem?: () => void;
  onEditItem?: () => void;
  showDownload: boolean;
  isVisualMediaType: boolean;
  type?: MediaMosaicItemType;
  isSingleMosaicItem?: boolean;
}

/** The edit / delete / download buttons in the top corner of a hovered attachment; as many as fit. */
export const MediaMosaicHoverButtons = ({
  mimeType,
  downloadURL,
  onRemoveItem,
  onEditItem,
  showDownload,
  isVisualMediaType: visual,
  type,
  isSingleMosaicItem,
}: MediaMosaicHoverButtonsProps) => {
  const { i18n } = useMediaContext();
  const sizerRef = useRef<HTMLDivElement>(null);
  const [fitCount, setFitCount] = useState(0);
  useElementWidth(
    sizerRef,
    useCallback((width: number) => setFitCount(Math.floor((width - 8) / 32)), []),
  );
  const singleClip = type === 'CLIP' && isSingleMosaicItem;
  const buttons: ReactNode[] = [];
  if (onEditItem != null && !singleClip)
    buttons.push(
      <Tooltip key="edit" text={i18n.MODIFY_ATTACHMENT}>
        <Clickable
          className={hoverStyles.hoverButton}
          focusProps={{ offset: 2 }}
          onClick={onEditItem}
          aria-label={i18n.MODIFY_ATTACHMENT}
        >
          <PencilIcon size="custom" color="currentColor" width={20} height={20} />
        </Clickable>
      </Tooltip>,
    );
  if (onRemoveItem != null)
    buttons.push(
      <Tooltip key="remove" text={i18n.DELETE}>
        <Clickable
          className={clsx(hoverStyles.hoverButton, styles.removeMosaicItemHoverButton)}
          focusProps={{ offset: 2 }}
          onClick={onRemoveItem}
          aria-label={i18n.REMOVE_MESSAGE_ATTACHMENT}
        >
          <TrashIcon size="custom" color="currentColor" width={20} height={20} />
        </Clickable>
      </Tooltip>,
    );
  if (showDownload && !singleClip)
    buttons.push(
      <Tooltip key="download" text={i18n.DOWNLOAD}>
        <DownloadLink
          target="_blank"
          rel="noreferrer noopener"
          className={hoverStyles.hoverButton}
          iconClassName={styles.downloadHoverButtonIcon}
          focusProps={{ offset: 2 }}
          href={downloadURL}
          mimeType={mimeType}
        />
      </Tooltip>,
    );
  const start = Math.max(0, buttons.length - fitCount);
  return (
    <>
      {fitCount > 0 && buttons.length > 0 && (
        <div className={clsx(hoverStyles.hoverButtonGroup, { [hoverStyles.nonMediaMosaicItem]: !visual })}>
          {buttons.slice(start)}
        </div>
      )}
      <div ref={sizerRef} className={hoverStyles.sizer} />
    </>
  );
};

MediaMosaicHoverButtons.displayName = 'MediaMosaicHoverButtons';

interface MediaMosaicItemContentProps<T, M> extends Omit<MediaMosaicItemProps<T, M>, 'getObscureReason'> {
  focusable: boolean;
  hiddenSpoilers: boolean;
  mediaLayoutType?: MediaLayoutType;
  maxWidth?: number;
  maxHeight?: number;
  useFullWidth?: boolean;
  isVisualMediaType: boolean;
  forcePlaceholder: boolean;
  isSingleMosaicItem?: boolean;
  imgContainerClassName?: string;
  imgClassName?: string;
  onVideoControlsShow?: () => void;
  onVideoControlsHide?: () => void;
}

const parseMimeType = (contentType: string | null | undefined) =>
  contentType != null && contentType.indexOf('/') !== -1 ? contentType.split('/') : ['unknown', 'unknown'];

const MediaMosaicItemContent = <T, M>({
  message,
  item,
  autoPlayGif,
  canRemoveItem,
  onRemoveItem,
  canEditItem,
  onEditItem,
  onClick,
  onSeekRequest,
  onOpenInMediaViewer,
  handlePreloadImage,
  onContextMenu,
  onPlay,
  renderImageComponent,
  renderVideoComponent,
  renderAudioComponent,
  renderPlaintextFilePreview,
  renderGenericFileComponent,
  renderVisualPlaceholderComponent,
  className,
  imgContainerClassName,
  imgClassName,
  focusable,
  hiddenSpoilers,
  mediaLayoutType,
  maxWidth,
  maxHeight,
  useFullWidth,
  isVisualMediaType: visual,
  onVideoControlsShow,
  onVideoControlsHide,
  forcePlaceholder,
  isSingleMosaicItem,
  allowFullScreen,
  shouldHideMediaOptions = false,
  gifFavoriteButton: _gifFavoriteButton,
}: MediaMosaicItemContentProps<T, M>) => {
  const { width, height, spoiler, type, contentType } = item;
  const [volumeVisible, setVolumeVisible] = useState(false);
  const mimeType = useMemo(() => parseMimeType(contentType), [contentType]);

  let tooSmall = false;
  if (visual) {
    if (width == null || height == null) tooSmall = true;
    const ratio = getRatio({
      width: width ?? 0,
      height: height ?? 0,
      maxWidth: maxWidth ?? 550,
      maxHeight: maxHeight ?? 350,
    });
    if (!useFullWidth && (ratio * (width ?? 0) < 40 || ratio * (height ?? 0) < 40)) tooSmall = true;
  }

  const handleRemove = () => onRemoveItem?.(item);
  const handleEdit = () => onEditItem?.(item);

  const renderAdjacentContent = () => {
    if (mediaLayoutType === MediaLayoutType.MOSAIC) {
      const showDownload = (!shouldHideMediaOptions && ['VIDEO', 'CLIP', 'AUDIO'].includes(type)) || type === 'OTHER';
      return tooSmall
        ? null
        : !volumeVisible && (
            <MediaMosaicHoverButtons
              mimeType={mimeType}
              downloadURL={item.downloadUrl}
              showDownload={showDownload}
              onRemoveItem={canRemoveItem ? handleRemove : undefined}
              onEditItem={canEditItem ? handleEdit : undefined}
              isVisualMediaType={visual}
              type={type}
              isSingleMosaicItem={isSingleMosaicItem}
            />
          );
    }
    return canRemoveItem ? <RemoveItemButton spoiler={spoiler} onClick={handleRemove} /> : null;
  };

  if (forcePlaceholder)
    return (
      <Image
        className={className}
        readyState={ImageReadyState.READY}
        src=""
        width={width ?? 350}
        height={height ?? 350}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        mediaLayoutType={mediaLayoutType}
        useFullWidth={useFullWidth}
        zoomable={false}
      />
    );

  switch (type) {
    case 'IMAGE':
      return (
        <GifFavoriteButtonContext.Consumer>
          {(renderAccessory) =>
            renderImageComponent({
              item,
              message,
              width,
              height,
              autoPlay: autoPlayGif && !hiddenSpoilers,
              onClick,
              onContextMenu,
              shouldHideMediaOptions,
              renderAccessory,
              renderAdjacentContent,
              containerClassName: className,
              className: imgContainerClassName,
              imageClassName: imgClassName,
              shouldLink: focusable,
              hiddenSpoilers,
              responsive: true,
              mediaLayoutType,
              maxWidth,
              maxHeight,
              useFullWidth,
              handlePreloadImage,
            })
          }
        </GifFavoriteButtonContext.Consumer>
      );
    case 'VIDEO':
    case 'CLIP':
      return renderVideoComponent({
        item,
        message,
        width,
        height,
        onClick,
        onSeekRequest,
        onOpenInMediaViewer,
        onContextMenu,
        renderAdjacentContent,
        naturalWidth: width,
        naturalHeight: height,
        className,
        playable: focusable,
        responsive: true,
        hiddenSpoilers,
        mediaLayoutType,
        maxWidth,
        maxHeight,
        useFullWidth,
        mimeType,
        onControlsShow: onVideoControlsShow,
        onControlsHide: onVideoControlsHide,
        downloadable: !shouldHideMediaOptions,
        isSingleMosaicItem,
        allowFullScreen,
        onPlay,
      });
    case 'VISUAL_PLACEHOLDER':
      if (renderVisualPlaceholderComponent == null) return null;
      return renderVisualPlaceholderComponent({
        item,
        message,
        className: imgContainerClassName,
        imageClassName: imgClassName,
        maxWidth,
        maxHeight,
        mediaLayoutType,
        useFullWidth,
      });
    case 'AUDIO':
      return renderAudioComponent({
        item,
        message,
        className,
        playable: focusable,
        mimeType,
        renderAdjacentContent,
        onVolumeShow: () => setVolumeVisible(true),
        onVolumeHide: () => setVolumeVisible(false),
        onPlay,
      });
    case 'PLAINTEXT_PREVIEW':
      return renderPlaintextFilePreview({ item, message, className, onClick, onContextMenu, renderAdjacentContent });
    case 'OTHER':
      return renderGenericFileComponent({ item, message, className, onClick, onContextMenu, renderAdjacentContent });
    case 'INVALID':
      return null;
  }
};

MediaMosaicItemContent.displayName = 'MediaMosaicItemContent';

const RemoveItemButton = ({ spoiler, onClick }: { spoiler: boolean; onClick: () => void }) => {
  const { i18n } = useMediaContext();
  return (
    <Clickable
      className={
        spoiler
          ? clsx(styles.spoilerRemoveMosaicItemButton, styles.removeMosaicItemButton)
          : styles.removeMosaicItemButton
      }
      focusProps={{ offset: { bottom: 4 } }}
      onClick={onClick}
      aria-label={i18n.REMOVE_MESSAGE_ATTACHMENT}
    >
      <XSmallIcon size="xs" color="currentColor" />
    </Clickable>
  );
};

RemoveItemButton.displayName = 'RemoveItemButton';

// The sensitive-content overlay needs room for its label; smaller media fill the overlay instead.
const isTooSmallForObscureWarning = (width?: number | null, height?: number | null) =>
  width != null && height != null && (width <= 146 || height <= 212);

const getObscuredContainerStyles = (
  item: MediaMosaicItemData,
  noJustify: boolean,
  mediaLayoutType?: MediaLayoutType,
) => {
  if (!noJustify) return undefined;
  let maxWidth: number | string | undefined | null = item.width;
  if (item.width != null && item.height != null)
    maxWidth = fit({ width: item.width, height: item.height, maxWidth: 400, maxHeight: 300 }).width;
  return {
    ...(mediaLayoutType !== MediaLayoutType.MOSAIC && { maxWidth: maxWidth ?? '400px' }),
    width: '100%',
    height: '100%',
    justifySelf: 'auto',
  };
};

export interface MediaMosaicItemWrapperProps<T = unknown, M = unknown> extends MediaMosaicItemProps<T, M> {
  mediaLayoutType?: MediaLayoutType;
  useFullWidth?: boolean;
  isSingleMosaicItem?: boolean;
  displayGridItem?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  imgContainerClassName?: string;
  imgClassName?: string;
}

/** One attachment of the mosaic: spoiler / sensitive overlay, the media itself and its hover actions. */
export const MediaMosaicItem = <T, M>({
  className,
  item,
  message,
  getObscureReason,
  useFullWidth,
  mediaLayoutType,
  isSingleMosaicItem,
  displayGridItem,
  ...props
}: MediaMosaicItemWrapperProps<T, M>) => {
  const { width, height, type } = item;
  const reason = getObscureReason(item, message);
  const [lastReason, setLastReason] = useState(reason);
  const [obscured, setObscured] = useState(reason != null);
  if (reason !== lastReason) {
    setLastReason(reason);
    setObscured(reason != null);
  }
  const mosaic = mediaLayoutType === MediaLayoutType.MOSAIC;
  const inline = !mosaic && ((width != null && width < 200) || (height != null && height < 50));
  const noJustify = type === 'IMAGE' || type === 'VIDEO' || type === 'CLIP';
  const visual = isVisualMediaType(type);
  const fillsObscureOverlay =
    isSingleMosaicItem &&
    reason != null &&
    SENSITIVE_OBSCURE_REASONS.has(reason) &&
    isTooSmallForObscureWarning(width, height);
  const [videoControlsVisible, setVideoControlsVisible] = useState(false);

  const renderContent = (hiddenSpoilers = false) => (
    <MediaMosaicItemContent
      {...props}
      item={item}
      message={message}
      isSingleMosaicItem={isSingleMosaicItem}
      hiddenSpoilers={hiddenSpoilers}
      className={clsx(className, styles.mosaicItemContent, {
        [styles.obscured]: obscured && !inline,
        [styles.hiddenSpoiler]: obscured && reason === ObscureReason.SPOILER,
        [styles.hiddenExplicit]: obscured && reason != null && SENSITIVE_OBSCURE_REASONS.has(reason),
        [styles.hiddenMosaicItem]: obscured && hiddenSpoilers,
        [styles.inline]: obscured && inline,
      })}
      focusable={!hiddenSpoilers}
      mediaLayoutType={mediaLayoutType}
      useFullWidth={(!!fillsObscureOverlay && hiddenSpoilers) || useFullWidth}
      isVisualMediaType={visual}
      onVideoControlsShow={() => setVideoControlsVisible(true)}
      onVideoControlsHide={() => setVideoControlsVisible(false)}
      forcePlaceholder={false}
    />
  );

  return (
    <div
      style={displayGridItem ? { minWidth: 0, width: `${props.maxWidth}px` } : undefined}
      className={clsx(styles.mosaicItem, {
        [styles.mosaicItemNoJustify]: noJustify,
        [styles.mosaicItemFullWidth]: useFullWidth,
        [styles.mosaicItemMediaMosaic]: mosaic,
        [styles.hideOverflow]: mosaic && visual,
      })}
    >
      {reason != null ? (
        <ObscuredContent
          type={ObscuredContent.Types.ATTACHMENT}
          inline={inline}
          reason={reason}
          isSingleMosaicItem={isSingleMosaicItem}
          obscured={obscured}
          containerStyles={getObscuredContainerStyles(item as MediaMosaicItemData, noJustify, mediaLayoutType)}
          obscurityControlClassName={clsx({
            [styles.obscureVideoSpacing]: type === 'VIDEO' && isSingleMosaicItem && !obscured && videoControlsVisible,
          })}
          onToggleObscurity={() => setObscured((current) => !current)}
        >
          {(hidden) => renderContent(hidden)}
        </ObscuredContent>
      ) : (
        renderContent()
      )}
    </div>
  );
};

MediaMosaicItem.displayName = 'MediaMosaicItem';
