import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { useSpringValue } from '@react-spring/web';
import {
  AccessibilityPreferencesContext,
  Clickable,
  ComponentActions,
  ModalAnimation,
  ModalRoot,
  ModalSize,
  windowDispatch,
  IconButton,
  ModalTransitionState,
  ScrollerThin,
  Stack,
  ThemeProvider,
  Tooltip,
  type ModalTransitionStateValue,
} from '@discord-components/components';
import {
  ArrowLargeLeftIcon,
  ArrowLargeRightIcon,
  DownloadIcon,
  ImageWarningIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MoreHorizontalIcon,
  WindowLaunchIcon,
  XSmallIcon,
  type IconProps,
} from '@discord-components/icons';
import { ThemeTypes } from '@discord-components/tokens';
import { MediaLayoutType } from '../media/constants';
import { useMediaContext } from '../media/MediaContext';
import { LazyImage } from '../media/LazyImage/LazyImage';
import { Video } from '../media/MediaPlayer/Video';
import { getAttachmentSrc, isImageLoaded, loadImage } from '../media/mediaUrl';
import { getMediaViewerMaxSize, preloadZoomedImage } from '../media/preload';
import { hasDimensions } from '../media/sizing';
import type { MediaViewerItem } from '../media/mediaViewerTypes';
import { MediaViewerChrome, MediaViewerChromeMode } from './MediaViewerChrome';
import {
  MediaViewerMedia,
  getOriginalMediaUrl,
  getVideoPosterUrl,
  isDiscordAssetUrl,
  type MediaViewerPlaybackHandle,
} from './MediaViewerMedia';
import { MediaViewerZoomContext, type MediaViewerZoomContextValue } from './MediaViewerZoomContext';
import modalStyles from './MediaViewerModal.module.css';
import mediaStyles from './Media.module.css';
import carouselStyles from './Carousel.module.css';
import thumbnailStyles from './Thumbnails.module.css';
import navButtonStyles from './NavButton.module.css';
import toolbarStyles from './Toolbar.module.css';
import headerStyles from './Header.module.css';

const ZOOM_SCALE = 2.5;
const wrapIndex = (index: number, length: number) => ((index % length) + length) % length;

