const WORKER_URL = '/media-proxy-sw.js';
const CLAIM_TIMEOUT = 2000;

/**
 * Sample videos get their posters the way Discord's do, from `proxy_url?format=webp`. The dev server answers those
 * requests itself (vite.config.ts); a static build registers a service worker that does, and waits until it
 * controls the page so the first render's posters go through it too.
 */
export const startMediaProxy = async () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const registering = navigator.serviceWorker.register(WORKER_URL);
    // Already controlled: re-registering only checks for an update, which needn't hold up the first render.
    if (navigator.serviceWorker.controller != null) return void registering.catch(() => {});
    await registering;
    const controlled = new Promise((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
    );
    // A hard reload leaves the page uncontrolled even though the worker is already active.
    (await navigator.serviceWorker.ready).active?.postMessage('claim');
    await Promise.race([controlled, new Promise((resolve) => setTimeout(resolve, CLAIM_TIMEOUT))]);
  } catch {
    // Without the worker the sample videos still play; only their posters are missing.
  }
};
