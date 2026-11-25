// Ported from the client's class component: playback state lives in refs the media event handlers read.
/* eslint-disable react-hooks/refs, react-hooks/immutability */
import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';
import clsx from 'clsx';
import { animated, useSpringValue } from '@react-spring/web';
import { Clickable, FocusRingScope, ThemeProvider, createLayer } from '@discord-components/components';
import { PauseIcon, PlayIcon } from '@discord-components/icons';
import { ThemeTypes } from '@discord-components/tokens';
import { MediaLayoutType } from '../constants';
import { useMediaContext } from '../MediaContext';
import { MediaInteractionContext } from '../MediaInteractionContext';
import { DownloadLink } from '../DownloadLink/DownloadLink';
import { MediaBar, MediaBarTypes, type MediaBarHandle, type MediaBarType } from './MediaBar';
import { VolumeButton, type VolumeButtonHandle } from './VolumeButton';
import { FullscreenButton } from './FullscreenButton';
import { Video } from './Video';
import { formatDuration } from './formatDuration';
import {
  FULLSCREEN_CHANGE_EVENT,
  exitFullscreen,
  findFullscreenNode,
  isFullscreen,
  requestFullscreen,
} from './fullscreen';
import { amplitudeToPerceptual, perceptualToAmplitude } from './volume';
import styles from './MediaPlayer.module.css';
import overlayStyles from './PlayOverlay.module.css';
import flexStyles from './Flex.module.css';

export const MediaPlayerTypes = {
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
} as const;

export type MediaPlayerType = (typeof MediaPlayerTypes)[keyof typeof MediaPlayerTypes];

const { LayerContainer, LayerProvider } = createLayer('MediaPlayer');

const CONTROLS_SPRING = { friction: 14, tension: 200 };
const FULLSCREEN_STYLE: CSSProperties = { width: '100%', height: '100%', backgroundColor: 'black' };
const MIN_WIDTH = 150;
const MIN_HEIGHT = 110;
const EMPTY_TIME = '-:--';

const ReplayIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" role="img" width={16} height={16} viewBox="0 0 24 24">
    <path
      className={className}
      fill="currentColor"
      d="M12,5 L12,1 L7,6 L12,11 L12,7 C15.31,7 18,9.69 18,13 C18,16.31 15.31,19 12,19 C8.69,19 6,16.31 6,13 L4,13 C4,17.42 7.58,21 12,21 C16.42,21 20,17.42 20,13 C20,8.58 16.42,5 12,5 L12,5 Z"
    />
  </svg>
);

ReplayIcon.displayName = 'ReplayIcon';

/** The big play button shown over a video before it has been played. */
export const MediaPlayOverlay = ({
  onPlay,
  className,
  inactive,
}: {
  onPlay?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  inactive?: boolean;
}) => {
  const { i18n } = useMediaContext();
  const { disableInteractions } = useContext(MediaInteractionContext);
  const ringTarget = useRef<HTMLDivElement>(null);
  const icon = (
    <div className={overlayStyles.iconWrapper} ref={ringTarget}>
      <PlayIcon size="xs" color="currentColor" className={overlayStyles.icon} />
    </div>
  );
  return inactive || onPlay == null ? (
    <div className={overlayStyles.cover}>{icon}</div>
  ) : (
    <Clickable
      className={clsx(className, overlayStyles.cover, { [overlayStyles.active]: !disableInteractions })}
      onClick={onPlay}
      tabIndex={0}
      aria-label={i18n.PLAY}
      focusProps={{ ringTarget }}
    >
      {icon}
    </Clickable>
  );
};

MediaPlayOverlay.displayName = 'MediaPlayOverlay';

const DurationDisplay = ({ current, duration }: { current: number | null; duration: number | null }) => {
  const total = duration != null ? formatDuration(duration) : EMPTY_TIME;
  const elapsed = (current != null ? formatDuration(current) : EMPTY_TIME).padStart(total.length, '0');
  return (
    <div className={styles.durationTimeWrapper}>
      <span className={styles.durationTimeDisplay}>{elapsed}</span>
      <span className={styles.durationTimeSeparator}>/</span>
      <span className={styles.durationTimeDisplay}>{total}</span>
    </div>
  );
};

