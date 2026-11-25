import { useEffect, useSyncExternalStore } from 'react';
import { EventType, RiveFile } from '@rive-app/react-canvas';

export const RiveAssetStatus = {
  Loading: 'loading',
  Loaded: 'loaded',
} as const;

export type RiveAssetState =
  | { status: typeof RiveAssetStatus.Loading; buffer: null }
  | { status: typeof RiveAssetStatus.Loaded; buffer: ArrayBuffer };

const LOADING: RiveAssetState = { status: RiveAssetStatus.Loading, buffer: null };

const assetCache = new Map<string, RiveAssetState>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const storeBuffer = (src: string, buffer: ArrayBuffer) => {
  assetCache.set(src, { status: RiveAssetStatus.Loaded, buffer });
  listeners.forEach((listener) => listener());
};

// Fetching a .riv file is never urgent, so it waits for the browser to be idle (at most a second).
const runWhenIdle = (callback: () => void, timeout = 1000) => {
  if (typeof requestIdleCallback === 'undefined') {
    const timer = setTimeout(callback, 0);
    return () => clearTimeout(timer);
  }
  let done = false;
  let fallback: ReturnType<typeof setTimeout> | null = null;
  const run = () => {
    if (done) return;
    done = true;
    if (fallback != null) clearTimeout(fallback);
    callback();
  };
  const handle = requestIdleCallback(run, { timeout });
  fallback = setTimeout(() => {
    if (!done) cancelIdleCallback(handle);
    run();
  }, timeout);
  return () => {
    cancelIdleCallback(handle);
    if (fallback != null) clearTimeout(fallback);
  };
};

/** Downloads a Rive file once per URL and shares its bytes between every animation using it. */
export const useRiveAsset = (src: string | ArrayBuffer | null | undefined): RiveAssetState => {
  const isBuffer = src instanceof ArrayBuffer;
  const key = isBuffer ? src.byteLength.toString() : src?.toString();
  const cached = useSyncExternalStore(subscribe, () => (key == null ? undefined : assetCache.get(key)));

  useEffect(() => {
    if (key == null || isBuffer || assetCache.has(key)) return;
    const file = new RiveFile({ src: key });
    runWhenIdle(() => {
      void file.init();
      file.on(EventType.Load, () => storeBuffer(key, (file as unknown as { buffer: ArrayBuffer }).buffer));
      file.on(EventType.LoadError, (error) => console.error('Rive file load error', key, error));
    });
  }, [key, isBuffer]);

  if (isBuffer) return { status: RiveAssetStatus.Loaded, buffer: src };
  return cached ?? LOADING;
};
