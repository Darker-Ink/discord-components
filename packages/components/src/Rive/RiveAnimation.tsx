import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
  useViewModel,
  useViewModelInstance,
  type AssetLoadCallback,
  type Event as RiveEvent,
  type Rive,
} from '@rive-app/react-canvas';
import riveWasmUrl from '@rive-app/canvas/rive.wasm?url';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useManaContext } from '../ManaContext';
import { RiveDataBindingContext, type RiveDataBindingContextValue } from './RiveDataBinding';

// Discord ships the runtime's wasm with its own assets instead of letting Rive fetch it from a CDN.
RuntimeLoader.setWasmUrl(riveWasmUrl);

export type RiveFit = `${Fit}`;
export type RiveAlignment = `${Alignment}`;

/**
 * What to do when the user prefers reduced motion: `halt` stops on the first frame, `short-loop`
 * plays for five seconds and then pauses, `play` ignores the preference.
 */
export type RiveReducedMotion = 'halt' | 'short-loop' | 'play';

export interface RivePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  fps: number;
}

export interface RiveAnimationHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  getPlaybackState: () => RivePlaybackState | null;
  getArtboards: () => string[];
}

export interface RiveAnimationProps {
  buffer: ArrayBuffer;
  artboard?: string;
  stateMachine?: string;
  autoplay?: boolean;
  className?: string;
  style?: CSSProperties;
  fit?: RiveFit;
  alignment?: RiveAlignment;
  /** Element whose pointer events drive the animation's listeners, instead of the canvas. */
  eventTargetRef?: RefObject<HTMLElement | null>;
  withReducedMotion?: RiveReducedMotion;
  defaultViewModelInstance?: string;
  artboardViewModelInstances?: Record<string, string[]>;
  renderDataBinding?: () => ReactNode;
  touchScrollEnabled?: boolean;
  assetLoader?: AssetLoadCallback;
  onLoad?: (event: RiveEvent) => void;
  ref?: Ref<RiveAnimationHandle>;
}

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'] as const;

const useWindowFocused = () => {
  const [focused, setFocused] = useState(() => window.document.hasFocus());
  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return focused;
};

const useUserIdle = (timeout: number) => {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useCallback(() => {
    setIdle(false);
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), timeout);
  }, [timeout]);
  useEffect(() => {
    for (const event of IDLE_EVENTS) window.addEventListener(event, reset, { passive: true, capture: true });
    timer.current = setTimeout(() => setIdle(true), timeout);
    return () => {
      for (const event of IDLE_EVENTS) window.removeEventListener(event, reset, { capture: true });
      if (timer.current != null) clearTimeout(timer.current);
    };
  }, [timeout, reset]);
  return [idle, reset] as const;
};

interface RuntimeFile {
  artboardCount: () => number;
  artboardByIndex: (index: number) => { name: string };
}

// Fields the public typings mark private but the runtime exposes.
type RiveInternals = {
  canvas: HTMLCanvasElement | OffscreenCanvas | null;
  artboard: { advance: (seconds: number) => void } | null;
  riveFile: { getInstance: () => RuntimeFile | undefined } | null;
  frameRequestId: number | null;
  setupRiveListeners: Rive['setupRiveListeners'];
};

const getCanvasElement = (rive: Rive) => {
  const { canvas } = rive as unknown as RiveInternals;
  return canvas != null && 'ownerDocument' in canvas ? canvas : null;
};

// Discord's build of the runtime takes an `eventTarget` and registers the state machines' pointer
// listeners on it rather than on the canvas, so an animation can react to the element it decorates.
// The published runtime always uses its canvas, so point it at the target while listeners are set up.
const listenOn = (rive: Rive, target: HTMLElement) => {
  const internals = rive as unknown as RiveInternals;
  const setup = rive.setupRiveListeners.bind(rive);
  internals.setupRiveListeners = (options) => {
    const { canvas } = internals;
    internals.canvas = target as unknown as HTMLCanvasElement;
    try {
      setup(options);
    } finally {
      internals.canvas = canvas;
    }
  };
};

