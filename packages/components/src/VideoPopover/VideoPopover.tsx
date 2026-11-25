import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from 'react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import type { BadgeProps, BadgeType } from '../Badge';
import type { ButtonProps } from '../Button';
import { CloseButton } from '../CloseButton';
import { DialogContext } from '../Dialog';
import { Graphic, isAnimatedImageUrl, isStaticImageUrl } from '../Graphic';
import { useManaContext } from '../ManaContext';
import { PlayPauseButton } from '../PlayPauseButton';
import type { PopoutScrollBehavior } from '../Popout';
import {
  BasePopover,
  PopoverActions,
  PopoverCaret,
  PopoverHeader,
  type PopoverAlignment,
  type PopoverCaretConfig,
  type PopoverPosition,
  type PopoverTextLink,
} from '../Popover';
import styles from './VideoPopover.module.css';

const ENLARGE_AND_PLAY_VIDEO = 'Enlarge and play video';

const VideoPopoverCloseButton = ({
  onClick,
  'aria-label': ariaLabel,
}: {
  onClick: () => void;
  'aria-label'?: string;
}) => {
  const { i18n } = useManaContext();
  const { firstFocusableItemProps } = useContext(DialogContext);
  return (
    <div className={styles.closeButton}>
      <CloseButton
        size="xs"
        aria-label={ariaLabel ?? i18n.CLOSE_BUTTON_LABEL}
        onClick={onClick}
        variant="overlay-secondary"
        {...firstFocusableItemProps}
      />
    </div>
  );
};

VideoPopoverCloseButton.displayName = 'VideoPopoverCloseButton';

const useWindowFocused = () => {
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    // The window may already have lost focus before the listeners were attached.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocused(window.document.hasFocus());
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return focused;
};

interface PreviewVideoProps {
  ref: Ref<HTMLVideoElement>;
  src: string;
  width: number;
  height: number;
  autoPlay: boolean;
}

// Discord's media Video element: no autoplay with reduced motion, unfocusable without controls,
// and its source released on unmount.
const PreviewVideo = ({ ref, autoPlay, ...props }: PreviewVideoProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  useLayoutEffect(
    () => () => {
      const video = videoRef.current;
      if (video == null) return;
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Nothing left to release.
      }
    },
    [],
  );
  useLayoutEffect(() => {
    if (typeof ref === 'function') {
      ref(null);
      ref(videoRef.current);
    } else if (ref != null) ref.current = videoRef.current;
    return () => {
      if (typeof ref === 'function') ref(null);
      else if (ref != null) ref.current = null;
    };
  }, [ref]);
  return (
    <video
      ref={videoRef}
      autoPlay={!reducedMotion.enabled && autoPlay}
      style={{}}
      tabIndex={-1}
      {...props}
      muted
      loop
      playsInline
      controls={false}
      preload="metadata"
    />
  );
};

PreviewVideo.displayName = 'PreviewVideo';

export type VideoPopoverProps = {
  title: string;
  body?: string;
  // The video opened when the preview is clicked.
  assetUrl: string;
  // What plays inside the popover (an image or a video); defaults to `assetUrl`.
  previewUrl?: string;
  disableMediaViewer?: boolean;
  action?: ButtonProps;
  caretConfig?: PopoverCaretConfig;
  badge?: BadgeType | BadgeProps;
  textLink?: PopoverTextLink;
  onWatchVideo?: () => void;
  onRequestClose?: () => void;
  popoverRef?: Ref<HTMLDivElement>;
  position?: PopoverPosition;
  targetElementRef: RefObject<Element | null>;
  shouldShow?: boolean;
  scrollBehavior?: PopoutScrollBehavior;
} & PopoverAlignment;

// A popover that previews a video (muted, looping) with a button to watch it enlarged.
export const VideoPopover = ({
  title,
  body,
  assetUrl,
  previewUrl = assetUrl,
  disableMediaViewer = false,
  action,
  caretConfig = { align: 'center' },
  badge,
  textLink,
  onWatchVideo,
  onRequestClose,
  popoverRef,
  position,
  ...props
}: VideoPopoverProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const windowFocused = useWindowFocused();
  const isWindowFocused = useManaContext().isWindowFocused?.() ?? windowFocused;
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAnimatedImage = isAnimatedImageUrl(previewUrl);
  const isImage = isStaticImageUrl(previewUrl);

  useEffect(() => {
    if (videoRef.current == null) return;
    if (!reducedMotion.enabled && isWindowFocused) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isWindowFocused, reducedMotion.enabled]);

  const handleRequestClose = useCallback(() => {
    videoRef.current?.pause();
    onRequestClose?.();
  }, [onRequestClose]);
  const handleClose = useCallback(() => {
    videoRef.current?.pause();
    onRequestClose?.();
  }, [onRequestClose]);
  // Discord opens `assetUrl` in its media viewer here, which lives in the client.
  const handleWatchVideo = useCallback(() => {
    videoRef.current?.pause();
    onRequestClose?.();
    onWatchVideo?.();
  }, [onWatchVideo, onRequestClose]);

  const preview = (
    <>
      {isAnimatedImage || isImage ? (
        <Graphic type="image" src={previewUrl} />
      ) : (
        <PreviewVideo
          ref={videoRef}
          src={previewUrl}
          width={232}
          height={131}
          autoPlay={!reducedMotion.enabled && isWindowFocused}
        />
      )}
      {!disableMediaViewer && (
        <div className={styles.playButton}>
          <PlayPauseButton playing={false} size="sm" aria-label={ENLARGE_AND_PLAY_VIDEO} onClick={handleWatchVideo} />
        </div>
      )}
    </>
  );

  return (
    <BasePopover
      targetElementRef={props.targetElementRef}
      shouldShow={props.shouldShow}
      scrollBehavior={props.scrollBehavior}
      position={position}
      onRequestClose={handleRequestClose}
      hasVideo
      caretConfig={caretConfig}
      {...(props.alignmentStrategy === 'edge'
        ? { alignmentStrategy: 'edge', align: props.align }
        : { alignmentStrategy: 'trigger-center' })}
    >
      <div ref={popoverRef}>
        <VideoPopoverCloseButton onClick={handleClose} />
        <PopoverCaret />
        <div className={styles.assetContainer}>{preview}</div>
        <PopoverHeader title={title} body={body} badge={badge} textLink={textLink} />
        {action != null ? <PopoverActions actions={[action]} /> : null}
      </div>
    </BasePopover>
  );
};

VideoPopover.displayName = 'VideoPopover';
