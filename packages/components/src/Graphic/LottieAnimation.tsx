import { Component, createRef } from 'react';
import type { AnimationItem, RendererType } from 'lottie-web';

const LottieRenderers = { SVG: 'svg', CANVAS: 'canvas' } as const;

export type LottieRenderer = (typeof LottieRenderers)[keyof typeof LottieRenderers];

export interface LottieAnimationProps {
  // Loads the animation: its JSON, or a module whose string default export is a URL to it.
  importData: () => Promise<unknown>;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  // Start playing after this many ms instead of right away.
  delay?: number;
  renderer?: LottieRenderer;
  rendererSettings?: Record<string, unknown>;
  shouldAnimate?: boolean;
  // Restart from the first frame whenever it starts playing again.
  resetOnPlay?: boolean;
  // Bumping it reloads the animation; a negative value holds off loading.
  versionKey?: number;
  // Where to stop when `shouldAnimate` turns off.
  pauseAtFrame?: number;
  onComplete?: () => void;
}

// Plays a Lottie animation with lottie-web, which is loaded on demand like in Discord's client.
export class LottieAnimation extends Component<LottieAnimationProps> {
  static displayName = 'LottieAnimation';

  static defaultProps = { loop: true, autoplay: true, renderer: 'svg', shouldAnimate: true, resetOnPlay: false };

  static Renderers = LottieRenderers;

  animationRef = createRef<HTMLDivElement>();
  animation: AnimationItem | null = null;
  delayTimeout: ReturnType<typeof setTimeout> | null = null;

  loadAnimation = async () => {
    const { importData, loop, autoplay, delay, renderer, rendererSettings, shouldAnimate } = this.props;
    if (this.animation != null) this.animation.destroy();
    const [data, { default: lottie }] = await Promise.all([importData(), import('lottie-web')]);
    if (this.animationRef.current == null) return;
    // A load that started earlier (e.g. before StrictMode's remount) may have finished meanwhile.
    if (this.animation != null) this.animation.destroy();
    const source =
      typeof data === 'object' && data != null && 'default' in data && typeof data.default === 'string'
        ? { path: data.default }
        : { animationData: data };
    this.animation = lottie.loadAnimation({
      container: this.animationRef.current,
      renderer: renderer as RendererType as 'svg',
      loop,
      autoplay: autoplay && delay == null && shouldAnimate,
      rendererSettings,
      ...source,
    });
    if (delay != null) {
      if (this.delayTimeout != null) clearTimeout(this.delayTimeout);
      this.delayTimeout = setTimeout(() => {
        this.delayTimeout = null;
        this.animation?.play();
      }, delay);
    } else {
      this.playOrPauseAnimation();
    }
    this.animation?.addEventListener('complete', this.handleComplete);
  };

  override componentDidMount() {
    if (this.props.versionKey != null && this.props.versionKey < 0) return;
    void this.loadAnimation();
  }

  override componentDidUpdate(prevProps: LottieAnimationProps) {
    const { versionKey } = this.props;
    if (versionKey != null && versionKey < 0) return;
    if (versionKey != null && prevProps.versionKey != null && versionKey > prevProps.versionKey) {
      void this.loadAnimation();
    } else {
      this.playOrPauseAnimation(prevProps);
    }
  }

  override componentWillUnmount() {
    if (this.animation != null) {
      this.animation.stop();
      this.animation.destroy();
      this.animation = null;
    }
    if (this.delayTimeout != null) clearTimeout(this.delayTimeout);
  }

  playOrPauseAnimation(prevProps?: LottieAnimationProps) {
    if (this.animation == null) return;
    const { shouldAnimate, resetOnPlay, pauseAtFrame } = this.props;
    if (shouldAnimate && (prevProps == null || !prevProps.shouldAnimate)) {
      if (resetOnPlay) this.animation.goToAndPlay(0);
      else this.animation.play();
    } else if (!shouldAnimate && (prevProps == null || prevProps.shouldAnimate)) {
      this.animation.pause();
      if (pauseAtFrame != null) this.animation.goToAndStop(pauseAtFrame, true);
    }
  }

  handleComplete = () => {
    this.props.onComplete?.();
  };

  override render() {
    return <div className={this.props.className} ref={this.animationRef} />;
  }
}