DurationDisplay.displayName = 'DurationDisplay';

interface ControlsHandle {
  updateProgress: (value: number, animate?: boolean) => void;
}

interface ControlsProps {
  buffers: [number, number][];
  currentTime: number | null;
  duration: number | null;
  volume: number;
  hide: boolean;
  muted: boolean;
  autoPlay: boolean;
  playing: boolean;
  type: MediaPlayerType;
  width: number | string;
  disabled: boolean;
  onDrag: (value: number, type: MediaBarType) => void;
  onDragStart: (type: MediaBarType) => void;
  onDragEnd: () => void;
  onPause: () => void;
  onPlay: () => void;
  onToggleMuted: () => void;
  onVolumeShow?: () => void;
  onVolumeHide?: () => void;
  onControlsShow?: () => void;
  onControlsHide?: () => void;
  children?: ReactNode;
  ref?: Ref<ControlsHandle>;
}

const Controls = ({
  buffers,
  currentTime,
  duration,
  volume,
  hide,
  muted,
  autoPlay,
  playing,
  type,
  width,
  disabled,
  onDrag,
  onDragStart,
  onDragEnd,
  onPause,
  onPlay,
  onToggleMuted,
  onVolumeShow,
  onVolumeHide,
  onControlsShow,
  onControlsHide,
  children,
  ref,
}: ControlsProps) => {
  const { i18n } = useMediaContext();
  const translateY = useSpringValue(autoPlay ? 1 : 0, { config: CONTROLS_SPRING });
  const durationBar = useRef<MediaBarHandle>(null);
  const volumeButton = useRef<VolumeButtonHandle>(null);
  const previousHide = useRef(hide);

  useImperativeHandle(ref, () => ({
    updateProgress: (value, animate = true) => durationBar.current?.setGrabber(value, animate),
  }));

  useEffect(() => {
    if (hide === previousHide.current) return;
    previousHide.current = hide;
    if (playing) translateY.start(hide ? 1 : 0);
    else translateY.set(hide ? 1 : 0);
    if (hide) {
      volumeButton.current?.blur();
      onControlsHide?.();
    } else onControlsShow?.();
  }, [hide, playing, translateY, onControlsHide, onControlsShow]);

  const focusOffset = 4 * Number(type === MediaPlayerTypes.VIDEO);
  const playButton = playing ? (
    <Clickable
      className={styles.videoButton}
      focusProps={{ offset: focusOffset }}
      onClick={onPause}
      tabIndex={disabled ? -1 : 0}
      aria-label={i18n.PAUSE}
    >
      <PauseIcon key="pause" size="xs" color="currentColor" className={styles.controlIcon} />
    </Clickable>
  ) : currentTime != null && currentTime === duration ? (
    <Clickable
      className={styles.videoButton}
      focusProps={{ offset: focusOffset }}
      onClick={onPlay}
      tabIndex={disabled ? -1 : 0}
      aria-label={i18n.PLAY_AGAIN}
    >
      <ReplayIcon key="replay" className={styles.controlIcon} />
    </Clickable>
  ) : (
    <Clickable
      className={styles.videoButton}
      focusProps={{ offset: focusOffset }}
      onClick={onPlay}
      tabIndex={disabled ? -1 : 0}
      aria-label={i18n.PLAY}
    >
      <PlayIcon key="play" size="xs" color="currentColor" className={styles.controlIcon} />
    </Clickable>
  );

  return (
    <animated.div
      className={type === MediaPlayerTypes.VIDEO ? styles.videoControls : styles.audioControls}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      style={{ transform: translateY.to((value) => `translateY(${value * 100}%)`) }}
    >
      {playButton}
      {typeof width === 'string' || width > 250 ? <DurationDisplay current={currentTime} duration={duration} /> : null}
      <MediaBar
        buffers={buffers}
        value={duration ?? 0}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        type={MediaBarTypes.DURATION}
        ref={durationBar}
      />
      <div className={flexStyles.flex}>
        <VolumeButton
          focusProps={{ offset: focusOffset }}
          ref={volumeButton}
          muted={muted}
          value={volume}
          minValue={0}
          maxValue={1}
          currentWindow={window}
          onValueChange={(value) => onDrag(value, MediaBarTypes.VOLUME)}
          onToggleMute={onToggleMuted}
          onVolumeShow={onVolumeShow}
          onVolumeHide={onVolumeHide}
          iconClassName={styles.controlIcon}
          iconColor="currentColor"
          sliderWrapperClassName={styles.volumeSliderWrapper}
        />
      </div>
      {children}
    </animated.div>
  );
};

