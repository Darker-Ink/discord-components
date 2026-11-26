import { createStore, useStore } from './createStore';
import type { ToastProps } from './Toast';

export type ToastPosition = 'top' | 'bottom';

export interface ToastOptions extends ToastProps {
  // Which container shows the toast; each surface (app, overlay, popout window…) has its own queue.
  surface?: string;
  position?: ToastPosition;
  // How long the toast stays up, at least the user's minimum toast duration. Defaults to 3 seconds.
  duration?: number;
  // A toast with the same key replaces the one showing (or queued) instead of queueing behind it.
  toastKey?: string;
}

export interface ToastEntry {
  toast: ToastOptions;
  key: number;
}

interface ToastState {
  currentToastMap: Map<string, ToastEntry>;
  queuedToastsMap: Map<string, ToastEntry[]>;
}

export const DEFAULT_TOAST_SURFACE = 'app';

let nextKey = 1;

export const toastStore = createStore<ToastState>({ currentToastMap: new Map(), queuedToastsMap: new Map() });

export const useToastStore = <Selected>(selector: (state: ToastState) => Selected) => useStore(toastStore, selector);

// Shows a toast now, or after the toasts already queued on its surface.
export const showToast = (toast: ToastOptions) => {
  const surface = toast.surface ?? DEFAULT_TOAST_SURFACE;
  const entry: ToastEntry = { toast, key: nextKey++ };
  toastStore.setState((state) => {
    const current = state.currentToastMap.get(surface);
    if (current == null || (toast.toastKey != null && current.toast.toastKey === toast.toastKey)) {
      const currentToastMap = new Map(state.currentToastMap);
      currentToastMap.set(surface, entry);
      return { ...state, currentToastMap };
    }
    const queuedToastsMap = new Map(state.queuedToastsMap);
    const queue = [...(queuedToastsMap.get(surface) ?? [])];
    const index = toast.toastKey != null ? queue.findIndex((queued) => queued.toast.toastKey === toast.toastKey) : -1;
    if (index === -1) queue.push(entry);
    else queue[index] = entry;
    queuedToastsMap.set(surface, queue);
    return { ...state, queuedToastsMap };
  });
};

// Hides the toast showing on a surface and brings in the next queued one.
export const popToast = (surface: string = DEFAULT_TOAST_SURFACE) => {
  toastStore.setState((state) => {
    const queue = state.queuedToastsMap.get(surface) ?? [];
    const currentToastMap = new Map(state.currentToastMap);
    if (queue.length === 0) {
      currentToastMap.delete(surface);
      return { ...state, currentToastMap };
    }
    const queuedToastsMap = new Map(state.queuedToastsMap);
    currentToastMap.set(surface, queue[0]);
    queuedToastsMap.set(surface, queue.slice(1));
    return { ...state, currentToastMap, queuedToastsMap };
  });
};
