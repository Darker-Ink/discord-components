import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type IframeHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { useEmbedI18n } from './embedI18n';
import { Video } from '../media/MediaPlayer/Video';
import { fit, isPlayableVideoSize } from '../media/sizing';
import { getAttachmentSrc } from '../media/mediaUrl';
import type { EmbedMedia, EmbedThumbnailFromVideo } from './types';
import type {
  EmbedSourceMetadata,
  RenderImageComponent,
  RenderLinkComponent,
  RenderVideoComponent,
} from './renderProps';
import { VideoPlayPill } from './VideoPlayPill';
import styles from './Embed.module.css';

export const IFRAME_SANDBOX =
  'allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts';

interface ProviderParams {
  params?: Record<string, string>;
  stripParams?: string[];
  appendParams?: Record<string, string[]>;
  dynamicParams?: (options: { autoMute?: boolean }) => Record<string, string | undefined>;
}

const PROVIDER_PARAMS: Record<string, ProviderParams> = {
  YouTube: {
    params: { autoplay: '1', auto_play: '1', pageType: '2' },
    dynamicParams: ({ autoMute }) => ({ mute: autoMute ? '1' : undefined }),
  },
  TikTok: { params: { utm_source: 'discord.gg' } },
  Twitch: {
    stripParams: ['parent'],
    appendParams: {
      parent: ['discord.co', 'discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com', 'localhost'],
    },
    params: { autoplay: 'true' },
    dynamicParams: ({ autoMute }) => ({ muted: autoMute ? 'true' : undefined }),
  },
};

const toURLSafe = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/** The player url for a provider's iframe, with autoplay (and mute) turned on. */
export const getEmbedPlayerUrl = (
  src: string | undefined,
  provider: string | undefined,
  options: { autoMute?: boolean },
) => {
  const config = provider != null ? PROVIDER_PARAMS[provider] : undefined;
  const url = toURLSafe(src ?? '');
  if (url === null) return '';
  if (config == null) return url.toString();
  for (const key of config.stripParams ?? []) url.searchParams.delete(key);
  for (const [key, value] of Object.entries(config.params ?? {})) url.searchParams.set(key, value);
  for (const [key, values] of Object.entries(config.appendParams ?? {})) {
    for (const value of values) url.searchParams.append(key, value);
  }
  for (const [key, value] of Object.entries(config.dynamicParams?.(options) ?? {})) {
    if (value != null) url.searchParams.set(key, value);
  }
  return url.toString();
};

interface EmbedIframeProps extends IframeHTMLAttributes<HTMLIFrameElement> {
  allowFullScreen?: boolean;
  ref?: Ref<HTMLIFrameElement>;
}

const EmbedIframe = ({ allowFullScreen, ref, ...props }: EmbedIframeProps) => (
  <iframe
    ref={ref}
    className={styles.embedIframe}
    allow={allowFullScreen ? 'autoplay; fullscreen' : 'autoplay'}
    frameBorder={0}
    scrolling="no"
    sandbox={allowFullScreen ? `${IFRAME_SANDBOX} allow-fullscreen` : IFRAME_SANDBOX}
    allowFullScreen={allowFullScreen}
    {...props}
  />
);

EmbedIframe.displayName = 'EmbedIframe';

interface ProviderIframeProps extends EmbedIframeProps {
  provider?: string;
  src?: string;
  autoMute?: boolean;
}

const ProviderIframe = ({ provider, src, autoMute, ...props }: ProviderIframeProps) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const isTikTok = provider === 'TikTok';
  // TikTok's player waits to be told to play (and mute) once it's ready.
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (
        event.data?.['x-tiktok-player'] &&
        event.origin === 'https://www.tiktok.com' &&
        event.data.type === 'onPlayerReady'
      ) {
        if (autoMute) ref.current?.contentWindow?.postMessage({ type: 'mute', 'x-tiktok-player': true }, event.origin);
        ref.current?.contentWindow?.postMessage({ type: 'play', 'x-tiktok-player': true }, event.origin);
      }
    },
    [autoMute],
  );
  useEffect(() => {
    if (!isTikTok) return;
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isTikTok, handleMessage]);
  return <EmbedIframe ref={ref} src={getEmbedPlayerUrl(src, provider, { autoMute })} {...props} />;
};

ProviderIframe.displayName = 'ProviderIframe';

// Starting one provider video stops any other that is playing through an iframe.
const playbackListeners = new Set<() => void>();

