import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DependencyList,
  type RefObject,
} from 'react';
import { unstable_batchedUpdates } from 'react-dom';

type ResizeCallback = (entry: ResizeObserverEntry) => void;

// One observer per window; elements map to a subscription id, ids to callbacks.
const elementIds = new WeakMap<Element, string>();
const callbacks = new Map<string, ResizeCallback>();
const observers = new WeakMap<Window, ResizeObserver>();

const subscribe = (id: string, element: Element, callback: ResizeCallback) => {
  elementIds.set(element, id);
  callbacks.set(id, callback);
  const view = element.ownerDocument?.defaultView ?? window;
  let observer = observers.get(view);
  if (observer == null) {
    observer = new view.ResizeObserver((entries) => {
      unstable_batchedUpdates(() => {
        for (const entry of entries) {
          const entryId = elementIds.get(entry.target);
          if (entryId == null) continue;
          callbacks.get(entryId)?.(entry);
        }
      });
    });
    observers.set(view, observer);
  }
  return observer;
};

const unsubscribe = (id: string, element: Element | null) => {
  callbacks.delete(id);
  if (element != null) elementIds.delete(element);
};

// A ResizeObserverEntry-shaped snapshot of an element, for firing the callback before the observer does.
const measure = (element: HTMLElement): ResizeObserverEntry => {
  const rect = element.getBoundingClientRect();
  const parentRect = element.parentElement?.getBoundingClientRect();
  const contentRect = {
    x: rect.x - (parentRect?.x ?? 0),
    y: rect.y - (parentRect?.y ?? 0),
    width: rect.width,
    height: rect.height,
    top: rect.top - (parentRect?.top ?? 0),
    right: rect.width,
    bottom: rect.height,
    left: rect.left - (parentRect?.left ?? 0),
    toJSON: () => {
      const { toJSON: _toJSON, ...rest } = contentRect;
      return rest;
    },
  };
  const style = getComputedStyle(element);
  const borderBoxSize = [{ inlineSize: contentRect.width, blockSize: contentRect.height }];
  const contentBoxSize = [
    {
      inlineSize: contentRect.width - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)),
      blockSize: contentRect.height - (parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)),
    },
  ];
  const ratio = window.devicePixelRatio ?? 1;
  const devicePixelContentBoxSize = [
    { inlineSize: contentBoxSize[0].inlineSize * ratio, blockSize: contentBoxSize[0].blockSize * ratio },
  ];
  return {
    target: element,
    borderBoxSize,
    contentBoxSize,
    devicePixelContentBoxSize,
    contentRect,
  } as unknown as ResizeObserverEntry;
};

export interface UseResizeObserverOptions {
  enabled?: boolean;
  fireOnMount?: boolean;
  fireOnDepsChange?: boolean;
}

/** Calls `callback` whenever the element in `ref` resizes. */
export const useResizeObserver = (
  ref: RefObject<HTMLElement | null>,
  callback: ResizeCallback,
  deps: DependencyList = [],
  options: UseResizeObserverOptions = {},
) => {
  const id = useId();
  const { enabled = true, fireOnMount = false, fireOnDepsChange = false } = options;
  const mounted = useRef(false);
  const initial = useRef({ callback, enabled, fireOnMount });

  useEffect(() => {
    const element = ref.current;
    return () => unsubscribe(id, element);
    // Cleans up the subscription of the element present at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    const { callback, enabled, fireOnMount } = initial.current;
    if (enabled && fireOnMount && element != null) {
      callback(measure(element));
      setTimeout(() => {
        mounted.current = true;
      });
    }
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    if (enabled && fireOnDepsChange && mounted.current && element != null) callback(measure(element));
    // Callers list what should re-fire the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ref, ...deps]);

  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (element == null) return;
    const observer = subscribe(id, element, callback);
    observer.observe(element);
    return () => observer.unobserve(element);
    // Callers list what should re-subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, id, callback, ref, ...deps]);
};

/** The border-box size of an element, kept up to date. */
export const useElementSize = (...deps: DependencyList) => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const ref = useRef<HTMLDivElement | null>(null);
  const handleResize = useCallback((entry: ResizeObserverEntry) => {
    let inlineSize: number | undefined = entry?.borderBoxSize?.[0]?.inlineSize;
    let blockSize: number | undefined = entry?.borderBoxSize?.[0]?.blockSize;
    if (inlineSize == null || blockSize == null) {
      const element = ref.current;
      if (element != null) {
        const style = window.getComputedStyle(element);
        if (inlineSize == null) inlineSize = parseFloat(style.width ?? '0');
        if (blockSize == null) blockSize = parseFloat(style.height ?? '0');
      }
    }
    setHeight(blockSize);
    setWidth(inlineSize);
  }, []);
  useResizeObserver(ref, handleResize, deps);
  return { ref, width, height };
};
