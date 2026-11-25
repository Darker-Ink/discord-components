import type { MouseEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { LazyImage, type LazyImageProps } from '../LazyImage/LazyImage';
import { MediaPlayer, type MediaPlayerHandle } from '../MediaPlayer/MediaPlayer';
import { isPlayableVideoSize } from '../sizing';
import { formatFileSize } from '../utils/filesize';
import { useMediaContext } from '../MediaContext';
import type { MediaLayoutType } from '../constants';

export interface MediaVideoProps extends Omit<
  LazyImageProps,
  'src' | 'children' | 'onClick' | 'alt' | 'onPlay' | 'onPause' | 'onEnded' | 'onVolumeChange'
> {
  /** The video URL. */
  src: string;
  /** Poster image URL; it is sized and loaded like any lazy image. */
  poster: string;
  fileSize?: number;
  fileName?: string;
  mediaPlayerClassName?: string;
  naturalWidth: number;
  naturalHeight: number;
  playable?: boolean;
  downloadable?: boolean;
  volume?: number | (() => number);
  autoPlay?: boolean;
  autoMute?: boolean | (() => boolean);
  mediaLayoutType?: MediaLayoutType;
  mimeType?: string[];
  renderOverlayContent?: () => ReactNode;
  renderLinkComponent?: (props: Record<string, unknown>) => ReactNode;
  onClick?: (event: MouseEvent<HTMLMediaElement>) => void;
  onPlay?: (autoPlayed: boolean, currentTimeMs: number, durationMs: number) => void;
  onPause?: () => void;
  onEnded?: (event: SyntheticEvent<HTMLMediaElement>) => void;
  onControlsShow?: () => void;
  onControlsHide?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: (muted: boolean) => void;
  disableArrowKeySeek?: boolean;
  disableClickToUnmute?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  allowFullScreen?: boolean;
  showPlaybackSpeedControl?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
  mediaPlayerRef?: Ref<MediaPlayerHandle>;
  initialTimeSec?: number;
  alt?: string;
}

/** A video in a message: its poster is laid out like an image, with the media player on top. */
export const MediaVideo = ({
  src,
  fileSize,
  className,
  mediaPlayerClassName,
  poster,
  fileName,
  naturalWidth,
  naturalHeight,
  playable,
  downloadable = true,
  volume,
  autoPlay,
  autoMute,
  responsive,
  mediaLayoutType,
  mimeType,
  renderOverlayContent,
  renderLinkComponent,
  onClick,
  onPlay,
  onPause,
  onEnded,
  onControlsShow,
  onControlsHide,
  onVolumeChange,
  onMute,
  disableArrowKeySeek,
  disableClickToUnmute,
  onFullscreenChange,
  allowFullScreen,
  showPlaybackSpeedControl,
  videoRef,
  mediaPlayerRef,
  initialTimeSec,
  alt,
  ...rest
}: MediaVideoProps) => {
  const { i18n } = useMediaContext();
  const label = alt ?? i18n.VIDEO;
  return (
    <LazyImage
      alt={label}
      className={className}
      src={poster}
      {...rest}
      minWidth={MediaPlayer.minWidth}
      minHeight={MediaPlayer.minHeight}
      shouldLink={false}
      shouldAnimate={false}
      mediaLayoutType={mediaLayoutType}
      responsive={responsive}
    >
      {({ src: posterSrc, size: { width, height } }) => (
        <MediaPlayer
          ref={mediaPlayerRef}
          alt={label}
          className={mediaPlayerClassName}
          forceExternal={!isPlayableVideoSize(naturalWidth, naturalHeight)}
          src={src}
          poster={posterSrc}
          width={width}
          height={height}
          responsive={responsive}
          volume={volume}
          autoPlay={autoPlay ?? false}
          autoMute={autoMute ?? false}
          type={MediaPlayer.Types.VIDEO}
          mediaLayoutType={mediaLayoutType}
          fileName={fileName}
          fileSize={fileSize == null ? undefined : formatFileSize(fileSize)}
          fileSizeBytes={fileSize}
          playable={playable}
          renderLinkComponent={renderLinkComponent}
          renderOverlayContent={renderOverlayContent}
          onClick={onClick}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onVolumeChange={onVolumeChange}
          onMute={onMute}
          onControlsShow={onControlsShow}
          onControlsHide={onControlsHide}
          mimeType={mimeType}
          downloadable={downloadable}
          disableArrowKeySeek={disableArrowKeySeek}
          disableClickToUnmute={disableClickToUnmute}
          onFullscreenChange={onFullscreenChange}
          allowFullScreen={allowFullScreen}
          showPlaybackSpeedControl={showPlaybackSpeedControl}
          videoRef={videoRef}
          initialTimeSec={initialTimeSec}
        />
      )}
    </LazyImage>
  );
};

MediaVideo.displayName = 'MediaVideo';
