import { createContext } from 'react';

export const ComponentActions = {
  POPOUT_CLOSE: 'POPOUT_CLOSE',
  POPOUT_CLOSE_AFTER_MODALS: 'POPOUT_CLOSE_AFTER_MODALS',
  POPOUT_SHOW: 'POPOUT_SHOW',
  POPOUT_HIDE: 'POPOUT_HIDE',
  MODAL_CLOSE: 'MODAL_CLOSE',
  MEDIA_MODAL_CLOSE: 'MEDIA_MODAL_CLOSE',
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

// Discord's client handles Escape with a global keybind that asks, in order, the media viewer, the
// popouts opened last (including ones inside a modal), the modal stack and then popouts that were
// open below the modals to close. Without the client, the dispatcher does it itself.
const ESCAPE_ACTIONS = [
  ComponentActions.MEDIA_MODAL_CLOSE,
  ComponentActions.POPOUT_CLOSE,
  ComponentActions.MODAL_CLOSE,
  ComponentActions.POPOUT_CLOSE_AFTER_MODALS,
] as const;

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const action = ESCAPE_ACTIONS.find((name) => windowDispatch.hasSubscribers(name));
    if (action == null) return;
    windowDispatch.dispatch(action, event);
    // Like a keybind handler returning false in the client's key binding library.
    event.preventDefault();
    event.stopPropagation();
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
