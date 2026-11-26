import Color from 'colorjs.io';
import styles from './RiveDataBinding.module.css';

type ColorListener = (argb: number, frameTime: number | undefined) => void;

interface TrackedCanvas {
  canvas: HTMLCanvasElement;
  // The element whose color the canvas follows (its parent, as the canvas itself inherits it).
  source: Element;
  style: CSSStyleDeclaration;
  value: string | null;
  argb: number | null;
  listeners: Set<ColorListener>;
  unchangedFrames: number;
  animations: Set<Animation>;
}

interface ViewState {
  view: Window;
  tracked: Map<Element, TrackedCanvas>;
  reading: Set<TrackedCanvas>;
  frameRequest: number | null;
  resizeObserver: ResizeObserver | null;
  onTransitionRun: (event: TransitionEvent) => void;
  onAnimationStart: (event: AnimationEvent) => void;
}

const RGB = /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/;

const channel = (value: number) => Math.round(255 * Math.min(1, Math.max(0, Number.isNaN(value) ? 0 : value)));

const toArgb = (r: number, g: number, b: number, a: number) =>
  ((channel(a) << 24) | (channel(r) << 16) | (channel(g) << 8) | channel(b)) >>> 0;

const parseColor = (css: string) => {
  const match = RGB.exec(css);
  if (match != null)
    return toArgb(
      Number(match[1]) / 255,
      Number(match[2]) / 255,
      Number(match[3]) / 255,
      match[4] == null ? 1 : Number(match[4]),
    );
  try {
    const color = new Color(css).to('srgb');
    return toArgb(color.coords[0], color.coords[1], color.coords[2], color.alpha ?? 1);
  } catch {
    return null;
  }
};

const views = new Map<Window, ViewState>();
const parsedColors = new Map<string, number | null>();

const parseCached = (css: string) => {
  let argb = parsedColors.get(css);
  if (argb === undefined) {
    argb = parseColor(css);
    if (parsedColors.size >= 32) parsedColors.clear();
    parsedColors.set(css, argb);
  }
  return argb;
};

// Reads the canvas' current color and tells the listeners when it changed. Returns whether the
// computed value changed at all.
const readColor = (entry: TrackedCanvas, frameTime?: number) => {
  const source = entry.canvas.parentElement ?? entry.canvas;
  if (source !== entry.source) {
    entry.source = source;
    entry.style = (source.ownerDocument.defaultView ?? window).getComputedStyle(source);
  }
  const { color } = entry.style;
  if (color === entry.value) return false;
  entry.value = color;
  const argb = frameTime == null ? parseCached(color) : parseColor(color);
  if (argb != null && argb !== entry.argb) {
    entry.argb = argb;
    for (const listener of entry.listeners) listener(argb, frameTime);
  }
  return true;
};

const isRunning = (animation: Animation) => animation.playState === 'running' || animation.pending;

const scheduleFrame = (state: ViewState) => {
  if (state.frameRequest != null) return;
  state.frameRequest = state.view.requestAnimationFrame((frameTime) => {
    state.frameRequest = null;
    for (const entry of state.reading) {
      const changed = readColor(entry, frameTime);
      for (const animation of entry.animations) if (!isRunning(animation)) entry.animations.delete(animation);
      entry.unchangedFrames = changed || entry.animations.size > 0 ? 0 : entry.unchangedFrames + 1;
      if (entry.unchangedFrames >= 2) state.reading.delete(entry);
    }
    if (state.reading.size > 0) scheduleFrame(state);
  });
};

// Follows the color every frame while it may be changing (a transition or animation is running).
const startReading = (state: ViewState, entry: TrackedCanvas, animation: Animation | null) => {
  entry.unchangedFrames = 0;
  if (animation != null) entry.animations.add(animation);
  readColor(entry);
  state.reading.add(entry);
  scheduleFrame(state);
};

const startReadingWithin = (state: ViewState, target: Element, findAnimation: () => Animation | null) => {
  let animation: Animation | null | undefined;
  for (const entry of state.tracked.values()) {
    if (target !== entry.canvas && target.contains(entry.canvas)) {
      if ((animation ??= findAnimation()) == null) return;
      startReading(state, entry, animation);
    }
  }
};

