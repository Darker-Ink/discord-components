import { useContext, useLayoutEffect, useRef, type Ref, type VideoHTMLAttributes } from 'react';
import { AccessibilityPreferencesContext } from '@discord-components/components';
import { MediaLayoutType } from '../constants';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  alt?: string;
  /** Plays while hovered or focused instead of autoplaying. */
  playOnHover?: boolean;
  onPlayError?: (error: unknown) => void;
  responsive?: boolean;
  mediaLayoutType?: MediaLayoutType;
  ref?: Ref<HTMLVideoElement>;
}

const assignRef = (ref: Ref<HTMLVideoElement> | undefined, value: HTMLVideoElement | null) => {
  if (typeof ref === 'function') ref(value);
  else if (ref != null) ref.current = value;
};

/** A `<video>` that honours reduced motion for autoplay and releases its source on unmount. */
export const Video = ({
  alt,
  ref,
  autoPlay,
  playOnHover,
  onPlayError,
  responsive,
  mediaLayoutType,
  ...props
}: VideoProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const shouldAutoPlay = !reducedMotion.enabled && !playOnHover && autoPlay;
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    if (!playOnHover) return;
    videoRef.current?.play()?.catch((error) => {
      if (onPlayError != null) onPlayError(error);
      else throw error;
    });
  };
  const pause = () => {
    if (playOnHover) videoRef.current?.pause();
  };

  // Detaching the source stops the browser from keeping the download alive after unmount. React's StrictMode
  // re-runs effects on the same element, so the source is put back when the effect runs again.
  const src = props.src;
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (video != null && src != null && video.getAttribute('src') == null) {
      video.setAttribute('src', src);
      video.load();
    }
    return () => {
      if (video == null) return;
      video.removeAttribute('src');
      Array.from(video.children).forEach((child) => {
        if (child instanceof HTMLSourceElement) {
          child.removeAttribute('src');
          child.removeAttribute('type');
        }
        if (child instanceof HTMLImageElement) child.removeAttribute('src');
      });
      try {
        video.load();
      } catch {
        // Ignore: the element may already be detached.
      }
    };
  }, [src]);

  useLayoutEffect(() => {
    assignRef(ref, videoRef.current);
    return () => assignRef(ref, null);
  }, [ref]);

  return (
    <video
      aria-label={alt}
      ref={videoRef}
      autoPlay={shouldAutoPlay}
      onMouseEnter={play}
      onMouseLeave={pause}
      onFocus={play}
      onBlur={pause}
      style={
        mediaLayoutType === MediaLayoutType.MOSAIC
          ? { width: '100%', height: '100%', maxHeight: 'inherit', objectFit: 'contain' }
          : responsive
            ? { maxWidth: props.width, maxHeight: props.height, width: '100%', height: '100%' }
            : {}
      }
      tabIndex={props.tabIndex ?? (props.controls === true ? 0 : -1)}
      {...props}
    />
  );
};

Video.displayName = 'Video';
