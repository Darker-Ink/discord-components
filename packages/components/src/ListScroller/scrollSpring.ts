/* eslint-disable react-hooks/refs -- the spring only reads the scroller ref while animating. */
import { useState, type RefObject } from 'react';

const STEP = 1 / 240;

interface SpringOptions {
  callback: (value: number, abort: () => void) => void;
  tension?: number;
  friction?: number;
  mass?: number;
  threshold?: number;
  clamp?: boolean;
  maxVelocity?: number;
  getNodeWindow?: () => Window | null;
}

interface SpringTarget {
  to: number;
  from?: number;
  animate?: boolean;
  callback?: () => void;
}

/** A fixed-step spring that drives scroll positions. */
export class ScrollSpring {
  tension: number;
  friction: number;
  threshold: number;
  mass: number;
  maxVelocity: number;
  clamp: boolean;
  callback: (value: number, abort: () => void) => void;
  accumulator = 0;
  from = 0;
  target = 0;
  vel = 0;
  animating = false;
  last: number | null = null;
  nextTick = -1;
  getNodeWindow: () => Window | null;
  nodeWindow: Window | null = null;
  callbacks: (() => void)[] = [];

  constructor({
    callback,
    tension = 160,
    friction = 22,
    mass = 1,
    threshold = 0.001,
    clamp = false,
    maxVelocity = Infinity,
    getNodeWindow = () => window,
  }: SpringOptions) {
    this.callback = callback;
    this.from = 0;
    this.tension = tension;
    this.friction = friction;
    this.mass = mass;
    this.maxVelocity = maxVelocity;
    this.threshold = threshold;
    this.clamp = clamp;
    this.getNodeWindow = getNodeWindow;
  }

  to({ to, from, animate = false, callback }: SpringTarget) {
    this.target = to;
    if (callback != null) this.callbacks.push(callback);
    if (from != null) this.from = from;
    if (animate) {
      if (!this.animating) this.start();
      return this;
    }
    this.stop(to);
  }

  mergeTo = ({ to, callback }: { to: number; callback?: () => void }) => {
    if (!this.animating) {
      if (callback != null) this.callbacks.push(callback);
      this.stop(to);
    }
    const delta = to - this.from;
    this.from = to;
    this.target = this.target + delta;
    this.callback(this.from, this.abort);
    if (callback != null) callback();
  };

  cancel() {
    this.stop(this.from);
    return this;
  }

  abort = () => {
    this.animating = false;
  };

  start() {
    this.animating = true;
    this.vel = 0;
    this.last = null;
    this.nodeWindow = this.getNodeWindow();
    this.nextTick = this.nodeWindow?.requestAnimationFrame(this.update) ?? -1;
  }

  getUpdates(vel: number, from: number) {
    const accel = (-this.tension * (from - this.target) + -this.friction * vel) / this.mass;
    vel += accel * STEP;
    if (Math.abs(vel) > this.maxVelocity) vel = this.maxVelocity * (vel > 0 ? 1 : -1);
    return { from: from + vel * STEP, vel, accel };
  }

  update = (time: number) => {
    if (this.last == null) {
      this.last = time;
      this.nextTick = this.nodeWindow?.requestAnimationFrame(this.update) ?? -1;
      return;
    }
    for (this.accumulator = Math.min((time - this.last) / 1000 + this.accumulator, 2); this.accumulator > STEP;) {
      this.accumulator -= STEP;
      const { vel, from, accel } = this.getUpdates(this.vel, this.from);
      this.vel = vel;
      if (
        (this.clamp &&
          (from === this.target ||
            (from < this.target && this.from > this.target) ||
            (from > this.target && this.from < this.target))) ||
        Math.abs(accel * STEP) < this.threshold
      ) {
        this.stop(this.target);
        return;
      }
      this.from = from;
    }
    let { from } = this;
    if (this.accumulator > 0) {
      const { from: next } = this.getUpdates(this.vel, from);
      from += (next - from) * (this.accumulator / STEP);
    }
    this.callback(from, this.abort);
    if (this.animating) {
      this.last = time;
      this.nextTick = this.nodeWindow?.requestAnimationFrame(this.update) ?? -1;
    }
  };

  stop(value?: number) {
    this.nodeWindow?.cancelAnimationFrame(this.nextTick);
    this.animating = false;
    this.accumulator = 0;
    if (value != null) {
      this.target = this.from = value;
      this.callback(value, this.abort);
    }
    if (this.callbacks.length > 0) {
      this.callbacks.forEach((callback) => callback());
      this.callbacks.length = 0;
    }
  }
}

export type ScrollOrientation = 'vertical' | 'horizontal';

