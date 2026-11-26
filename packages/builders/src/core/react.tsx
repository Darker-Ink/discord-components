import { createContext, use, useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import {
  createBuilderStore,
  isBuilderDocument,
  type ActionResult,
  type BuilderAction,
  type BuilderActions,
  type BuilderState,
  type BuilderStore,
  type BuilderStoreOptions,
} from './store';
import { findNode } from './tree';
import { ROOT_UID } from './types';
import type { BuilderDocument, BuilderNode, NodeLocation, ValidationIssue, WebhookMessagePayload } from './types';
import type { DocumentStats } from './validate';

export interface MessageBuilderOptions extends Omit<BuilderStoreOptions, 'onChange'> {
  /** Controlled document. Changes made by the builder come back through `onChange`. */
  value?: BuilderDocument;
  /** Initial document or API payload (uncontrolled). */
  defaultValue?: BuilderDocument | WebhookMessagePayload;
  onChange?: (doc: BuilderDocument) => void;
}

export interface MessageBuilderApi {
  store: BuilderStore;
  doc: BuilderDocument;
  selection: string | null;
  issues: ValidationIssue[];
  stats: DocumentStats;
  actions: BuilderActions;
  dispatch: (action: BuilderAction) => ActionResult;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** The current document as an API payload. */
  toJSON: () => WebhookMessagePayload;
}

const OPTION_KEYS = new Set(['value', 'defaultValue', 'onChange', 'limit', 'coalesceMs', 'validation']);

const isOptions = (value: unknown): value is MessageBuilderOptions =>
  typeof value === 'object' &&
  value !== null &&
  !isBuilderDocument(value) &&
  Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => OPTION_KEYS.has(key));

/** Subscribes to a store and returns the builder API. */
export const useBuilderApi = (store: BuilderStore): MessageBuilderApi => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const issues = useSyncExternalStore(store.subscribe, store.getIssues, store.getIssues);
  return {
    store,
    doc: snapshot.doc,
    selection: snapshot.selection,
    issues,
    stats: store.getStats(),
    actions: store.actions,
    dispatch: store.dispatch,
    undo: store.actions.undo,
    redo: store.actions.redo,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    toJSON: store.toJSON,
  };
};

/**
 * Creates a message builder: the document, its validation issues and the editing actions with undo/redo.
 * Takes options (`value`/`onChange` for a controlled builder, `defaultValue` otherwise) or, as a shorthand,
 * the initial document or API payload.
 */
export const useMessageBuilder = (
  init?: MessageBuilderOptions | BuilderDocument | WebhookMessagePayload,
): MessageBuilderApi => {
  const options: MessageBuilderOptions = isOptions(init) ? init : { defaultValue: init };
  const { value, defaultValue, onChange, limit, coalesceMs, validation } = options;
  const [store] = useState(() =>
    createBuilderStore(value ?? defaultValue, { onChange, limit, coalesceMs, validation }),
  );
  useLayoutEffect(() => {
    store.setOptions({ onChange, limit, coalesceMs, validation });
  }, [store, onChange, limit, coalesceMs, validation]);
  useEffect(() => {
    if (value) store.sync(value);
  }, [store, value]);
  return useBuilderApi(store);
};

const BuilderStoreContext = createContext<BuilderStore | null>(null);
BuilderStoreContext.displayName = 'BuilderStoreContext';

export interface MessageBuilderProviderProps extends MessageBuilderOptions {
  /** A builder from `useMessageBuilder` (or a store from `createBuilderStore`). Without one, a builder is created. */
  builder?: MessageBuilderApi | BuilderStore;
  children?: ReactNode;
}

const OwnBuilderProvider = ({ children, ...options }: Omit<MessageBuilderProviderProps, 'builder'>) => {
  const { store } = useMessageBuilder(options);
  return <BuilderStoreContext value={store}>{children}</BuilderStoreContext>;
};
OwnBuilderProvider.displayName = 'OwnBuilderProvider';

/** Makes a builder available to `useBuilder`, `useBuilderNode` and the other hooks below it. */
export const MessageBuilderProvider = ({ builder, children, ...options }: MessageBuilderProviderProps) => {
  if (!builder) return <OwnBuilderProvider {...options}>{children}</OwnBuilderProvider>;
  const store = 'store' in builder ? builder.store : builder;
  return <BuilderStoreContext value={store}>{children}</BuilderStoreContext>;
};
MessageBuilderProvider.displayName = 'MessageBuilderProvider';