export interface EmbedVideoProps {
  className?: string;
  iframeWrapperClassName?: string;
  maxWidth: number;
  maxHeight: number;
  thumbnail: EmbedMedia | EmbedThumbnailFromVideo;
  video?: EmbedMedia;
  provider?: string;
  allowFullScreen?: boolean;
  responsive?: boolean;
  renderImageComponent: RenderImageComponent;
  renderVideoComponent: RenderVideoComponent;
  renderLinkComponent: RenderLinkComponent;
  playable?: boolean;
  autoPlay?: boolean;
  autoMute?: boolean | (() => boolean);
  volume?: number | (() => number);
  onPlay?: (...args: unknown[]) => void;
  onPause?: (...args: unknown[]) => void;
  onEnded?: () => void;
  onControlsHide?: () => void;
  onControlsShow?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: (muted: boolean) => void;
  disableClickToUnmute?: boolean;
  href?: string;
  placeholder?: string;
  placeholderVersion?: number;
  sourceMetadata?: EmbedSourceMetadata;
}

/**
 * A video embed. Videos the client can play itself go to the video renderer; provider videos
 * (YouTube, Twitch…) show their thumbnail with a play pill and swap in the provider's iframe on play.
 */
export const EmbedVideo = ({
  className,
  iframeWrapperClassName,
  maxWidth,
  maxHeight,
  thumbnail,
  video,
  provider,
  allowFullScreen = true,
  responsive = false,
  renderImageComponent,
  renderVideoComponent,
  renderLinkComponent,
  playable = true,
  autoPlay = false,
  autoMute,
  volume,
  onPlay,
  onPause,
  onEnded,
  onControlsHide,
  onControlsShow,
  onVolumeChange,
  onMute,
  disableClickToUnmute,
  href,
  placeholder,
  placeholderVersion,
  sourceMetadata,
}: EmbedVideoProps) => {
  const [playing, setPlaying] = useState(autoPlay);
  const isProviderVideo = video != null && video.proxyURL == null;
  const stop = useCallback(() => setPlaying(false), []);

  const handlePlay = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onPlay?.(false);
    setPlaying(true);
    if (isProviderVideo) {
      for (const listener of [...playbackListeners]) {
        playbackListeners.delete(listener);
        listener();
      }
      playbackListeners.add(stop);
    }
  };

  useEffect(
    () => () => {
      if (isProviderVideo) playbackListeners.delete(stop);
    },
    [isProviderVideo, stop],
  );

  let { width, height } = thumbnail;
  if (video != null) ({ width, height } = video);
  const fitted = fit({ width, height, maxWidth, maxHeight });
  width = Math.max(fitted.width, 150);
  height = Math.max(fitted.height, 144);
  const poster = getAttachmentSrc(thumbnail);

  if (video?.proxyURL != null) {
    return (
      <div className={clsx(styles.embedVideo, className)}>
        {renderVideoComponent({
          poster,
          src: video.proxyURL,
          placeholder,
          placeholderVersion,
          width,
          height,
          responsive,
          autoPlay,
          onEnded,
          naturalWidth: video.width,
          naturalHeight: video.height,
          onVolumeChange,
          playable,
          autoMute,
          volume,
          onPlay,
          onPause,
          onMute,
          onControlsHide,
          onControlsShow,
          disableClickToUnmute,
          sourceMetadata,
        })}
      </div>
    );
  }

  if (playing && video != null) {
    const muted = autoMute === true || (typeof autoMute === 'function' && autoMute());
    let outerStyle: CSSProperties = { width, height };
    let innerStyle: CSSProperties = { width, height };
    let iframeStyle: CSSProperties | undefined;
    if (responsive) {
      const ratio = width !== 0 ? height / width : 1;
      outerStyle = { maxWidth, maxHeight, width: undefined, height: undefined };
      innerStyle = { paddingBottom: `${100 * ratio}%`, maxWidth: width };
      iframeStyle = { position: 'absolute', top: 0, left: 0, maxWidth: width, maxHeight: height };
    }
    return (
      <div className={className} style={outerStyle}>
        <div className={clsx(styles.embedVideo, iframeWrapperClassName)} style={innerStyle}>
          <ProviderIframe
            provider={provider}
            src={video.url}
            style={iframeStyle}
            width={width}
            height={height}
            allowFullScreen={allowFullScreen}
            autoMute={muted}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.embedVideo, className)} style={responsive ? { maxWidth: width } : { width, height }}>
      {renderImageComponent({
        src: poster,
        width,
        height,
        maxWidth: width,
        maxHeight: height,
        responsive,
        containerClassName: styles.embedVideoImageComponent,
        imageClassName: styles.embedVideoImageComponentInner,
        placeholder,
        placeholderVersion,
        onClick: playable && video != null ? handlePlay : null,
        sourceMetadata,
        analyticsSource: 'EmbedVideo',
      })}
      <div className={styles.embedVideoActions}>
        <div className={styles.centerContent}>
          {playable ? (
            <VideoPlayPill
              onPlay={video != null ? handlePlay : null}
              externalURL={href}
              renderLinkComponent={renderLinkComponent}
              messageId={sourceMetadata?.message?.id}
              channelId={sourceMetadata?.message?.channel_id}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

EmbedVideo.displayName = 'EmbedVideo';

interface GIFVVideoProps {
  poster: string;
  src: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  play?: boolean;
  className?: string;
  alt?: string;
  responsive?: boolean;
}

/** A gif (an mp4 the client loops silently), or a still image when it's too large to play. */
const GIFVVideo = ({
  poster,
  src,
  width,
  height,
  naturalWidth,
  naturalHeight,
  play = true,
  className,
  alt,
  responsive,
}: GIFVVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (play) {
      video?.play()?.catch((error: unknown) => {
        if (!(error instanceof DOMException) || error.name !== 'NotAllowedError') throw error;
      });
    } else {
      video?.pause();
    }
  }, [play]);
  if (!isPlayableVideoSize(naturalWidth, naturalHeight))
    return <img alt="" src={poster} width={width} height={height} />;
  return (
    <Video
      ref={ref}
      className={className}
      poster={poster}
      src={src}
      width={width}
      height={height}
      responsive={responsive}
      muted
      loop
      autoPlay={play}
      playsInline
      preload="none"
      aria-label={alt}
    />
  );
};

