import {
  Suspense,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useManaContext } from '../ManaContext';
import styles from './Graphic.module.css';

export type GraphicAspectRatio = '21/9' | '16/9' | '6/4' | '2/1' | '1/1';

export interface ImageGraphic {
  type: 'image';
  src: string;
}

export interface LottieGraphic {
  type: 'lottie';
  // Loads the animation data (e.g. a dynamic import of the JSON).
  lottie: () => Promise<unknown>;
  props?: Record<string, unknown>;
}

export interface RiveGraphic {
  type: 'rive';
  rive: ComponentType<Record<string, unknown>>;
  props?: Record<string, unknown>;
}

export interface VideoGraphic {
  type: 'video';
  src: string;
  // Shown instead of the video when the user prefers reduced motion.
  fallbackImageSrc?: string;
  loop?: boolean;
  // With `loop`, restart from this time (in seconds) instead of the beginning.
  loopAt?: number;
  playbackRate?: number;
  ref?: Ref<HTMLVideoElement | null>;
}

export interface DynamicGraphic {
  type: 'dynamic';
  // A key of ManaContext's dynamicGraphicComponents (Discord's client uses a numeric enum).
  component: string | number;
  props?: Record<string, unknown>;
}

export type GraphicAsset = ImageGraphic | LottieGraphic | RiveGraphic | VideoGraphic | DynamicGraphic;

export type GraphicProps = GraphicAsset & { aspectRatio?: GraphicAspectRatio };

const ANIMATED_IMAGE_EXTENSIONS = ['gif', 'webp', 'png', 'apng'];
const STATIC_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

const getExtension = (url: string) => url.toLowerCase().split('.').pop();

export const isAnimatedImageUrl = (url: string) => {
  const extension = getExtension(url);
  return extension != null && ANIMATED_IMAGE_EXTENSIONS.includes(extension);
};

export const isStaticImageUrl = (url: string) => {
  const extension = getExtension(url);
  return extension != null && STATIC_IMAGE_EXTENSIONS.includes(extension);
};

const isImage = (graphic: GraphicAsset): graphic is ImageGraphic =>
  'type' in graphic && graphic.type === 'image' && typeof graphic.src === 'string';
const isVideo = (graphic: GraphicAsset): graphic is VideoGraphic =>
  'type' in graphic && graphic.type === 'video' && typeof graphic.src === 'string';
const isLottie = (graphic: GraphicAsset): graphic is LottieGraphic =>
  'type' in graphic && graphic.type === 'lottie' && typeof graphic.lottie === 'function';
const isRive = (graphic: GraphicAsset): graphic is RiveGraphic =>
  'type' in graphic && graphic.type === 'rive' && typeof graphic.rive === 'function';
const isDynamic = (graphic: GraphicAsset): graphic is DynamicGraphic =>
  'type' in graphic && graphic.type === 'dynamic' && 'component' in graphic;

// Whether the graphic moves (an animated image format, a video or an animation).
export const isAnimatedGraphic = (graphic: GraphicAsset | null | undefined) =>
  graphic != null &&
  ((isImage(graphic) && graphic.src != null && isAnimatedImageUrl(graphic.src)) ||
    isVideo(graphic) ||
    isLottie(graphic) ||
    isRive(graphic));

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

const GraphicImage = ({ src }: { src: string }) => <img className={styles.image} src={src} alt="" draggable={false} />;

GraphicImage.displayName = 'GraphicImage';

// Discord renders Lottie animations with its in-app player, which isn't part of this library.
const GraphicLottie = (_props: Omit<LottieGraphic, 'type'>) => null;

GraphicLottie.displayName = 'GraphicLottie';

const GraphicRive = ({ rive: Rive, props }: Omit<RiveGraphic, 'type'>) => (
  <Rive className={styles.rive} withReducedMotion="short-loop" autoplay fit="contain" alignment="center" {...props} />
);

GraphicRive.displayName = 'GraphicRive';

const GraphicVideo = ({
  ref,
  src,
  fallbackImageSrc,
  loop,
  loopAt = 0,
  playbackRate,
  isWindowFocused,
}: Omit<VideoGraphic, 'type'> & { isWindowFocused: boolean }) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle<HTMLVideoElement | null, HTMLVideoElement | null>(ref, () => videoRef.current, []);
  useEffect(() => {
    const video = videoRef.current;
    if (video == null) return;
    if (playbackRate != null) video.playbackRate = playbackRate;
    if (loop != null) video.loop = loopAt === 0 && loop;
    const onEnded = () => {
      if (loop === true && loopAt !== 0) {
        video.currentTime = loopAt;
        void video.play();
      }
    };
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('ended', onEnded);
    };
  }, [loop, loopAt, playbackRate]);
  useEffect(() => {
    if (videoRef.current == null) return;
    if (!reducedMotion.enabled && isWindowFocused) videoRef.current.play()?.catch(() => {});
    else videoRef.current.pause();
  }, [isWindowFocused, reducedMotion.enabled]);
  if (reducedMotion.enabled && fallbackImageSrc != null) return <GraphicImage src={fallbackImageSrc} />;
  return (
    <video
      className={styles.video}
      ref={videoRef}
      src={src}
      autoPlay={!reducedMotion.enabled && isWindowFocused}
      muted
      playsInline
      controls={false}
      preload="metadata"
    />
  );
};

GraphicVideo.displayName = 'GraphicVideo';

// An illustration in a fixed aspect ratio box: an image, a video, a Lottie or Rive animation, or a
// component the app registers in ManaContext.
export const Graphic = ({ aspectRatio = '16/9', ...graphic }: GraphicProps) => {
  const manaContext = useManaContext();
  const windowFocused = useWindowFocused();
  const isWindowFocused = manaContext.isWindowFocused?.() ?? windowFocused;
  if (graphic == null) return null;
  const render = () => {
    if (isImage(graphic)) return <GraphicImage {...graphic} />;
    if (isLottie(graphic)) return <GraphicLottie {...graphic} />;
    if (isRive(graphic)) return <GraphicRive {...graphic} />;
    if (isVideo(graphic)) return <GraphicVideo {...graphic} isWindowFocused={isWindowFocused} />;
    if (isDynamic(graphic)) {
      const components = manaContext.dynamicGraphicComponents as
        Record<string, ComponentType<Record<string, unknown>>> | undefined;
      if (components == null) {
        console.warn('Dynamic graphic used but no dynamicGraphicComponents provided in ManaContext');
        return null;
      }
      const Component = components[graphic.component];
      if (Component == null) {
        console.warn('No component found for dynamic graphic:', graphic.component);
        return null;
      }
      return (
        <Suspense fallback={null}>
          <Component {...graphic.props} />
        </Suspense>
      );
    }
    return null;
  };
  return <div className={clsx(styles.container, styles[`aspect-ratio-${aspectRatio}`])}>{render()}</div>;
};

Graphic.displayName = 'Graphic';
