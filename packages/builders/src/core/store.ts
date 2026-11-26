// The editing state (document, selection, undo/redo history) as a pure reducer, and a small framework-agnostic
// store around it that the React bindings subscribe to.
import { duplicateNode, insertNode, moveNode, removeNode, setMode, updateNode, type SetModeOptions } from './actions';
import { fromJSON, toJSON } from './json';
import type { TemplateType } from './templates';
import { findNode } from './tree';
import { ROOT_UID } from './types';
import type {
  BuilderDocument,
  BuilderMode,
  BuilderNode,
  NodeKind,
  NodeTarget,
  SlotName,
  ValidateOptions,
  ValidationIssue,
  WebhookMessagePayload,
} from './types';
import { getDocumentStats, validateDocument, type DocumentStats } from './validate';

export type BuilderAction =
  | { type: 'insert'; target: NodeTarget; node: BuilderNode | TemplateType; kind?: NodeKind; select?: boolean }
  | { type: 'update'; uid: string | null; patch: Record<string, unknown>; coalesce?: string; time?: number }
  | { type: 'remove'; uid: string }
  | { type: 'move'; uid: string; target: NodeTarget }
  | { type: 'duplicate'; uid: string; select?: boolean }
  | { type: 'setMode'; mode: BuilderMode; convert?: boolean }
  | { type: 'replace'; doc: BuilderDocument | WebhookMessagePayload }
  | { type: 'select'; uid: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Ends the current coalesced edit, so the next edit is its own undo step. */
  | { type: 'checkpoint' };

export interface ActionResult {
  /** Whether the document changed. */
  changed: boolean;
  /** The new node's uid (insert, duplicate). */
  uid?: string | null;
  /** Why an insert/move/duplicate wasn't done. */
  reason?: string;
}

export interface BuilderState {
  doc: BuilderDocument;
  selection: string | null;
  past: readonly BuilderDocument[];
  future: readonly BuilderDocument[];
  /** The last update, for coalescing typing into one undo step. */
  lastEdit: { key: string; time: number } | null;
  /** What the last action did. */
  result: ActionResult | null;
}

export interface HistoryOptions {
  /** Undo steps kept. Default 100. */
  limit?: number;
  /** Updates of the same fields of a node within this many ms merge into one undo step. Default 600. */
  coalesceMs?: number;
}

export const isBuilderDocument = (value: unknown): value is BuilderDocument =>
  typeof value === 'object' &&
  value !== null &&
  (value as BuilderDocument).uid === ROOT_UID &&
  ((value as BuilderDocument).mode === 'classic' || (value as BuilderDocument).mode === 'cv2') &&
  Array.isArray((value as BuilderDocument).embeds) &&
  Array.isArray((value as BuilderDocument).components);

/** A document from either a document or an API payload. */
export const toDocument = (value: BuilderDocument | WebhookMessagePayload | undefined | null): BuilderDocument =>
  isBuilderDocument(value) ? value : fromJSON(value ?? {});

export const createBuilderState = (initial?: BuilderDocument | WebhookMessagePayload | null): BuilderState => ({
  doc: toDocument(initial),
  selection: null,
  past: [],
  future: [],
  lastEdit: null,
  result: null,
});

const keepSelection = (doc: BuilderDocument, selection: string | null) =>
  selection != null && selection !== ROOT_UID && !findNode(doc, selection) ? null : selection;

/** Applies a new document as one undo step (or merged into the last one, for coalesced edits). */
const commit = (
  state: BuilderState,
  doc: BuilderDocument,
  result: ActionResult,
  { limit = 100 }: HistoryOptions,
  edit: BuilderState['lastEdit'] = null,
  merge = false,
): BuilderState => {
  if (doc === state.doc)
    return { ...state, result: { ...result, changed: false }, lastEdit: merge ? state.lastEdit : null };
  const past = merge ? state.past : [...state.past, state.doc].slice(-limit);
  return {
    ...state,
    doc,
    past,
    future: [],
    lastEdit: edit,
    selection: keepSelection(doc, state.selection),
    result: { ...result, changed: true },
  };
};

/**
 * The builder's reducer: document edits with undo/redo and selection. Usable directly with `useReducer`
 * (pass `options` with a closure), or through `createBuilderStore`.
 */
export const builderReducer = (
  state: BuilderState,
  action: BuilderAction,
  options: HistoryOptions = {},
): BuilderState => {
  switch (action.type) {
    case 'insert': {
      const { doc, uid, reason } = insertNode(state.doc, action.target, action.node, action.kind);
      const next = commit(state, doc, { changed: false, uid, reason }, options);
      return uid && action.select ? { ...next, selection: uid } : next;
    }
    case 'update': {
      const doc = updateNode(state.doc, action.uid, action.patch);
      const time = action.time ?? Date.now();
      const key = action.coalesce ?? `${action.uid ?? ROOT_UID}:${Object.keys(action.patch).sort().join(',')}`;
      const merge =
        state.lastEdit != null &&
        state.lastEdit.key === key &&
        time - state.lastEdit.time < (options.coalesceMs ?? 600) &&
        state.past.length > 0;
      return commit(state, doc, { changed: false }, options, { key, time }, merge);
    }
    case 'remove':
      return commit(state, removeNode(state.doc, action.uid), { changed: false }, options);
    case 'move': {
      const doc = moveNode(state.doc, action.uid, action.target);
      return commit(
        state,
        doc,
        { changed: false, ...(doc === state.doc ? { reason: 'Not allowed here' } : {}) },
        options,
      );
    }
    case 'duplicate': {
      const { doc, uid, reason } = duplicateNode(state.doc, action.uid);
      const next = commit(state, doc, { changed: false, uid, reason }, options);
      return uid && action.select ? { ...next, selection: uid } : next;
    }
    case 'setMode': {
      const setModeOptions: SetModeOptions = action.convert === undefined ? {} : { convert: action.convert };
      return commit(state, setMode(state.doc, action.mode, setModeOptions), { changed: false }, options);
    }
    case 'replace':
      return commit(state, toDocument(action.doc), { changed: false }, options);
    case 'select':
      return state.selection === action.uid ? state : { ...state, selection: action.uid };
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        lastEdit: null,
        selection: keepSelection(previous, state.selection),
        result: { changed: true },
      };
    }
    case 'redo': {
      const [next, ...future] = state.future;
      if (!next) return state;
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc],
        future,
        lastEdit: null,
        selection: keepSelection(next, state.selection),
        result: { changed: true },
      };
    }
    case 'checkpoint':
      return state.lastEdit ? { ...state, lastEdit: null } : state;
  }
};