Controls.displayName = 'MediaPlayerControls';

const AudioMetadata = ({
  fileName,
  fileSize,
  src,
  disabled,
  mimeType,
  hideDownloadButton,
}: {
  fileName: string;
  fileSize: string;
  src: string;
  disabled: boolean;
  mimeType?: string[];
  hideDownloadButton?: boolean;
}) => (
  <div className={styles.audioMetadata}>
    <div className={styles.metadataContent}>
      {disabled ? (
        fileName
      ) : (
        <DownloadLink
          href={src}
          className={styles.metadataDownload}
          iconClassName={styles.metadataIcon}
          mimeType={mimeType}
          fileName={fileName}
        />
      )}
      <div className={styles.metadataSize}>{fileSize}</div>
    </div>
    {!hideDownloadButton && (
      <DownloadLink
        href={src}
        className={styles.metadataDownload}
        iconClassName={styles.metadataIcon}
        mimeType={mimeType}
      />
    )}
  </div>
);

AudioMetadata.displayName = 'AudioMetadata';

interface PlayPausePopHandle {
  pop: (play: boolean) => void;
}

const PlayPausePop = ({ ref }: { ref?: Ref<PlayPausePopHandle> }) => {
  const [play, setPlay] = useState(false);
  const opacity = useSpringValue(0);
  const scale = useSpringValue(0, { config: { ...CONTROLS_SPRING, friction: 80 } });
  useImperativeHandle(ref, () => ({
    pop: (nextPlay) => {
      setPlay(nextPlay);
      scale.set(0);
      opacity.set(0);
      void opacity.start({
        to: async (next) => {
          await next(1);
          await next(0);
        },
        config: { duration: 200 },
      });
      void scale.start(1.5);
    },
  }));
  const Icon = play ? PlayIcon : PauseIcon;
  return (
    <animated.div
      className={styles.playPausePop}
      style={{
        opacity: opacity.to([0, 1], [0, 0.8]),
        transform: scale.to([0, 1], [1, 2]).to((value) => `scale(${value})`),
      }}
    >
      <Icon className={styles.playPausePopIcon} />
    </animated.div>
  );
};

PlayPausePop.displayName = 'PlayPausePop';

const getBuffers = (media: HTMLMediaElement) => {
  const buffers: [number, number][] = [];
  const { duration } = media;
  for (let i = 0; i < media.buffered.length; i++) {
    const start = media.buffered.start(i);
    const end = media.buffered.end(i);
    if (end - start < 1) continue;
    buffers.push([start / duration, (end - start) / duration]);
  }
  return buffers;
};

const debounce = <A extends unknown[]>(fn: (...args: A) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
};

const isDigitKey = (key: string) => key.length === 1 && key >= '0' && key <= '9';

export interface MediaPlayerHandle {
  setPlay: (playing: boolean) => void;
  togglePlayback: () => void;
  setTime: (seconds: number, animate?: boolean) => void;
  toggleFullscreen: () => void;
  readonly mediaElement: HTMLMediaElement | null;
}

