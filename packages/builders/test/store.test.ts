import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  builderReducer,
  createBuilderState,
  createBuilderStore,
  MessageBuilderProvider,
  useBuilderNode,
  useMessageBuilder,
  useNodeIssues,
  type BuilderDocument,
} from '../src/core';
import { fixture } from './helpers';

describe('builder store', () => {
  it('undoes and redoes edits', () => {
    const store = createBuilderStore({ content: 'a' });
    store.actions.setContent('b');
    store.actions.checkpoint();
    store.actions.insert(null, 'embeds', undefined, 'embed');
    expect(store.getSnapshot()).toMatchObject({ canUndo: true, canRedo: false });
    store.actions.undo();
    expect(store.getState().doc.embeds).toHaveLength(0);
    store.actions.undo();
    expect(store.getState().doc.content).toBe('a');
    expect(store.getSnapshot()).toMatchObject({ canUndo: false, canRedo: true });
    store.actions.redo();
    store.actions.redo();
    expect(store.getState().doc).toMatchObject({ content: 'b', embeds: [{}] });
  });

  it('coalesces typing in one field into one undo step', () => {
    let state = createBuilderState({ embeds: [{ title: '' }] });
    const uid = state.doc.embeds[0].uid;
    for (const [i, title] of ['H', 'He', 'Hel', 'Hell', 'Hello'].entries()) {
      state = builderReducer(state, { type: 'update', uid, patch: { title }, time: 1000 + i * 100 });
    }
    expect(state.past).toHaveLength(1);
    // A pause longer than the window starts a new step.
    state = builderReducer(state, { type: 'update', uid, patch: { title: 'Hello!' }, time: 3000 });
    expect(state.past).toHaveLength(2);
    // Another field is another step.
    state = builderReducer(state, { type: 'update', uid, patch: { description: 'd' }, time: 3100 });
    expect(state.past).toHaveLength(3);
    state = builderReducer(state, { type: 'undo' });
    state = builderReducer(state, { type: 'undo' });
    expect(state.doc.embeds[0].title).toBe('Hello');
    state = builderReducer(state, { type: 'undo' });
    expect(state.doc.embeds[0].title).toBe('');
  });

  it('checkpoint ends a coalesced step', () => {
    const store = createBuilderStore({ content: '' });
    store.actions.setContent('a');
    store.actions.checkpoint();
    store.actions.setContent('ab');
    expect(store.getState().past).toHaveLength(2);
  });

  it('makes a batch one undo step', () => {
    const store = createBuilderStore({});
    const uid = store.actions.batch(() => {
      const embed = store.actions.insert(null, 'embeds', undefined, 'embed')!;
      store.actions.insert(embed, 'fields', undefined, 'field');
      store.actions.update(embed, { title: 'Title' });
      store.actions.select(embed);
      return embed;
    });
    expect(store.getState().past).toHaveLength(1);
    expect(store.getSnapshot().selection).toBe(uid);
    store.actions.undo();
    expect(store.getState().doc.embeds).toHaveLength(0);
    // The removed node is no longer selected.
    expect(store.getSnapshot().selection).toBeNull();
  });

  it('reports why an insert or move failed', () => {
    const store = createBuilderStore({ flags: 32768, components: [{ type: 10, content: 'x' }] });
    expect(store.dispatch({ type: 'insert', target: { parentId: null }, node: 'embed' })).toMatchObject({
      changed: false,
      uid: null,
      reason: 'Components v2 messages cannot have embeds',
    });
    expect(store.getState().past).toHaveLength(0);
    const text = store.getState().doc.components[0].uid;
    expect(store.actions.move(text, { parentId: text })).toBe(false);
  });

  it('notifies subscribers and onChange', () => {
    const onChange = vi.fn();
    const store = createBuilderStore({}, { onChange });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.actions.setContent('hi');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: 'hi' }));
    store.actions.select('nope');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.actions.setContent('ho');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps issues and stats stable until the document changes', () => {
    const store = createBuilderStore({ content: 'x'.repeat(2001) });
    const issues = store.getIssues();
    expect(issues).toHaveLength(1);
    store.actions.select(null);
    expect(store.getIssues()).toBe(issues);
    store.actions.setContent('ok');
    expect(store.getIssues()).toEqual([]);
  });

  it('switches mode and imports JSON as undoable steps', () => {
    const store = createBuilderStore(fixture('classic-embeds'));
    store.actions.setMode('cv2');
    expect(store.toJSON().flags).toBe(32768);
    store.actions.replace(fixture('classic-simple'));
    expect(store.toJSON()).toEqual(fixture('classic-simple'));
    store.actions.undo();
    store.actions.undo();
    expect(store.toJSON()).toEqual(fixture('classic-embeds'));
  });

  it('sync sets the document without an undo step or onChange', () => {
    const onChange = vi.fn();
    const store = createBuilderStore({}, { onChange });
    store.sync(createBuilderState({ content: 'outside' }).doc);
    expect(store.getState().doc.content).toBe('outside');
    expect(store.getState().past).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('React bindings', () => {
  it('useMessageBuilder takes an initial payload and exposes the API', () => {
    let api: ReturnType<typeof useMessageBuilder> | undefined;
    const Probe = () => {
      api = useMessageBuilder(fixture('classic-simple'));
      return null;
    };
    renderToString(createElement(Probe));
    expect(api!.doc.content).toBe('Hello, World!');
    expect(api!.toJSON()).toEqual(fixture('classic-simple'));
    expect(api!.issues).toEqual([]);
    expect(api!).toMatchObject({ canUndo: false, canRedo: false, selection: null });
    expect(api!.stats.embedCharacters).toBe(41);
  });

  it('reads nodes and their issues through the provider', () => {
    const doc: BuilderDocument = createBuilderState({ embeds: [{ title: 'x'.repeat(300) }] }).doc;
    const uid = doc.embeds[0].uid;
    const seen: unknown[] = [];
    const Probe = () => {
      seen.push(
        useBuilderNode(uid),
        useNodeIssues(uid).map((issue) => issue.field),
      );
      return null;
    };
    renderToString(createElement(MessageBuilderProvider, { defaultValue: doc }, createElement(Probe)));
    expect(seen).toEqual([doc.embeds[0], ['title']]);
  });
});
