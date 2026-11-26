import { useSyncExternalStore } from 'react';

// A minimal zustand-style store: Discord keeps toast state in zustand stores read through selectors.
export interface Store<State> {
  getState: () => State;
  setState: (update: State | ((state: State) => State)) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createStore = <State>(initialState: State): Store<State> => {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (update) => {
      const next = typeof update === 'function' ? (update as (state: State) => State)(state) : update;
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useStore = <State, Selected>(store: Store<State>, selector: (state: State) => Selected) =>
  useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
