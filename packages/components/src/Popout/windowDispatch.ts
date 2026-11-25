import { createContext } from 'react';

export const ComponentActions = {
  POPOUT_CLOSE: 'POPOUT_CLOSE',
  POPOUT_CLOSE_AFTER_MODALS: 'POPOUT_CLOSE_AFTER_MODALS',
  POPOUT_SHOW: 'POPOUT_SHOW',
  POPOUT_HIDE: 'POPOUT_HIDE',
} as const;

export type ComponentAction = (typeof ComponentActions)[keyof typeof ComponentActions];

type Listener = (payload?: unknown) => void;

// A per-window event bus components use to ask each other to do things (e.g. close every popout).
export class ComponentDispatcher {
  #listeners = new Map<string, Listener[]>();

  dispatch(action: string, payload?: unknown) {
    for (const listener of [...(this.#listeners.get(action) ?? [])]) listener(payload);
    return this;
  }

  hasSubscribers(action: string) {
    return (this.#listeners.get(action)?.length ?? 0) > 0;
  }

  subscribe(action: string, listener: Listener) {
    const listeners = this.#listeners.get(action) ?? [];
    if (!listeners.includes(listener)) this.#listeners.set(action, [...listeners, listener]);
    return this;
  }

  unsubscribe(action: string, listener: Listener) {
    const listeners = this.#listeners.get(action);
    if (listeners != null)
      this.#listeners.set(
        action,
        listeners.filter((l) => l !== listener),
      );
    return this;
  }
}

export const windowDispatch = new ComponentDispatcher();

// Discord's client closes the open popouts when Escape isn't handled by anything else (modals go
// first). Without the client, the dispatcher does it itself.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (windowDispatch.hasSubscribers(ComponentActions.POPOUT_CLOSE)) {
      windowDispatch.dispatch(ComponentActions.POPOUT_CLOSE, event);
    }
  });
}

export interface WindowContextValue {
  renderWindow: Window;
  windowDispatch: ComponentDispatcher;
}

export const WindowContext = createContext<WindowContextValue>({
  renderWindow: window,
  windowDispatch,
});

WindowContext.displayName = 'WindowContext';