GIFVVideo.displayName = 'GIFVVideo';

export interface EmbedGIFVProps {
  className?: string;
  href: string;
  thumbnail: EmbedMedia | EmbedThumbnailFromVideo;
  video: EmbedMedia;
  maxWidth: number;
  maxHeight: number;
  responsive?: boolean;
  autoPlay?: boolean;
  playable?: boolean;
  alt?: string;
  disableAltTextDisplay?: boolean;
  hiddenSpoilers?: boolean;
  placeholder?: string;
  placeholderVersion?: number;
  sourceMetadata?: EmbedSourceMetadata;
  renderImageComponent: RenderImageComponent;
  /** Gif favourite button and similar overlays. */
  renderAccessory?: () => ReactNode;
}

/** A gifv embed: the poster through the image renderer, which swaps in the looping video. */
export const EmbedGIFV = ({
  className,
  href,
  thumbnail,
  video,
  maxWidth,
  maxHeight,
  responsive,
  autoPlay,
  playable = true,
  alt,
  disableAltTextDisplay = false,
  hiddenSpoilers,
  placeholder,
  placeholderVersion,
  sourceMetadata,
  renderImageComponent,
  renderAccessory,
}: EmbedGIFVProps) => {
  const i18n = useEmbedI18n();
  const src = getAttachmentSrc(video);
  const videoClassName = clsx(styles.embedVideo, className);
  return renderImageComponent({
    original: href,
    width: thumbnail.width,
    height: thumbnail.height,
    maxWidth,
    maxHeight,
    hiddenSpoilers,
    disableAltTextDisplay,
    placeholder,
    placeholderVersion,
    alt: alt ?? i18n.GIF,
    src: getAttachmentSrc(thumbnail),
    containerClassName: videoClassName,
    autoPlay,
    animated: playable,
    freeze: true,
    responsive,
    renderAccessory,
    tabIndex: playable ? 0 : -1,
    dataSafeSrc: src,
    children: ({ src: poster, size, animating, alt: videoAlt }) => (
      <GIFVVideo
        alt={videoAlt}
        className={videoClassName}
        poster={poster}
        src={src}
        width={size.width}
        height={size.height}
        naturalWidth={video.width}
        naturalHeight={video.height}
        responsive={responsive}
        play={playable && animating}
      />
    ),
    sourceMetadata,
    analyticsSource: 'LazyGIFV',
  });
};

EmbedGIFV.displayName = 'EmbedGIFV';