const preloadItem = (item: MediaViewerItem, hasMultiple: boolean) => {
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

/** The square buttons of the viewer: previous / next and close. */
const NavButton = ({
  onClick,
  icon: Icon,
  tooltip,
  className,
}: {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  icon: ComponentType<IconProps>;
  tooltip: string;
  className?: string;
}) => (
  <Tooltip text={tooltip} position="bottom">
    <Clickable onClick={onClick} aria-label={tooltip} className={clsx(navButtonStyles.button, className)}>
      <div className={navButtonStyles.buttonInner}>
        <Icon color="currentColor" size="custom" width={20} height={20} />
      </div>
    </Clickable>
  </Tooltip>
);

NavButton.displayName = 'MediaViewerNavButton';

const MediaArea = memo(
  ({
    items,
    currentIndex,
    children,
  }: {
    items: MediaViewerItem[];
    currentIndex: number;
    children: (maxWidth: number, maxHeight: number) => ReactNode;
  }) => {
    const item = items[currentIndex];
    const hasMultiple = items.length > 1;
    const [, setResizeCount] = useState(0);
    const size = getMediaViewerMaxSize(hasMultiple, {
      width: item.width ?? undefined,
      height: item.height ?? undefined,
    });
    useEffect(() => {
      const handleResize = () => setResizeCount((count) => count + 1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Neighbours are fetched ahead so stepping through the carousel is instant.
    useEffect(() => {
      if (items.length > 1) {
        preloadItem(items[wrapIndex(currentIndex - 1, items.length)], true);
        if (items.length > 2) preloadItem(items[wrapIndex(currentIndex + 1, items.length)], true);
      }
    }, [currentIndex, items]);
    return (
      <MediaViewerChrome mode={MediaViewerChromeMode.PINNED}>
        {(className) => (
          <div className={clsx(mediaStyles.mediaArea, className)}>
            <div key={item.url}>{size.width > 0 && size.height > 0 && children(size.width, size.height)}</div>
          </div>
        )}
      </MediaViewerChrome>
    );
  },
);

MediaArea.displayName = 'MediaViewerMediaArea';

const thumbnailId = (index: number) => `media-view-scroll-thumbnail-${index}`;

const Thumbnail = memo(({ item, obscured }: { item: MediaViewerItem & { poster?: string }; obscured: boolean }) => {
  const src =
    item.type === 'IMAGE'
      ? getAttachmentSrc({ proxyURL: item.proxyUrl, url: item.url })
      : item.type === 'VIDEO'
        ? (item.poster ?? (item.proxyUrl != null ? getVideoPosterUrl(item.proxyUrl) : null))
        : null;
  if (src == null && item.type === 'VIDEO')
    return (
      <Video src={`${item.url}#t=1`} preload="metadata" muted style={{ width: 40, height: 40, objectFit: 'cover' }} />
    );
  if (src == null) return null;
  if (obscured)
    return (
      <Stack align="center" justify="center" className={thumbnailStyles.obscured} style={{ width: 40, height: 40 }}>
        <ImageWarningIcon size="sm" color="white" />
      </Stack>
    );
  return (
    <LazyImage
      width={item.width ?? 40}
      height={item.height ?? 40}
      maxWidth={40}
      maxHeight={40}
      useFullWidth
      src={src}
      shouldAnimate={false}
      shouldRenderAccessory={false}
      srcIsAnimated={item.srcIsAnimated}
      alt={item.alt}
      mediaLayoutType={MediaLayoutType.MOSAIC}
    />
  );
});

Thumbnail.displayName = 'MediaViewerThumbnail';

const Thumbnails = ({
  items,
  currentIndex,
  onGalleryItemClick,
  className,
  isObscured,
}: {
  items: MediaViewerItem[];
  currentIndex: number;
  onGalleryItemClick: (index: number) => void;
  className?: string;
  isObscured: (item: MediaViewerItem) => boolean;
}) => {
  const { i18n } = useMediaContext();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  useLayoutEffect(() => {
    const node = document.getElementById(thumbnailId(currentIndex));
    const scroller = scrollerRef.current;
    if (scroller == null || node == null) return;
    // Keeps the current thumbnail in view with 20px to spare.
    const padding = 20;
    const left = node.offsetLeft - scroller.offsetLeft;
    const right = left + node.offsetWidth;
    let target = scroller.scrollLeft;
    if (left - padding < scroller.scrollLeft) target = left - padding;
    else if (right + padding > scroller.scrollLeft + scroller.clientWidth)
      target = right + padding - scroller.clientWidth;
    if (target !== scroller.scrollLeft)
      scroller.scrollTo({ left: target, behavior: reducedMotion.enabled ? 'auto' : 'smooth' });
  }, [currentIndex, reducedMotion.enabled]);
  return (
    <div className={clsx(thumbnailStyles.galleryContainer, className)}>
      <ScrollerThin
        orientation="horizontal"
        className={clsx(thumbnailStyles.gallery, className)}
        ref={scrollerRef}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item, index) => {
          const current = index === currentIndex;
          return (
            <Clickable
              key={index}
              id={thumbnailId(index)}
              className={clsx(thumbnailStyles.galleryItem, {
                [thumbnailStyles.inactive]: !current,
                [thumbnailStyles.first]: index === 0,
                [thumbnailStyles.last]: index === items.length - 1,
              })}
              aria-label={
                current
                  ? i18n.MEDIA_VIEWER_ITEM_CURRENT(index + 1, items.length)
                  : i18n.MEDIA_VIEWER_ITEM(index + 1, items.length)
              }
              onClick={() => onGalleryItemClick(index)}
            >
              <Thumbnail item={item} obscured={isObscured(item)} />
            </Clickable>
          );
        })}
      </ScrollerThin>
    </div>
  );
};

Thumbnails.displayName = 'MediaViewerThumbnails';

const ObscureWrapper = ({
  children,
  isObscured,
}: {
  children: (obscured: boolean) => ReactNode;
  isObscured: boolean;
  src: string;
}) => {
  // Sensitive-media detection needs the client's content scanning; nothing is obscured here.
  if (isObscured)
    return <div className={clsx(carouselStyles.obscureWrapper, carouselStyles.obscure)}>{children(true)}</div>;
  return <>{children(false)}</>;
};

ObscureWrapper.displayName = 'MediaViewerObscureWrapper';

export interface MediaViewerCarouselProps {
  items: MediaViewerItem[];
  startIndex?: number;
  onIndexChange?: (index: number) => void;
  shouldHideMediaOptions?: boolean;
  /** Whether an item is sensitive media to show blurred (the client asks its content scanner). */
  isItemObscured?: (item: MediaViewerItem) => boolean;
}

const NEVER_OBSCURED = () => false;

/** The media, the previous/next buttons and the thumbnail strip. Arrow keys and Space navigate. */
export const MediaViewerCarousel = ({
  items,
  startIndex = 0,
  onIndexChange,
  shouldHideMediaOptions = false,
  isItemObscured = NEVER_OBSCURED,
}: MediaViewerCarouselProps) => {
  const { i18n } = useMediaContext();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const indexRef = useRef(startIndex);
  const { zoomed, setZoomed } = useContext(MediaViewerZoomContext);
  const playbackRef = useRef<MediaViewerPlaybackHandle>(null);

  const goTo = useCallback(
    (index: number) => {
      const next = wrapIndex(index, items.length);
      setCurrentIndex(next);
      indexRef.current = next;
      onIndexChange?.(next);
      setZoomed(false);
    },
    [onIndexChange, items, setZoomed],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]') != null) return;
      if (event.key === 'ArrowRight') goTo(indexRef.current + 1);
      else if (event.key === 'ArrowLeft') goTo(indexRef.current - 1);
      else if (event.key === ' ') {
        // Space plays/pauses videos and otherwise moves on.
        const playback = playbackRef.current;
        if (playback?.hasPlayback() !== true) goTo(indexRef.current + 1);
        else if (!event.repeat) playback.togglePlayback();
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goTo]);

  const item = items[currentIndex];
  const obscured = isItemObscured(item);
  const handleContextMenu = shouldHideMediaOptions
    ? (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        event.preventDefault();
      }
    : undefined;
  const hasMultiple = items.length > 1;

  return (
    <>
      <MediaViewerChrome>
        {(className) =>
          hasMultiple ? (
            <>
              <NavButton
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(indexRef.current - 1);
                }}
                icon={ArrowLargeLeftIcon}
                tooltip={i18n.PREVIOUS}
                className={clsx(carouselStyles.navPrev, carouselStyles.nav, className)}
              />
              <NavButton
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(indexRef.current + 1);
                }}
                icon={ArrowLargeRightIcon}
                tooltip={i18n.NEXT}
                className={clsx(carouselStyles.navNext, carouselStyles.nav, className)}
              />
            </>
          ) : undefined
        }
      </MediaViewerChrome>
      <MediaArea items={items} currentIndex={currentIndex}>
        {(maxWidth, maxHeight) => (
          <ObscureWrapper isObscured={!zoomed && obscured} src={item.url}>
            {(hidden) => (
              <MediaViewerMedia
                media={item}
                playbackRef={playbackRef}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                obscured={hidden}
                onContextMenu={handleContextMenu}
              />
            )}
          </ObscureWrapper>
        )}
      </MediaArea>
      {hasMultiple && (
        <MediaViewerChrome>
          {(className) => (
            <Thumbnails
              items={items}
              currentIndex={currentIndex}
              onGalleryItemClick={goTo}
              className={className}
              isObscured={isItemObscured}
            />
          )}
        </MediaViewerChrome>
      )}
    </>
  );
};

