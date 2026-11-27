import { useEffect, useState } from 'react';
import { EventType, RiveFile } from './riveRuntime';

export const RiveAssetStatus = {
  Loading: 'loading',
  Loaded: 'loaded',
} as const;

export type RiveAssetState =
  | { status: typeof RiveAssetStatus.Loading; buffer: null }
  | { status: typeof RiveAssetStatus.Loaded; buffer: ArrayBuffer };

const LOADING: RiveAssetState = { status: RiveAssetStatus.Loading, buffer: null };

let resolveAssetUrl = (url: string) => url;

/**
 * Rive files load from the URLs Discord uses (cdn.discordapp.com). Apps that host their own copies
 * (that CDN only allows CORS from discord.com) can map each URL to theirs. Call it before rendering.
 */
export const setRiveAssetUrlResolver = (resolver: (url: string) => string) => {
  resolveAssetUrl = resolver;
};

const assetCache = new Map<string, RiveAssetState>();
let overrideCache: Record<string, ArrayBuffer> = {};
const listeners = new Set<() => void>();
let storeVersion = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notify = () => {
  storeVersion++;
  listeners.forEach((listener) => listener());
};

// Re-renders when the store changes, reading it during render. Unlike useSyncExternalStore, the
// re-renders aren't synchronous: a page that loads many files at once (each mounting an animation whose
// canvas sizes itself in effects) would otherwise exceed React's nested update limit.
const useStore = <T>(read: () => T) => {
  const [, setVersion] = useState(storeVersion);
  useEffect(() => {
    const listener = () => setVersion(storeVersion);
    // The store may have changed between rendering and subscribing.
    listener();
    return subscribe(listener);
  }, []);
  return read();
};

const storeBuffer = (src: string, buffer: ArrayBuffer) => {
  assetCache.set(src, { status: RiveAssetStatus.Loaded, buffer });
  notify();
};

/** Replaces the file behind a Rive URL, e.g. to preview a new version of an animation. */
export const setRiveAssetOverride = (src: string, buffer: ArrayBuffer) => {
  overrideCache = { ...overrideCache, [src]: buffer };
  notify();
};

export const useRiveAssetOverride = (src: string | null | undefined) =>
  useStore(() => (src == null ? undefined : overrideCache[src]));

export const useHasRiveAssetOverride = (src: string) => useRiveAssetOverride(src) != null;

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
  const override = useRiveAssetOverride(key);
  const cached = useStore(() => (key == null ? undefined : assetCache.get(key)));

  useEffect(() => {
    if (key == null || override != null || isBuffer || assetCache.has(key)) return;
    const file = new RiveFile({ src: resolveAssetUrl(key) });
    runWhenIdle(() => {
      // A failed download is reported through LoadError below.
      file.init().catch(() => {});
      file.on(EventType.Load, () => storeBuffer(key, (file as unknown as { buffer: ArrayBuffer }).buffer));
      file.on(EventType.LoadError, (error) => console.error('Rive file load error', key, error));
    });
  }, [key, override, isBuffer]);

  if (override != null) return { status: RiveAssetStatus.Loaded, buffer: override };
  if (isBuffer) return { status: RiveAssetStatus.Loaded, buffer: src };
  return cached ?? LOADING;
};