const isElement = (target: EventTarget | null): target is Element =>
  (target as Node | null)?.nodeType === Node.ELEMENT_NODE;

const animatesColor = (animation: Animation, name: string) => {
  if ((animation as CSSAnimation).animationName !== name) return false;
  const effect = animation.effect as KeyframeEffect | null;
  return effect?.getKeyframes().some((keyframe) => 'color' in keyframe) ?? false;
};

const createViewState = (view: Window): ViewState => {
  const state: ViewState = {
    view,
    tracked: new Map(),
    reading: new Set(),
    frameRequest: null,
    resizeObserver: null,
    onTransitionRun: (event) => {
      if (event.propertyName !== 'color' || !isElement(event.target)) return;
      const target = event.target;
      const entry = state.tracked.get(target);
      if (entry != null) {
        startReading(state, entry, null);
      } else {
        startReadingWithin(
          state,
          target,
          () =>
            target
              .getAnimations?.()
              .find(
                (animation) => (animation as CSSTransition).transitionProperty === 'color' && isRunning(animation),
              ) ?? null,
        );
      }
    },
    onAnimationStart: (event) => {
      if (!isElement(event.target)) return;
      const target = event.target;
      startReadingWithin(
        state,
        target,
        () =>
          target
            .getAnimations?.()
            .find((animation) => animatesColor(animation, event.animationName) && isRunning(animation)) ?? null,
      );
    },
  };
  view.document.addEventListener('transitionrun', state.onTransitionRun, true);
  view.document.addEventListener('animationstart', state.onAnimationStart, true);
  // Each window (popouts included) has its own ResizeObserver.
  const { ResizeObserver: WindowResizeObserver } = view as Window & { ResizeObserver?: typeof ResizeObserver };
  if (WindowResizeObserver != null) {
    state.resizeObserver = new WindowResizeObserver((entries) => {
      for (const { target, contentRect } of entries) {
        const entry = state.tracked.get(target);
        if (entry != null && contentRect.width > 0 && contentRect.height > 0) readColor(entry);
      }
    });
  }
  views.set(view, state);
  return state;
};

/**
 * Calls `listener` with the canvas' CSS `color` (as ARGB) now and whenever it changes, including every
 * frame of a color transition or animation on the canvas or an ancestor. The canvas gets a one-frame
 * color transition so that a plain color change also fires a `transitionrun` event.
 */
export const trackCurrentColor = (canvas: HTMLCanvasElement, listener: ColorListener) => {
  const view = canvas.ownerDocument.defaultView;
  if (view == null) return () => {};
  const state = views.get(view) ?? createViewState(view);
  let entry = state.tracked.get(canvas);
  if (entry == null) {
    const source = canvas.parentElement ?? canvas;
    entry = {
      canvas,
      source,
      style: view.getComputedStyle(source),
      value: null,
      argb: null,
      listeners: new Set([listener]),
      unchangedFrames: 0,
      animations: new Set(),
    };
    state.tracked.set(canvas, entry);
    canvas.classList.add(styles.currentColor);
    state.resizeObserver?.observe(canvas);
    readColor(entry);
  } else {
    entry.listeners.add(listener);
    if (entry.argb != null) listener(entry.argb, undefined);
  }
  const tracked = entry;
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    tracked.listeners.delete(listener);
    if (tracked.listeners.size > 0) return;
    state.tracked.delete(canvas);
    state.reading.delete(tracked);
    canvas.classList.remove(styles.currentColor);
    state.resizeObserver?.unobserve(canvas);
    if (state.tracked.size === 0) {
      state.view.document.removeEventListener('transitionrun', state.onTransitionRun, true);
      state.view.document.removeEventListener('animationstart', state.onAnimationStart, true);
      if (state.frameRequest != null) state.view.cancelAnimationFrame(state.frameRequest);
      state.resizeObserver?.disconnect();
      views.delete(state.view);
    }
  };
};