export interface UpdateOptions {
  /** Edits with the same key within the coalescing window are one undo step (default: node + field names). */
  coalesce?: string;
}

/** The editing API, bound to a store. */
export interface BuilderActions {
  /** Inserts a template or node; `index` -1 or undefined appends. Returns the new uid, or null if not allowed. */
  insert: (
    parentId: string | null,
    slot: SlotName | undefined,
    index: number | undefined,
    node: BuilderNode | TemplateType,
    options?: { kind?: NodeKind; select?: boolean },
  ) => string | null;
  update: (uid: string, patch: Record<string, unknown>, options?: UpdateOptions) => void;
  updateMessage: (patch: Record<string, unknown>, options?: UpdateOptions) => void;
  setContent: (content: string) => void;
  remove: (uid: string) => void;
  /** `target.index` is the final position in the target list. Returns false when the move isn't allowed. */
  move: (uid: string, target: NodeTarget) => boolean;
  duplicate: (uid: string, options?: { select?: boolean }) => string | null;
  setMode: (mode: BuilderMode, options?: SetModeOptions) => void;
  /** Replaces the whole message (undoable). */
  replace: (doc: BuilderDocument | WebhookMessagePayload) => void;
  select: (uid: string | null) => void;
  undo: () => void;
  redo: () => void;
  checkpoint: () => void;
  /** Runs `fn`; every change it makes is one undo step. Returns what `fn` returns. */
  batch: <T>(fn: () => T) => T;
}

export interface BuilderSnapshot {
  doc: BuilderDocument;
  selection: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

export interface BuilderStoreOptions extends HistoryOptions {
  /** Called with the new document after every change. */
  onChange?: (doc: BuilderDocument) => void;
  /** Options for `issues`. */
  validation?: ValidateOptions;
}

export interface BuilderStore {
  getSnapshot: () => BuilderSnapshot;
  getState: () => BuilderState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: BuilderAction) => ActionResult;
  actions: BuilderActions;
  /** Validation issues of the current document, with `nodeId`/`field`. Same array until something changes. */
  getIssues: () => ValidationIssue[];
  getStats: () => DocumentStats;
  toJSON: () => WebhookMessagePayload;
  /** Sets the document without an undo step (for controlled components). */
  sync: (doc: BuilderDocument) => void;
  setOptions: (options: Partial<BuilderStoreOptions>) => void;
}

