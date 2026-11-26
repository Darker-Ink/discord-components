import { useSyncExternalStore } from 'react';

export const ControlsLayout = {
  RIGHT: 'right',
  BOTTOM: 'bottom',
  HIDDEN: 'hidden',
} as const;

export type ControlsLayoutType = (typeof ControlsLayout)[keyof typeof ControlsLayout];

type Props = Record<string, unknown>;

// The same state Discord's playground keeps in its store.
export interface PlaygroundState {
  selectedCollection: string | null;
  selectedStory: string | null;
  controlsLayout: ControlsLayoutType;
  /** Control values from a configuration link, applied when the story mounts. */
  controlOverrides: Record<string, string> | null;
  currentProps: Props | null;
  currentDefaults: Props | null;
}

const createPlaygroundStore = (initialState: PlaygroundState) => {
  let state = initialState;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    getState: () => state,
    setState: (partial: Partial<PlaygroundState>) => {
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener());
    },
    subscribe,
    useField: <Key extends keyof PlaygroundState>(key: Key) =>
      useSyncExternalStore(
        subscribe,
        () => state[key],
        () => state[key],
      ),
  };
};

export const playgroundStore = createPlaygroundStore({
  selectedCollection: null,
  selectedStory: null,
  controlsLayout: ControlsLayout.RIGHT,
  controlOverrides: null,
  currentProps: null,
  currentDefaults: null,
});