export interface MediaPlayerProps {
  src: string;
  type: MediaPlayerType;
  poster?: string;
  alt?: string;
  width?: number | '100%';
  height?: number | '100%';
  className?: string;
  /** Videos too large to decode inline only link out. */
  forceExternal?: boolean;
  playable?: boolean;
  downloadable?: boolean;
  autoPlay?: boolean;
  autoMute?: boolean | (() => boolean);
  volume?: number | (() => number);
  responsive?: boolean;
  mediaLayoutType?: MediaLayoutType;
  fileName?: string;
  /** Human-readable size (e.g. "1.2 MB"). */
  fileSize?: string;
  fileSizeBytes?: number;
  /** `[type, subtype]`. */
  mimeType?: string[];
  renderLinkComponent?: (props: Record<string, unknown>) => ReactNode;
  renderOverlayContent?: () => ReactNode;
  onClick?: (event: MouseEvent<HTMLMediaElement>) => void;
  onPlay?: (autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
  onPause?: () => void;
  onEnded?: (event: SyntheticEvent<HTMLMediaElement>) => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: (muted: boolean) => void;
  onControlsShow?: () => void;
  onControlsHide?: () => void;
  onVolumeShow?: () => void;
  onVolumeHide?: () => void;
  disableArrowKeySeek?: boolean;
  disableClickToUnmute?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  allowFullScreen?: boolean;
  /** Behind a client experiment that is off by default, so the speed menu never renders. */
  showPlaybackSpeedControl?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  initialTimeSec?: number;
  ref?: Ref<MediaPlayerHandle>;
}

/** Discord's inline audio/video player with its own controls. */
export const MediaPlayer = ({
  src,
  type,
  poster,
  alt,
  width = 400,
  height = 300,
  className,
  forceExternal = false,
  playable = true,
  downloadable: _downloadable = true,
  autoPlay = false,
  autoMute = false,
  volume: volumeProp = 1,
  responsive,
  mediaLayoutType,
  fileName,
  fileSize,
  mimeType,
  renderOverlayContent,
  onClick,
  onPlay,
  onPause,
  onEnded,
  onVolumeChange,
  onMute,
  onControlsShow,
  onControlsHide,
  onVolumeShow,
  onVolumeHide,
  disableArrowKeySeek,
  disableClickToUnmute,
  onFullscreenChange,
  allowFullScreen,
  showPlaybackSpeedControl: _showPlaybackSpeedControl,
  videoRef,
  initialTimeSec,
  ref,
}: MediaPlayerProps) => {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const controlsRef = useRef<ControlsHandle>(null);
  const popRef = useRef<PlayPausePopHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMove = useRef(0);
  const unmounted = useRef(false);

  const [buffers, setBuffers] = useState<[number, number][]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dragging, setDragging] = useState<MediaBarType | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [hasClickedPlay, setHasClickedPlay] = useState(false);
  const [hideControls, setHideControls] = useState(!playable);
  const [muted, setMuted] = useState(() => (typeof autoMute === 'function' ? autoMute() : autoMute));
  const [volume, setVolume] = useState(() => (typeof volumeProp === 'function' ? volumeProp() : volumeProp));
  const [playingState, setPlaying] = useState(autoPlay);
  const [preload, setPreload] = useState<'none' | 'metadata'>('none');

  // A player that stops being playable also stops playing.
  const playing = playable ? playingState : false;
  if (!playable && playingState) {
    setPlaying(false);
    setHideControls(false);
  }

  const state = useRef({ playing, dragging, fullscreen, hideControls, muted, volume, hasClickedPlay });
  state.current = { playing, dragging, fullscreen, hideControls, muted, volume, hasClickedPlay };

  const getWidth = () => (width === '100%' ? width : Math.max(width, MIN_WIDTH));
  const getHeight = () => (height === '100%' ? height : Math.max(height, MIN_HEIGHT));

  const updateTime = useCallback((time: number, total: number) => {
    setCurrentTime(time | 0);
    setDuration(total | 0);
  }, []);

  const updateValue = (value: number, animate = true) => controlsRef.current?.updateProgress(value, animate);

  const setTime = (time: number, animate = true) => {
    const media = mediaRef.current;
    if (media == null || !isFinite(media.duration) || !isFinite(media.currentTime)) return;
    media.currentTime = time;
    updateValue(time / media.duration, animate);
    updateTime(time, media.duration);
  };

  const play = (autoPlayed = false) => {
    const media = mediaRef.current;
    if (media == null) return;
    let nextVolume = state.current.volume;
    if (typeof volumeProp === 'function') {
      const value = volumeProp();
      if (value !== nextVolume) {
        media.volume = value;
        nextVolume = value;
      }
    }
    let nextMuted = state.current.muted;
    if (typeof autoMute === 'function') {
      const value = autoMute();
      if (value !== nextMuted) {
        media.muted = value;
        nextMuted = value;
      }
    }
    setVolume(nextVolume);
    setMuted(nextMuted);
    void media.play()?.catch(() => {});
    onPlay?.(autoPlayed, media.currentTime * 1000, media.duration * 1000);
  };