export const useScrollSpring = (ref: RefObject<HTMLElement | null>, orientation: ScrollOrientation = 'vertical') => {
  const [spring] = useState(
    () =>
      new ScrollSpring({
        tension: 200,
        friction: 35,
        mass: 2,
        clamp: true,
        callback: (value, abort) => {
          const { current } = ref;
          if (current == null) return abort();
          if (orientation === 'horizontal') current.scrollLeft = value;
          else current.scrollTop = value;
        },
        getNodeWindow: () => ref.current?.ownerDocument?.defaultView ?? null,
      }),
  );
  return spring;
};

interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  offsetHeight: number;
  offsetWidth: number;
}

const getAxis = (state: ScrollState, orientation: ScrollOrientation) => {
  if (orientation === 'horizontal') {
    const { scrollLeft, scrollWidth, offsetWidth } = state;
    return { scrollPosition: scrollLeft, scrollSize: scrollWidth, offsetSize: offsetWidth };
  }
  const { scrollTop, scrollHeight, offsetHeight } = state;
  return { scrollPosition: scrollTop, scrollSize: scrollHeight, offsetSize: offsetHeight };
};

interface ScrollOptions {
  animate?: boolean;
  callback?: () => void;
}

export interface ScrollIntoViewRectOptions extends ScrollOptions {
  start: number;
  end: number;
  shouldScrollToStart?: boolean;
  padding?: number;
}

/** The imperative scroll API of a scroller, animated through its spring. */
export const getScrollHelpers = (
  scrollerRef: RefObject<HTMLElement | null>,
  getScrollerState: () => ScrollState,
  spring: ScrollSpring,
  orientation: ScrollOrientation = 'vertical',
) => {
  const scrollTo = ({ to, animate, callback }: ScrollOptions & { to: number }) => {
    const { scrollPosition, scrollSize, offsetSize } = getAxis(getScrollerState(), orientation);
    const max = scrollSize - offsetSize + 1;
    spring.to({ to: to >= max - 1 ? max : Math.max(0, to), from: scrollPosition, animate, callback });
  };
  const scrollIntoViewRect = ({
    start,
    end,
    shouldScrollToStart = false,
    padding = 0,
    animate,
    callback,
  }: ScrollIntoViewRectOptions) => {
    const { scrollPosition, offsetSize } = getAxis(getScrollerState(), orientation);
    start -= padding;
    end += padding;
    if (start >= scrollPosition && end <= scrollPosition + offsetSize && !shouldScrollToStart) callback?.();
    else if (start < scrollPosition || shouldScrollToStart) scrollTo({ to: start, animate, callback });
    else scrollTo({ to: end - offsetSize, animate, callback });
  };
  return {
    spring,
    scrollTo,
    mergeTo: spring.mergeTo,
    scrollIntoViewRect,
    scrollIntoViewNode({
      node,
      shouldScrollToStart = false,
      padding = 0,
      animate = false,
      callback,
    }: ScrollOptions & { node: HTMLElement; shouldScrollToStart?: boolean; padding?: number }) {
      const { current } = scrollerRef;
      if (current == null) return;
      let offset = orientation === 'horizontal' ? node.offsetLeft : node.offsetTop;
      const offsetSize = orientation === 'horizontal' ? node.offsetWidth : node.offsetHeight;
      let parent: Node | null = node.offsetParent;
      while (parent != null && parent !== current) {
        if (parent instanceof HTMLElement) {
          offset += orientation === 'horizontal' ? parent.offsetLeft : parent.offsetTop;
          parent = parent.offsetParent;
        } else parent = parent.parentNode;
      }
      scrollIntoViewRect({ start: offset, end: offset + offsetSize, shouldScrollToStart, padding, animate, callback });
    },
    scrollPageUp({ animate = false, callback }: ScrollOptions = {}) {
      const { scrollPosition, offsetSize } = getAxis(getScrollerState(), orientation);
      scrollTo({ to: scrollPosition - 0.9 * offsetSize, animate, callback });
    },
    scrollPageDown({ animate = false, callback }: ScrollOptions = {}) {
      const { scrollPosition, offsetSize } = getAxis(getScrollerState(), orientation);
      scrollTo({ to: scrollPosition + 0.9 * offsetSize, animate, callback });
    },
    scrollToTop({ animate = false, callback }: ScrollOptions = {}) {
      scrollTo({ to: 0, animate, callback });
    },
    scrollToBottom({ animate = false, callback }: ScrollOptions = {}) {
      scrollTo({ to: Number.MAX_SAFE_INTEGER, animate, callback });
    },
    isScrolledToTop: () => getAxis(getScrollerState(), orientation).scrollPosition === 0,
    isScrolledToBottom() {
      const { scrollPosition, scrollSize, offsetSize } = getAxis(getScrollerState(), orientation);
      return scrollPosition >= scrollSize - offsetSize;
    },
    getDistanceFromTop: () => Math.max(0, getAxis(getScrollerState(), orientation).scrollPosition),
    getDistanceFromBottom() {
      const { scrollPosition, scrollSize, offsetSize } = getAxis(getScrollerState(), orientation);
      return Math.max(0, scrollSize - offsetSize - scrollPosition);
    },
  };
};