MediaViewerCarousel.displayName = 'MediaViewerCarousel';

const ToolbarButton = ({
  tooltipText,
  icon,
  onClick,
  buttonRef,
}: {
  tooltipText: string;
  icon: ComponentType<IconProps>;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) => (
  <Tooltip text={tooltipText} position="bottom" asContainer>
    <IconButton
      variant="icon-only"
      aria-label={tooltipText}
      size="sm"
      icon={icon}
      onClick={onClick}
      buttonRef={buttonRef}
    />
  </Tooltip>
);

ToolbarButton.displayName = 'MediaViewerToolbarButton';

const ZoomButton = () => {
  const { i18n } = useMediaContext();
  const { zoomed, setZoomed } = useContext(MediaViewerZoomContext);
  return (
    <ToolbarButton
      onClick={() => setZoomed(!zoomed)}
      tooltipText={zoomed ? i18n.ZOOM_OUT : i18n.ZOOM_IN}
      icon={zoomed ? MagnifyingGlassMinusIcon : MagnifyingGlassPlusIcon}
    />
  );
};

ZoomButton.displayName = 'MediaViewerZoomButton';

// The original file when the item came through the media proxy, as the client opens/saves it.
const getSourceUrl = (item: MediaViewerItem) => {
  const original = item.original ?? item.url;
  return /\.discordapp\.(net|com)$/.test(new URL(item.url, window.location.href).hostname) ? original : item.url;
};

const openUrl = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

// Videos can be saved on the web; images only from the desktop app's native save dialog.
const DownloadButton = ({ item }: { item: MediaViewerItem }) => {
  const { i18n } = useMediaContext();
  if (item.type !== 'VIDEO') return null;
  const href = getOriginalMediaUrl(getSourceUrl(item), 'png');
  return <ToolbarButton onClick={() => openUrl(href)} tooltipText={i18n.SAVE_VIDEO} icon={DownloadIcon} />;
};

DownloadButton.displayName = 'MediaViewerDownloadButton';

const OPENABLE_PROTOCOLS = new Set(['http:', 'https:']);

const OpenInBrowserButton = ({ item }: { item: MediaViewerItem }) => {
  const { i18n } = useMediaContext();
  const source = getSourceUrl(item);
  let protocol: string | null = null;
  try {
    protocol = new URL(source, window.location.href).protocol;
  } catch {
    protocol = null;
  }
  if (protocol == null || !OPENABLE_PROTOCOLS.has(protocol)) return null;
  const href = getOriginalMediaUrl(source);
  return <ToolbarButton onClick={() => openUrl(href)} tooltipText={i18n.OPEN_IN_BROWSER} icon={WindowLaunchIcon} />;
};

OpenInBrowserButton.displayName = 'MediaViewerOpenInBrowserButton';

/**
 * The "More" menu (copy image/link, file details). Its menu needs the client's context menus, which aren't built yet;
 * the button renders where the client shows it.
 */
const MoreButton = ({ item, onOpenMenu }: { item: MediaViewerItem; onOpenMenu?: (item: MediaViewerItem) => void }) => {
  const { i18n } = useMediaContext();
  const source = getSourceUrl(item);
  const canCopyLink = /^https?:/.test(new URL(source, window.location.href).protocol);
  const canCopyImage =
    item.type === 'IMAGE' &&
    item.children == null &&
    !item.animated &&
    isDiscordAssetUrl(source, item.contentType, item.originalContentType);
  if (!(canCopyImage || canCopyLink || item.sourceMetadata?.identifier?.type === 'attachment')) return null;
  return <ToolbarButton tooltipText={i18n.MORE} onClick={() => onOpenMenu?.(item)} icon={MoreHorizontalIcon} />;
};

MoreButton.displayName = 'MediaViewerMoreButton';

const Toolbar = memo(
  ({
    item,
    hideMediaOptions,
    onOpenMenu,
  }: {
    item: MediaViewerItem;
    hideMediaOptions: boolean;
    onOpenMenu?: (item: MediaViewerItem) => void;
  }) => {
    const { keyboardModeEnabled } = useContext(AccessibilityPreferencesContext);
    const ref = useRef<HTMLDivElement>(null);
    const handleMouseLeave = useCallback(() => {
      if (!keyboardModeEnabled && ref.current?.contains(document.activeElement))
        (document.activeElement as HTMLElement).blur();
    }, [keyboardModeEnabled]);
    if (item.type !== 'IMAGE' && hideMediaOptions) return null;
    return (
      <MediaViewerChrome mode={MediaViewerChromeMode.FOCUS_SENSITIVE}>
        {(className) => (
          <div
            ref={ref}
            className={clsx(toolbarStyles.actionButtons, className)}
            onClick={(event) => event.stopPropagation()}
            onMouseLeave={handleMouseLeave}
          >
            {item.type === 'IMAGE' && <ZoomButton />}
            {!hideMediaOptions && (
              <>
                <DownloadButton item={item} />
                <OpenInBrowserButton item={item} />
                <MoreButton item={item} onOpenMenu={onOpenMenu} />
              </>
            )}
          </div>
        )}
      </MediaViewerChrome>
    );
  },
);

Toolbar.displayName = 'MediaViewerToolbar';

const TopBar = ({
  item,
  hideMediaOptions,
  onClose,
  onOpenMenu,
  renderAuthor,
}: {
  item: MediaViewerItem;
  hideMediaOptions: boolean;
  onClose: () => void;
  onOpenMenu?: (item: MediaViewerItem) => void;
  renderAuthor?: (message: unknown, className: string) => ReactNode;
}) => {
  const { i18n } = useMediaContext();
  const message = item.sourceMetadata?.message;
  return (
    <div className={headerStyles.topBar}>
      {message != null && renderAuthor != null && (
        <MediaViewerChrome>{(className) => renderAuthor(message, className)}</MediaViewerChrome>
      )}
      <Toolbar item={item} hideMediaOptions={hideMediaOptions} onOpenMenu={onOpenMenu} />
      <MediaViewerChrome mode={MediaViewerChromeMode.PINNED}>
        {(className) => (
          <NavButton
            onClick={onClose}
            icon={XSmallIcon}
            tooltip={i18n.CLOSE}
            className={clsx(headerStyles.closeButton, className)}
          />
        )}
      </MediaViewerChrome>
    </div>
  );
};

TopBar.displayName = 'MediaViewerTopBar';

export interface MediaViewerModalProps {
  items: MediaViewerItem[];
  startingIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  shouldHideMediaOptions?: boolean;
  transitionState?: ModalTransitionStateValue | null;
  isItemObscured?: (item: MediaViewerItem) => boolean;
  /** Opens the "More" menu for the current item (the client shows copy/details actions there). */
  onOpenMoreMenu?: (item: MediaViewerItem) => void;
  /**
   * Renders the author of the message the media is from (avatar, name, timestamp). The client draws it from its
   * user and channel stores; nothing renders when this is omitted.
   */
  renderAuthor?: (message: unknown, className: string) => ReactNode;
}

const MODAL_SPRING = { friction: 30, tension: 300 };

/** Discord's media viewer: the lightbox content shown by the modal stack (`MediaViewerModal`). */
export const MediaViewerModal = ({
  items,
  startingIndex,
  onClose,
  onIndexChange,
  shouldHideMediaOptions = false,
  transitionState,
  isItemObscured,
  onOpenMoreMenu,
  renderAuthor,
}: MediaViewerModalProps) => {
  const { i18n } = useMediaContext();
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const [currentIndex, setCurrentIndex] = useState(startingIndex ?? 0);
  const [zoomed, setZoomedState] = useState(false);
  const scale = useSpringValue(reducedMotion.enabled ? 1 : 0.9, { config: MODAL_SPRING });
  const x = useSpringValue(0, { config: MODAL_SPRING });
  const y = useSpringValue(0, { config: MODAL_SPRING });
  const reduced = reducedMotion.enabled;
  const animate = useCallback(
    (value: typeof scale, to: number, immediate = false) => {
      if (immediate || reduced) value.set(to);
      else void value.start(to);
    },
    [reduced],
  );

  const previousState = useRef<ModalTransitionStateValue | null | undefined>(undefined);
  useEffect(() => {
    if (transitionState === previousState.current) return;
    previousState.current = transitionState;
    if (transitionState === ModalTransitionState.ENTERING) animate(scale, 1);
    else if (transitionState === ModalTransitionState.EXITING && !reduced) {
      animate(x, 0);
      animate(y, 0);
      animate(scale, 0.9);
    }
    // Springs stop when effects are torn down (React's StrictMode does that once in development); run again then.
    return () => {
      previousState.current = undefined;
    };
  }, [transitionState, animate, scale, x, y, reduced]);
  if (transitionState === ModalTransitionState.HIDDEN && zoomed) {
    setZoomedState(false);
    x.set(0);
    y.set(0);
    scale.set(1);
  }

  // Escape closes the viewer before anything else (the client's MEDIA_MODAL_CLOSE keybind).
  useEffect(() => {
    windowDispatch.subscribe(ComponentActions.MEDIA_MODAL_CLOSE, onClose);
    return () => {
      windowDispatch.unsubscribe(ComponentActions.MEDIA_MODAL_CLOSE, onClose);
    };
  }, [onClose]);

  const handleIndexChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      onIndexChange?.(index);
    },
    [onIndexChange],
  );

  const zoomContext = useMemo<MediaViewerZoomContextValue>(
    () => ({
      scale,
      x,
      y,
      setScale: (value, options) => animate(scale, value, options?.immediate),
      setOffset: (nextX, nextY, options) => {
        animate(x, nextX, options?.immediate);
        animate(y, nextY, options?.immediate);
      },
      zoomed,
      setZoomed: (next) => {
        setZoomedState(next);
        animate(scale, next ? ZOOM_SCALE : 1);
        if (!next) {
          animate(x, 0);
          animate(y, 0);
        }
      },
    }),
    [zoomed, scale, x, y, animate],
  );

  return (
    <ThemeProvider theme={ThemeTypes.ONYX}>
      {(themeClassName) => (
        <ModalRoot
          data-migration-pending
          hideShadow
          className={clsx(modalStyles.carouselModal, themeClassName)}
          transitionState={transitionState ?? undefined}
          size={ModalSize.DYNAMIC}
          animation={ModalAnimation.SUBTLE}
          fullscreenOnMobile={false}
          onClick={onClose}
          aria-label={i18n.MEDIA_VIEWER_MODAL}
          parentComponent="MediaViewerModal"
        >
          <MediaViewerZoomContext.Provider value={zoomContext}>
            <TopBar
              item={items[currentIndex]}
              hideMediaOptions={shouldHideMediaOptions}
              onClose={onClose}
              onOpenMenu={onOpenMoreMenu}
              renderAuthor={renderAuthor}
            />
            <div style={{ display: 'none' }} />
            <MediaViewerCarousel
              items={items}
              startIndex={currentIndex}
              onIndexChange={handleIndexChange}
              shouldHideMediaOptions={shouldHideMediaOptions}
              isItemObscured={isItemObscured}
            />
          </MediaViewerZoomContext.Provider>
        </ModalRoot>
      )}
    </ThemeProvider>
  );
};

MediaViewerModal.displayName = 'MediaViewerModal';