  const updateControlsVisibility = () => {
    const { dragging: isDragging, fullscreen: isFullscreenNow } = state.current;
    const hide = Math.max(0, Date.now() - lastMove.current) > (isFullscreenNow ? 1000 : 3000);
    if (hide !== state.current.hideControls && isDragging == null) setHideControls(hide);
  };

  const handleUIUpdate = () => {
    if (!state.current.playing || unmounted.current) return;
    const media = mediaRef.current;
    if (media == null) return;
    if (media.duration > 0) updateValue(media.currentTime / media.duration);
    updateTime(media.currentTime, media.duration);
    updateControlsVisibility();
    requestAnimationFrame(handleUIUpdate);
  };

  const shouldUnmuteOnFirstInteraction = () =>
    !disableClickToUnmute && !state.current.hasClickedPlay && !!autoMute && state.current.muted;

  const setPlay = (nextPlaying: boolean) => {
    if (nextPlaying === state.current.playing) return;
    if (nextPlaying) {
      setMuted(!shouldUnmuteOnFirstInteraction() && state.current.muted);
      setPlaying(true);
      setHasClickedPlay(true);
    } else {
      setPlaying(false);
      setHideControls(false);
    }
  };

  const toggleFullscreen = () => {
    if (onFullscreenChange != null) {
      onFullscreenChange(!state.current.fullscreen);
      return;
    }
    setFullscreen((current) => !current);
  };

  useImperativeHandle(ref, () => ({
    setPlay,
    togglePlayback: () => setPlay(!state.current.playing),
    setTime,
    toggleFullscreen,
    get mediaElement() {
      return mediaRef.current;
    },
  }));