/** The store of the nearest `MessageBuilderProvider`. */
export const useBuilderStore = (): BuilderStore => {
  const store = use(BuilderStoreContext);
  if (!store) throw new Error('useBuilderStore must be used inside a MessageBuilderProvider');
  return store;
};

/** The full builder API from context. Re-renders on every change; prefer the narrower hooks in editors. */
export const useBuilder = (): MessageBuilderApi => useBuilderApi(useBuilderStore());

/** The editing actions (stable: never causes a re-render). */
export const useBuilderActions = (): BuilderActions => useBuilderStore().actions;

/**
 * A value derived from the builder state; re-renders only when it changes (`isEqual`, default `Object.is`).
 */
export const useBuilderSelector = <T,>(
  selector: (state: BuilderState, store: BuilderStore) => T,
  isEqual?: (a: T, b: T) => boolean,
): T => {
  const store = useBuilderStore();
  const select = useCallback((state: BuilderState) => selector(state, store), [selector, store]);
  return useSyncExternalStoreWithSelector(store.subscribe, store.getState, store.getState, select, isEqual);
};

/** One node by uid; re-renders only when that node (or something under it) changes. */
export const useBuilderNode = <T extends BuilderNode = BuilderNode>(uid: string): T | null =>
  useBuilderSelector(useCallback((state: BuilderState) => (findNode(state.doc, uid)?.node as T) ?? null, [uid]));

const locationsEqual = (a: NodeLocation | null, b: NodeLocation | null) =>
  a === b ||
  (a != null &&
    b != null &&
    a.node === b.node &&
    a.parentId === b.parentId &&
    a.slot === b.slot &&
    a.index === b.index &&
    a.path.length === b.path.length);

/** A node with its kind, parent, slot and index. */
export const useNodeLocation = (uid: string): NodeLocation | null =>
  useBuilderSelector(
    useCallback((state: BuilderState) => findNode(state.doc, uid), [uid]),
    locationsEqual,
  );

/** The selected uid and a setter. */
export const useBuilderSelection = (): [string | null, (uid: string | null) => void] => {
  const store = useBuilderStore();
  const selection = useBuilderSelector(useCallback((state: BuilderState) => state.selection, []));
  return [selection, store.actions.select];
};

const issueKey = (issue: ValidationIssue) =>
  `${issue.severity}\u0000${issue.code}\u0000${issue.message}\u0000${issue.path.join('.')}`;

/** Whether two issue lists say the same thing (used to keep issue arrays stable between keystrokes). */
export const issuesEqual = (a: readonly ValidationIssue[], b: readonly ValidationIssue[]) =>
  a === b || (a.length === b.length && a.every((issue, index) => issueKey(issue) === issueKey(b[index])));

const isUnder = (path: readonly (string | number)[], prefix: readonly (string | number)[]) =>
  prefix.length <= path.length && prefix.every((part, index) => path[index] === part);

/** All validation issues of the document. */
export const useBuilderIssues = (): ValidationIssue[] =>
  useBuilderSelector(
    useCallback((_state: BuilderState, store: BuilderStore) => store.getIssues(), []),
    issuesEqual,
  );

/**
 * Issues of one node (`ROOT_UID` for the message's own fields), or with `deep` of everything under it too.
 * The array stays the same until the node's issues change.
 */
export const useNodeIssues = (uid: string, { deep = false }: { deep?: boolean } = {}): ValidationIssue[] =>
  useBuilderSelector(
    useCallback(
      (state: BuilderState, store: BuilderStore) => {
        const issues = store.getIssues();
        if (!deep) return issues.filter((issue) => issue.nodeId === uid);
        if (uid === ROOT_UID) return issues;
        const location = findNode(state.doc, uid);
        return location ? issues.filter((issue) => isUnder(issue.path, location.path)) : [];
      },
      [uid, deep],
    ),
    issuesEqual,
  );

const statsEqual = (a: DocumentStats, b: DocumentStats) =>
  (Object.keys(a) as (keyof DocumentStats)[]).every((key) => a[key] === b[key]);

/** Character and component totals for counters. */
export const useDocumentStats = (): DocumentStats =>
  useBuilderSelector(
    useCallback((_state: BuilderState, store: BuilderStore) => store.getStats(), []),
    statsEqual,
  );
