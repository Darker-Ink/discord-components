import { createContext, useContext, useSyncExternalStore } from 'react';
import type { SlotName, WebhookResult } from '../core';
import type { SlotGeometry } from './dnd/geometry';

/** A place a node can be dropped: the list (`parentId` + `slot`) and the index in it, before the drop. */
export interface DropSlot {
  parentId: string | null;
  slot: SlotName;
  index: number;
}

export interface DragState {
  /** The uid of the node being dragged, or `palette:<template>` for a new one. */
  activeId: string;
  /** The template a palette drag inserts. */
  template?: string;
  label: string;
}

/** What the Send tab holds between visits. */
export interface WebhookDraft {
  url: string;
  threadId: string;
  remember: boolean;
  sending?: boolean;
  result: WebhookResult | null;
}

export interface BuilderUIState {
  selectedId: string | null;
  /** A text field to focus once its node renders (after selecting it from the issues list, or adding it). */
  pendingFocus: { uid: string; field?: string } | null;
  drag: DragState | null;
  dropTarget: DropSlot | null;
  /** Where the drop indicator is drawn (viewport coordinates). */
  dropShape: SlotGeometry['shape'] | null;
  /** The node whose menu is open, and where. */
  contextMenu: { uid: string; x: number; y: number } | null;
  webhook: WebhookDraft | null;
}

type Listener = () => void;

/**
 * The editor's own state (what is selected, what is being dragged), kept out of the document so it never ends
 * up in the undo history, and in a store rather than React state so a node only re-renders when its own
 * selection changes.
 */
export const createBuilderUIStore = () => {
  let state: BuilderUIState = {
    selectedId: null,
    pendingFocus: null,
    drag: null,
    dropTarget: null,
    dropShape: null,
    contextMenu: null,
    webhook: null,
  };
  const listeners = new Set<Listener>();
  const frames = new Map<string, HTMLElement>();
  const lists = new Map<string, HTMLElement>();
  return {
    /** How the user last interacted (focus selects a node only when it comes from the keyboard). */
    modality: 'pointer' as 'pointer' | 'keyboard',
    getState: () => state,
    set(patch: Partial<BuilderUIState>) {
      const next = { ...state, ...patch };
      if ((Object.keys(patch) as (keyof BuilderUIState)[]).every((key) => next[key] === state[key])) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Elements of rendered nodes, by uid (drop indicators and keyboard focus are measured from them). */
    frames,
    /** Elements of lists that can be empty (a container, an action row), by `listKey`. */
    lists,
  };
};

export type BuilderUIStore = ReturnType<typeof createBuilderUIStore>;

export const listKey = (parentId: string | null, slot: SlotName) => `${parentId ?? 'root'}:${slot}`;

export const BuilderUIContext = createContext<BuilderUIStore | null>(null);

BuilderUIContext.displayName = 'BuilderUIContext';

export const useBuilderUIStore = () => {
  const store = useContext(BuilderUIContext);
  if (store == null) throw new Error('Builder components must be rendered inside <BuilderProvider>.');
  return store;
};

export const useBuilderUI = <T>(selector: (state: BuilderUIState) => T): T => {
  const store = useBuilderUIStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
};

export const useIsSelected = (uid: string) => useBuilderUI((state) => state.selectedId === uid);
