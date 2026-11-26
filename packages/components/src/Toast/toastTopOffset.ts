import { useId, useLayoutEffect, type RefObject } from 'react';
import { createStore, useStore } from './createStore';

// Bottom edges of things pinned to the top of each surface (banners, title bars), so toasts appear
// below the lowest of them.
const topOffsetStore = createStore<{ topOffsetsBySurface: Map<string, Map<string, number>> }>({
  topOffsetsBySurface: new Map(),
});

const setTopOffset = (surface: string, id: string, offset: number | null) => {
  topOffsetStore.setState((state) => {
    const offsets = new Map(state.topOffsetsBySurface.get(surface));
    if (offset == null) offsets.delete(id);
    else offsets.set(id, offset);
    const topOffsetsBySurface = new Map(state.topOffsetsBySurface);
    topOffsetsBySurface.set(surface, offsets);
    return { topOffsetsBySurface };
  });
};

export const useToastTopOffset = (surface: string) =>
  useStore(topOffsetStore, (state) => {
    const offsets = state.topOffsetsBySurface.get(surface);
    return offsets == null || offsets.size === 0 ? null : Math.max(...offsets.values());
  });

// Keeps toasts on `surface` below the element in `ref` while `enabled`.
export const useToastTopOffsetAnchor = (surface: string, ref: RefObject<Element | null>, enabled = true) => {
  const id = useId();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || element == null) return;
    const view = element.ownerDocument.defaultView ?? window;
    const update = () => setTopOffset(surface, id, element.getBoundingClientRect().bottom);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.parentElement != null) observer.observe(element.parentElement);
    view.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      view.removeEventListener('resize', update);
      setTopOffset(surface, id, null);
    };
  }, [enabled, id, ref, surface]);
};
