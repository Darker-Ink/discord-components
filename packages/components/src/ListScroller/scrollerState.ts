/* eslint-disable react-hooks/refs -- the visible chunk range is render-time bookkeeping kept in a ref. */
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

// 0: up to date, 1: scroll position changed, 2: sizes changed too.
export type ScrollerDirtyLevel = 0 | 1 | 2;

export interface ScrollerState {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  offsetHeight: number;
  offsetWidth: number;
  dirty: ScrollerDirtyLevel;
}

const INITIAL_STATE: ScrollerState = Object.freeze({
  scrollTop: 0,
  scrollLeft: 0,
  scrollHeight: 0,
  scrollWidth: 0,
  offsetHeight: 0,
  offsetWidth: 0,
  dirty: 2,
});

/** Caches a scroller's measurements and re-reads only what was marked dirty. */
export const useCachedScrollerState = () => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollerState = useRef<ScrollerState>(INITIAL_STATE);
  const getScrollerState = useCallback(() => {
    const { current } = scrollerRef;
    const { dirty } = scrollerState.current;
    if (current == null || dirty === 0) return scrollerState.current;
    if (dirty === 1) {
      const { scrollTop, scrollLeft } = current;
      scrollerState.current = { ...scrollerState.current, scrollTop, scrollLeft, dirty: 0 };
    } else {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, offsetHeight, offsetWidth } = current;
      scrollerState.current = { scrollTop, scrollLeft, scrollHeight, scrollWidth, offsetHeight, offsetWidth, dirty: 0 };
    }
    return scrollerState.current;
  }, []);
  return { scrollerRef, scrollerState, getScrollerState };
};

const getChunkRange = (scrollTop: number, offsetHeight: number, chunkSize: number): [number, number] => [
  Math.floor(scrollTop / chunkSize) - 1,
  Math.ceil((scrollTop + offsetHeight) / chunkSize) + 1,
];

const NO_CHUNKS: [number, number] = [0, 0];

/** Re-renders a virtualized list only when the visible range crosses into another chunk. */
export const useVirtualizedChunks = ({
  chunkSize,
  getScrollerState,
  forceUpdate,
}: {
  chunkSize: number;
  getScrollerState: () => ScrollerState;
  forceUpdate: () => void;
}) => {
  const { dirty, scrollTop, offsetHeight } = getScrollerState();
  useLayoutEffect(() => {
    if (dirty > 0) forceUpdate();
  }, [dirty, forceUpdate]);
  const chunks = useRef(NO_CHUNKS);
  chunks.current = getChunkRange(scrollTop, offsetHeight, chunkSize);
  const [chunkStart, chunkEnd] = chunks.current;
  return {
    forceUpdateOnChunkChange: useCallback(
      (level: ScrollerDirtyLevel) => {
        const { dirty, scrollTop, offsetHeight } = getScrollerState();
        if (dirty > 0) return;
        const [start, end] = getChunkRange(scrollTop, offsetHeight, chunkSize);
        if (start !== chunks.current[0]) forceUpdate();
        else if (level === 2 && end !== chunks.current[1]) forceUpdate();
      },
      [forceUpdate, chunkSize, getScrollerState],
    ),
    chunkStart,
    chunkEnd,
    dirty,
  };
};

export const useForceUpdate = () => {
  const [, setCount] = useState(0);
  return useCallback(() => setCount((count) => count + 1), []);
};

const BORDER_BOX = Object.freeze({ box: 'border-box' as const });

export interface ResizeObserverLike {
  observe(target: Element, options?: ResizeObserverOptions): void;
  unobserve(target: Element): void;
}

export const NOOP_RESIZE_OBSERVER: ResizeObserverLike = { observe() {}, unobserve() {} };

/** Subscribes an element to a resize observer shared by every list of one kind. */
export const useResizeObserverSubscription = ({
  ref,
  onUpdate,
  resizeObserver,
  listenerMap,
  key,
}: {
  ref: RefObject<Element | null>;
  onUpdate: (entry: ResizeObserverEntry, key: string) => void;
  resizeObserver: ResizeObserverLike;
  listenerMap: Map<Element, (entry: ResizeObserverEntry) => void>;
  key: string;
}) => {
  useLayoutEffect(() => {
    const { current } = ref;
    if (current != null) {
      listenerMap.set(current, (entry) => {
        flushSync(() => {
          onUpdate(entry, key);
        });
      });
      resizeObserver.observe(current, BORDER_BOX);
    }
    return () => {
      if (current != null) {
        resizeObserver.unobserve(current);
        listenerMap.delete(current);
      }
    };
  }, [onUpdate, resizeObserver, ref, listenerMap, key]);
};