export const createBuilderStore = (
  initial?: BuilderDocument | WebhookMessagePayload | null,
  options: BuilderStoreOptions = {},
): BuilderStore => {
  let config = { ...options };
  let state = createBuilderState(initial);
  let snapshot: BuilderSnapshot = { doc: state.doc, selection: null, canUndo: false, canRedo: false };
  const listeners = new Set<() => void>();
  let batchDepth = 0;
  let batchBase: BuilderState | null = null;

  const emit = (previous: BuilderState) => {
    if (
      state.doc === snapshot.doc &&
      state.selection === snapshot.selection &&
      state.past.length > 0 === snapshot.canUndo &&
      state.future.length > 0 === snapshot.canRedo
    ) {
      return;
    }
    snapshot = {
      doc: state.doc,
      selection: state.selection,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    };
    if (state.doc !== previous.doc) config.onChange?.(state.doc);
    for (const listener of [...listeners]) listener();
  };

  const dispatch = (action: BuilderAction): ActionResult => {
    const previous = state;
    state = builderReducer(state, action, config);
    // Inside a batch, changes don't add undo steps; the batch adds one when it ends.
    if (batchBase && state.doc !== previous.doc) state = { ...state, past: batchBase.past, future: [] };
    emit(previous);
    return state.result ?? { changed: false };
  };

  const batch = <T>(fn: () => T): T => {
    if (batchDepth === 0) batchBase = state;
    batchDepth++;
    try {
      return fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && batchBase) {
        const base = batchBase;
        batchBase = null;
        if (state.doc !== base.doc) {
          const previous = state;
          state = {
            ...state,
            past: [...base.past, base.doc].slice(-(config.limit ?? 100)),
            future: [],
            lastEdit: null,
          };
          emit(previous);
        }
      }
    }
  };

  const actions: BuilderActions = {
    insert: (parentId, slot, index, node, { kind, select } = {}) =>
      dispatch({ type: 'insert', target: { parentId, slot, index }, node, kind, select }).uid ?? null,
    update: (uid, patch, { coalesce } = {}) => {
      dispatch({ type: 'update', uid, patch, coalesce });
    },
    updateMessage: (patch, { coalesce } = {}) => {
      dispatch({ type: 'update', uid: null, patch, coalesce });
    },
    setContent: (content) => {
      dispatch({ type: 'update', uid: null, patch: { content } });
    },
    remove: (uid) => {
      dispatch({ type: 'remove', uid });
    },
    move: (uid, target) => dispatch({ type: 'move', uid, target }).changed,
    duplicate: (uid, { select } = {}) => dispatch({ type: 'duplicate', uid, select }).uid ?? null,
    setMode: (mode, { convert } = {}) => {
      dispatch({ type: 'setMode', mode, convert });
    },
    replace: (doc) => {
      dispatch({ type: 'replace', doc });
    },
    select: (uid) => {
      dispatch({ type: 'select', uid });
    },
    undo: () => {
      dispatch({ type: 'undo' });
    },
    redo: () => {
      dispatch({ type: 'redo' });
    },
    checkpoint: () => {
      dispatch({ type: 'checkpoint' });
    },
    batch,
  };

  return {
    getSnapshot: () => snapshot,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch,
    actions,
    getIssues: () => validateDocument(state.doc, config.validation),
    getStats: () => getDocumentStats(state.doc),
    toJSON: () => toJSON(state.doc),
    sync: (doc) => {
      if (doc === state.doc) return;
      const previous = state;
      state = { ...state, doc, lastEdit: null, selection: keepSelection(doc, state.selection) };
      const onChange = config.onChange;
      config = { ...config, onChange: undefined };
      emit(previous);
      config = { ...config, onChange };
    },
    setOptions: (next) => {
      const validationChanged =
        'validation' in next && JSON.stringify(next.validation) !== JSON.stringify(config.validation);
      config = { ...config, ...next };
      if (validationChanged) {
        // A new state object, so selectors (issues) run again.
        state = { ...state };
        for (const listener of [...listeners]) listener();
      }
    },
  };
};
