import { useMemo } from 'react';
import { useBuilderStore } from '../core';

/**
 * The nearest builder's store and actions, without subscribing to changes (editors subscribe to just their node
 * with `useBuilderNode`, so a keystroke re-renders one editor, not the canvas).
 */
export const useBuilderContext = () => {
  const store = useBuilderStore();
  return useMemo(
    () => ({ store, actions: store.actions, undo: store.actions.undo, redo: store.actions.redo }),
    [store],
  );
};