export const RiveAnimation = ({
  buffer,
  autoplay = true,
  className,
  fit,
  alignment,
  style,
  eventTargetRef,
  artboard,
  withReducedMotion = 'halt',
  ref,
  artboardViewModelInstances,
  defaultViewModelInstance,
  renderDataBinding,
  touchScrollEnabled = true,
  assetLoader,
  onLoad,
  stateMachine,
}: RiveAnimationProps) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const windowFocused = useWindowFocused();
  const isFocused = useManaContext().isWindowFocused?.() ?? windowFocused;
  const [isUserIdle, resetIdle] = useUserIdle(30000);
  const [stateMachines, setStateMachines] = useState<string[] | undefined>(undefined);
  const [viewModelInstanceName] = useState(defaultViewModelInstance);
  const hasViewModelInstances = (artboardViewModelInstances?.[artboard ?? ''] ?? []).length > 0;
  const usesDataBinding = renderDataBinding != null || viewModelInstanceName != null || hasViewModelInstances;
  const shortLoopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isPausedByCaller = useRef(false);
  const eventTarget = eventTargetRef?.current;

  const { rive, RiveComponent } = useRive({
    buffer,
    autoplay,
    stateMachines: stateMachine != null ? [stateMachine] : stateMachines,
    artboard,
    autoBind: usesDataBinding || undefined,
    useOffscreenRenderer: true,
    layout: new Layout({
      fit: fit != null ? (fit as Fit) : Fit.Cover,
      alignment: alignment != null ? (alignment as Alignment) : Alignment.Center,
    }),
    isTouchScrollEnabled: touchScrollEnabled,
    assetLoader,
    onLoad,
    onRiveReady: (instance) => {
      if (eventTarget != null) listenOn(instance, eventTarget);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        isPausedByCaller.current = false;
        rive?.play();
      },
      pause: () => {
        isPausedByCaller.current = true;
        rive?.pause();
      },
      stop: () => rive?.stop(),
      getPlaybackState: () =>
        rive == null ? null : { isPlaying: rive.isPlaying, isPaused: rive.isPaused, fps: rive.fps },
      getArtboards: () => {
        if (rive == null) return [];
        const file = (rive as unknown as RiveInternals).riveFile?.getInstance();
        if (file == null) return [];
        const names = new Set<string>();
        for (let i = 0; i < file.artboardCount(); i++) names.add(file.artboardByIndex(i).name);
        return Array.from(names);
      },
    }),
    [rive],
  );

  const boundRive = usesDataBinding && (stateMachine != null || stateMachines != null) ? rive : null;
  const viewModel = useViewModel(boundRive);
  const viewModelInstance = useViewModelInstance(
    viewModel,
    viewModelInstanceName != null
      ? { name: viewModelInstanceName, rive: boundRive }
      : { useDefault: true, rive: boundRive },
  );

  // Redraws a paused animation after a bound property changed.
  const redrawScheduled = useRef(false);
  const playIfNeeded = useCallback(() => {
    if (rive == null || redrawScheduled.current) return;
    redrawScheduled.current = true;
    queueMicrotask(() => {
      redrawScheduled.current = false;
      resetIdle();
      if (!rive.isPlaying) {
        (rive as unknown as RiveInternals).artboard?.advance(0);
        rive.drawFrame();
      }
    });
  }, [rive, resetIdle]);

  useEffect(() => {
    if (rive == null || withReducedMotion !== 'short-loop' || !reducedMotion.enabled) return;
    const onPlay = () => {
      if (rive.isPlaying) shortLoopTimer.current = setTimeout(() => rive.pause(), 5000);
    };
    const onStop = () => clearTimeout(shortLoopTimer.current);
    rive.on(EventType.Play, onPlay);
    rive.on(EventType.Pause, onStop);
    rive.on(EventType.Stop, onStop);
    return () => {
      rive.off(EventType.Play, onPlay);
      rive.off(EventType.Pause, onStop);
      rive.off(EventType.Stop, onStop);
    };
  }, [rive, withReducedMotion, reducedMotion.enabled]);

  useLayoutEffect(() => {
    if (rive == null) return;
    if (fit === 'layout') rive.resizeDrawingSurfaceToCanvas();
    const timer = setTimeout(() => {
      if (getCanvasElement(rive) == null) return;
      rive.resizeDrawingSurfaceToCanvas();
      if (!rive.isPlaying) {
        rive.startRendering();
        requestAnimationFrame(() => rive.stopRendering());
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [rive, fit]);

  // A paused animation doesn't redraw by itself, so follow size changes by hand.
  useEffect(() => {
    if (rive == null || !reducedMotion.enabled) return;
    const canvas = getCanvasElement(rive);
    if (canvas == null) return;
    const observer = new (canvas.ownerDocument.defaultView ?? window).ResizeObserver(() => {
      rive.resizeDrawingSurfaceToCanvas();
      if (!rive.isPlaying) {
        rive.startRendering();
        requestAnimationFrame(() => rive.stopRendering());
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [rive, reducedMotion.enabled]);

  // Without an explicit state machine, run all of the artboard's state machines.
  useEffect(() => {
    if (rive == null || stateMachines != null || stateMachine != null) return;
    // The file's state machines are only known once it has loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStateMachines(rive.stateMachineNames);
    rive.reset({ stateMachines: rive.stateMachineNames, autoplay, artboard, autoBind: true });
    rive.setupRiveListeners();
  }, [rive, autoplay, stateMachines, artboard, stateMachine]);

  const previousAutoplay = useRef(autoplay);
  useEffect(() => {
    if (autoplay && !previousAutoplay.current) isPausedByCaller.current = false;
    previousAutoplay.current = autoplay;
  }, [autoplay]);

  const lastFrame = useRef(0);
  useEffect(() => {
    if (rive == null) return;
    const onAdvance = (event: RiveEvent) => {
      if (event.data == null || typeof event.data !== 'number') return;
      lastFrame.current = event.data;
      if (event.data > 0) {
        if (withReducedMotion === 'halt' && reducedMotion.enabled && rive.isPlaying) rive.pause();
        rive.off(EventType.Advance, onAdvance);
      }
    };
    rive.on(EventType.Advance, onAdvance);
    if (autoplay && !isPausedByCaller.current) rive.play();
    return () => rive.off(EventType.Advance, onAdvance);
  }, [rive, reducedMotion.enabled, withReducedMotion, autoplay]);

  useEffect(() => {
    resetIdle();
  }, [resetIdle, artboard, fit, alignment]);

  // Pause while the window is in the background or the user is idle, and resume afterwards.
  const isActive = isFocused && !isUserIdle;
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (rive == null) return;
    let onAdvance: ((event: RiveEvent) => void) | null = null;
    const pausedByCaller = isPausedByCaller.current;
    if (((!isActive && wasPlaying.current) || pausedByCaller) && rive.isPlaying) {
      if (lastFrame.current > 0) {
        rive.pause();
      } else {
        // Let the first frame draw before pausing, or the canvas stays blank.
        const handler = (event: RiveEvent) => {
          if (typeof event.data !== 'number' || event.data <= 0) return;
          rive.off(EventType.Advance, handler);
          if ((!isActive || isPausedByCaller.current) && rive.isPlaying) rive.pause();
        };
        onAdvance = handler;
        rive.on(EventType.Advance, handler);
      }
    } else if (isActive && !pausedByCaller && !rive.isPlaying && wasPlaying.current) {
      rive.play();
    }
    return () => {
      if (onAdvance != null) rive.off(EventType.Advance, onAdvance);
      if (isActive) wasPlaying.current = (rive as unknown as RiveInternals).frameRequestId != null;
    };
  }, [rive, isActive]);

  const dataBinding = useMemo<RiveDataBindingContextValue>(
    () => ({ instance: viewModelInstance, rive, reducedMotionEnabled: reducedMotion.enabled, playIfNeeded }),
    [viewModelInstance, rive, reducedMotion.enabled, playIfNeeded],
  );

  return (
    <>
      <RiveComponent className={className} style={style} aria-hidden />
      {renderDataBinding != null ? (
        <RiveDataBindingContext.Provider value={dataBinding}>{renderDataBinding()}</RiveDataBindingContext.Provider>
      ) : null}
    </>
  );
};

RiveAnimation.displayName = 'RiveAnimation';