  useEffect(() => {
    unmounted.current = false;
    const media = mediaRef.current;
    if (media != null) {
      if (muted) media.muted = muted;
      if (playing) {
        play(true);
        handleUIUpdate();
      }
      media.volume = volume;
    }
    return () => {
      unmounted.current = true;
    };
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previous = useRef({ playing, fullscreen, dragging, muted, volume, src });
  useLayoutEffect(() => {
    const prev = previous.current;
    previous.current = { playing, fullscreen, dragging, muted, volume, src };
    const media = mediaRef.current;
    if (media == null) return;
    if (playing && !prev.playing) {
      play();
      lastMove.current = Date.now();
      handleUIUpdate();
      if (hasClickedPlay) popRef.current?.pop(playing);
    } else if (!playing && prev.playing) {
      media.pause();
      popRef.current?.pop(playing);
      onPause?.();
    }
    const node = findFullscreenNode(media.parentElement, media);
    if (fullscreen && !prev.fullscreen && node != null) requestFullscreen(node);
    else if (!fullscreen && prev.fullscreen && node != null) exitFullscreen(node.ownerDocument);
    if (dragging === MediaBarTypes.DURATION && prev.dragging !== MediaBarTypes.DURATION && playing) media.pause();
    else if (dragging !== MediaBarTypes.DURATION && prev.dragging === MediaBarTypes.DURATION && playing)
      void media.play()?.catch(() => {});
    if (muted !== prev.muted) {
      media.muted = muted;
      onMute?.(muted);
    }
    if (volume !== prev.volume) {
      media.volume = volume;
      onVolumeChange?.(volume);
    }
  });

  // Leaving full screen with Escape or the browser UI resets our state.
  useEffect(() => {
    if (!fullscreen) return;
    const handleChange = () => {
      const media = mediaRef.current;
      const node = media != null ? findFullscreenNode(media.parentElement, media) : null;
      if (node == null || !isFullscreen(node, node.ownerDocument)) setFullscreen(false);
    };
    document.addEventListener(FULLSCREEN_CHANGE_EVENT, handleChange);
    return () => document.removeEventListener(FULLSCREEN_CHANGE_EVENT, handleChange);
  }, [fullscreen]);

  const handleBuffer = useRef(
    debounce(() => {
      const media = mediaRef.current;
      setBuffers(media == null ? [] : getBuffers(media));
    }, 400),
  ).current;
  useEffect(() => () => handleBuffer.cancel(), [handleBuffer]);

  const handleDrag = (value: number, dragType: MediaBarType) => {
    const media = mediaRef.current;
    if (dragType === MediaBarTypes.DURATION) {
      if (media != null && isFinite(media.duration)) setTime(media.duration * value, false);
    } else {
      const amplitude = perceptualToAmplitude(value, 1);
      if (amplitude === 0) {
        setMuted(true);
        setVolume(amplitude);
      } else if (state.current.muted && amplitude > 0) {
        setMuted(false);
        setVolume(amplitude);
      } else setVolume(amplitude);
    }
  };

  const handleLoaded = () => {
    const media = mediaRef.current;
    if (media == null) return;
    if (initialTimeSec != null && initialTimeSec > 0) media.currentTime = initialTimeSec;
    updateTime(media.currentTime, media.duration);
    setCurrentTime(media.currentTime);
    setDuration(media.duration);
  };

  const handleEnded = (event: SyntheticEvent<HTMLMediaElement>) => {
    onEnded?.(event);
    setPlaying(false);
    setHideControls(false);
  };

  const handleVideoClick = (event: MouseEvent<HTMLElement>) => {
    if (onClick != null) {
      onClick(event as MouseEvent<HTMLMediaElement>);
      return;
    }
    event.stopPropagation();
    if (autoPlay && state.current.playing && shouldUnmuteOnFirstInteraction()) {
      setMuted(false);
      setHasClickedPlay(true);
    } else setPlay(!state.current.playing);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (event.key === ' ') {
      event.preventDefault();
      setPlay(!state.current.playing);
    } else if (event.key === 'ArrowLeft' && media != null && !disableArrowKeySeek) {
      event.preventDefault();
      event.stopPropagation();
      setTime(Math.max(0, media.currentTime - 5));
    } else if (event.key === 'ArrowRight' && media != null && !disableArrowKeySeek) {
      event.preventDefault();
      event.stopPropagation();
      setTime(Math.min(isFinite(media.duration) ? media.duration : 0, media.currentTime + 5));
    } else if (isDigitKey(event.key) && media != null) {
      event.preventDefault();
      event.stopPropagation();
      media.currentTime = media.duration * (Number(event.key) / 10);
      setPlay(true);
    }
  };

  const setMediaRef = (element: HTMLMediaElement | null) => {
    mediaRef.current = element;
  };
  const setVideoRef = (element: HTMLVideoElement | null) => {
    mediaRef.current = element;
    if (typeof videoRef === 'function') videoRef(element);
    else if (videoRef != null) videoRef.current = element;
  };

  const renderVideo = () =>
    forceExternal ? (
      <Video
        alt={alt}
        className={styles.video}
        controls={false}
        height={getHeight()}
        poster={poster}
        width={getWidth()}
        responsive={responsive && !fullscreen}
        mediaLayoutType={mediaLayoutType}
        playsInline
        autoPlay={playing}
      />
    ) : (
      <Video
        alt={alt}
        className={styles.video}
        controls={false}
        playsInline
        autoPlay={playing}
        height={getHeight()}
        responsive={responsive && !fullscreen}
        mediaLayoutType={fullscreen ? MediaLayoutType.STATIC : mediaLayoutType}
        onClick={handleVideoClick}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoaded}
        onProgress={handleBuffer}
        poster={poster}
        preload={preload}
        ref={setVideoRef}
        width={getWidth()}
        src={src}
      />
    );

  const renderAudio = () => (
    <audio
      className={styles.audio}
      controls={false}
      onClick={handleVideoClick}
      onEnded={handleEnded}
      onLoadedMetadata={handleLoaded}
      onProgress={handleBuffer}
      preload={preload}
      ref={setMediaRef}
    >
      <source src={src} />
    </audio>
  );

  const renderControls = () => {
    const controlsWidth = fullscreen ? window.screen.width : getWidth();
    if (!(hasClickedPlay || autoPlay || type === MediaPlayerTypes.AUDIO))
      return <MediaPlayOverlay onPlay={handleVideoClick} inactive={!playable} />;
    return (
      <Controls
        buffers={buffers}
        currentTime={currentTime}
        duration={duration}
        volume={amplitudeToPerceptual(volume, 1)}
        hide={type === MediaPlayerTypes.VIDEO && hideControls}
        muted={muted}
        autoPlay={autoPlay}
        onDrag={handleDrag}
        onDragEnd={() => {
          setDragging(null);
          lastMove.current = Date.now();
        }}
        onDragStart={(dragType) => setDragging(dragType)}
        onPause={() => setPlay(false)}
        onPlay={() => setPlay(true)}
        onToggleMuted={() => setMuted((current) => !current)}
        onVolumeShow={onVolumeShow}
        onVolumeHide={onVolumeHide}
        onControlsShow={onControlsShow}
        onControlsHide={onControlsHide}
        playing={playing}
        type={type}
        ref={controlsRef}
        width={controlsWidth}
        disabled={!playable}
      >
        {type === MediaPlayerTypes.VIDEO && allowFullScreen !== false ? (
          <FullscreenButton
            focusProps={{ offset: 4 }}
            className={styles.videoButton}
            iconClassName={styles.controlIcon}
            guestWindow={window}
            onClick={toggleFullscreen}
            node={
              mediaRef.current != null ? findFullscreenNode(mediaRef.current.parentElement, mediaRef.current) : null
            }
          />
        ) : null}
      </Controls>
    );
  };

  const renderMetadata = () =>
    fileName == null || fileSize == null || type !== MediaPlayerTypes.AUDIO ? null : (
      <AudioMetadata
        fileName={fileName}
        fileSize={fileSize}
        src={src}
        disabled={!playable}
        mimeType={mimeType}
        hideDownloadButton
      />
    );

  let wrapperClassName = clsx(styles.wrapperPaused, styles.wrapper);
  if (type === MediaPlayerTypes.AUDIO) wrapperClassName = clsx(styles.wrapperAudio, styles.wrapper);
  else if (hideControls) wrapperClassName = clsx(styles.wrapperControlsHidden, styles.wrapper);
  else if (playing) wrapperClassName = clsx(styles.wrapperPlaying, styles.wrapper);

  const mosaic = mediaLayoutType === MediaLayoutType.MOSAIC;
  const mediaStyle: CSSProperties | undefined = fullscreen
    ? FULLSCREEN_STYLE
    : type === MediaPlayerTypes.AUDIO
      ? { width: undefined, height: 'auto' }
      : responsive
        ? undefined
        : { width: getWidth(), height };

  if (forceExternal && type === MediaPlayerTypes.VIDEO) {
    return (
      <div
        className={clsx(wrapperClassName, { [styles.wrapperMediaMosaic]: mosaic })}
        style={responsive ? undefined : { width: getWidth(), height }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {renderMetadata()}
        {renderVideo()}
        <div className={styles.playCenter} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(wrapperClassName, styles.newMosaicStyle, className, { [styles.wrapperMediaMosaic]: mosaic })}
      data-fullscreen={fullscreen}
      onMouseEnter={() => {
        if (preload === 'none') setPreload('metadata');
      }}
      onMouseLeave={() => {
        if (state.current.playing) lastMove.current = 0;
      }}
      onMouseMove={
        playing
          ? () => {
              lastMove.current = Date.now();
            }
          : undefined
      }
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={mediaStyle}
    >
      <FocusRingScope containerRef={containerRef}>
        {renderMetadata()}
        {type === MediaPlayerTypes.AUDIO ? renderAudio() : renderVideo()}
        <ThemeProvider theme={ThemeTypes.ONYX}>
          {(themeClassName) => (
            <div className={themeClassName}>
              <LayerProvider>
                {renderControls()}
                <LayerContainer />
              </LayerProvider>
            </div>
          )}
        </ThemeProvider>
        {type === MediaPlayerTypes.VIDEO ? <PlayPausePop ref={popRef} /> : null}
        {renderOverlayContent != null ? (
          <div className={clsx({ [styles.overlayContentHidden]: playing || fullscreen })}>{renderOverlayContent()}</div>
        ) : null}
      </FocusRingScope>
    </div>
  );
};

MediaPlayer.displayName = 'MediaPlayer';
MediaPlayer.Types = MediaPlayerTypes;
MediaPlayer.minWidth = MIN_WIDTH;
MediaPlayer.minHeight = MIN_HEIGHT;
