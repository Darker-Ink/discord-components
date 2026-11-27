import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  MessageResolversContext,
  useMessageResolvers,
  type MessageResolvers,
  type RenderEmbedMarkdown,
  type RenderMessageMarkdown,
} from '@discord-mana/messages';
import { EditorResolversContext, type EditorResolvers } from '@discord-mana/slate';
import {
  findNode,
  MessageBuilderProvider,
  useBuilderStore,
  type BuilderStore,
  type MessageBuilderApi,
  type MessageBuilderOptions,
} from '../core';
import { attachToMessage, hasFiles } from './attach';
import { BuilderDndProvider } from './dnd/BuilderDnd';
import { BuilderFilesContext, createBuilderFiles, useBuilderFiles, type BuilderFiles } from './files';
import { isMod } from './NodeFrame';
import { BuilderRenderContext, DEFAULT_RENDER_OPTIONS, type BuilderRenderOptions } from './renderContext';
import { BuilderUIContext, createBuilderUIStore } from './uiStore';

const ScopeContext = createContext<string>('');

ScopeContext.displayName = 'BuilderScopeContext';

/**
 * Marks an element as part of a builder, so its shortcuts (undo, redo) work while focus is inside it. Spread on
 * the root of each piece you lay out yourself.
 */
export const useBuilderScope = () => ({ 'data-builder-scope': useContext(ScopeContext) });

export interface BuilderProviderProps extends MessageBuilderOptions {
  /** A builder from `useMessageBuilder` (or a store). Without one, a builder is made from the options. */
  builder?: MessageBuilderApi | BuilderStore;
  /** Users, roles, channels, emoji and avatar URLs for markdown and mentions. */
  resolvers?: MessageResolvers;
  /** The same for the text editors' pills (mentions while typing); defaults to `resolvers` where they overlap. */
  editorResolvers?: EditorResolvers;
  renderMessageMarkdown?: RenderMessageMarkdown;
  renderEmbedMarkdown?: RenderEmbedMarkdown;
  /** Shows the message without any editing. */
  readOnly?: boolean;
  /** `docked` puts a selected node's tools in a bar along the bottom of the screen (for phones). */
  toolbarPlacement?: 'floating' | 'docked';
  /** The channel and server the message is shown in (mentions resolve against them). */
  channelId?: string;
  guildId?: string | null;
  /** Undo/redo also when nothing in the builder has focus (the page's only editor). Default true. */
  globalShortcuts?: boolean;
  /**
   * Where attached files are kept (in memory); pass one to read or add files from outside. Without it the
   * builder keeps its own.
   */
  files?: BuilderFiles;
  children: ReactNode;
}

const Inner = ({
  resolvers,
  editorResolvers,
  renderMessageMarkdown,
  renderEmbedMarkdown,
  readOnly = false,
  toolbarPlacement = 'floating',
  channelId = DEFAULT_RENDER_OPTIONS.channelId,
  guildId = DEFAULT_RENDER_OPTIONS.guildId,
  globalShortcuts = true,
  children,
}: Omit<BuilderProviderProps, keyof MessageBuilderOptions | 'builder' | 'files'>) => {
  const store = useBuilderStore();
  const [ui] = useState(createBuilderUIStore);
  const scope = useId();
  const parentResolvers = useMessageResolvers();
  const mergedResolvers = useMemo(
    () => (resolvers != null ? { ...parentResolvers, ...resolvers } : parentResolvers),
    [parentResolvers, resolvers],
  );
  const render = useMemo<BuilderRenderOptions>(
    () => ({
      renderMessageMarkdown: renderMessageMarkdown ?? DEFAULT_RENDER_OPTIONS.renderMessageMarkdown,
      renderEmbedMarkdown: renderEmbedMarkdown ?? DEFAULT_RENDER_OPTIONS.renderEmbedMarkdown,
      readOnly,
      toolbar: toolbarPlacement,
      channelId,
      guildId,
    }),
    [channelId, guildId, readOnly, renderEmbedMarkdown, renderMessageMarkdown, toolbarPlacement],
  );
  const editorContext = useMemo(
    () => ({ guildId, channelId, resolvers: editorResolvers ?? {} }),
    [channelId, editorResolvers, guildId],
  );

  // Undo and redo while focus is in the builder (text fields handle their own keys and stop them).
  useEffect(() => {
    if (readOnly) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isMod(event) || event.altKey || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target as Element | null;
      // Native inputs (popout fields, the JSON editor) keep their own undo.
      if (target?.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]') != null)
        return;
      const inScope = target?.closest(`[data-builder-scope="${CSS.escape(scope)}"]`) != null;
      const onPage = target == null || target === document.body || target === document.documentElement;
      if (!inScope && !(globalShortcuts && onPage)) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) store.actions.redo();
      else store.actions.undo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [globalShortcuts, readOnly, scope, store]);

  useEffect(() => {
    const keyboard = () => {
      ui.modality = 'keyboard';
    };
    const pointer = (event: PointerEvent) => {
      ui.modality = event.pointerType === 'touch' ? 'touch' : 'pointer';
    };
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('pointerdown', pointer, true);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('pointerdown', pointer, true);
    };
  }, [ui]);

  // On phones the keyboard shrinks the visible area: keep the text being edited in the middle of what's left.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport == null || !window.matchMedia('(pointer: coarse)').matches) return;
    const reveal = () => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || !element.isContentEditable) return;
      if (element.closest(`[data-builder-scope="${CSS.escape(scope)}"]`) == null) return;
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const later = () => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(reveal, 150);
    };
    viewport.addEventListener('resize', later);
    document.addEventListener('focusin', later);
    return () => {
      if (timer != null) clearTimeout(timer);
      viewport.removeEventListener('resize', later);
      document.removeEventListener('focusin', later);
    };
  }, [scope]);

  // Files pasted or dropped anywhere in the builder are attached to the message.
  const files = useBuilderFiles();
  useEffect(() => {
    const attach = (list: File[]) => attachToMessage(store, ui, files, list);
    if (readOnly) return;
    const inScope = (target: EventTarget | null) =>
      target instanceof Element && target.closest(`[data-builder-scope="${CSS.escape(scope)}"]`) != null;
    const onPaste = (event: ClipboardEvent) => {
      const list = Array.from(event.clipboardData?.files ?? []);
      if (list.length === 0 || !inScope(event.target)) return;
      // Text inputs in popouts (a URL) keep pasting text.
      if ((event.target as Element).closest('input, textarea') != null) return;
      event.preventDefault();
      attach(list);
    };
    let depth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      depth++;
      if (inScope(event.target)) ui.set({ fileDrag: true });
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer) || !inScope(event.target)) return;
      event.preventDefault();
      if (event.dataTransfer != null) event.dataTransfer.dropEffect = 'copy';
      ui.set({ fileDrag: true });
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) ui.set({ fileDrag: false });
    };
    const onDrop = (event: DragEvent) => {
      depth = 0;
      ui.set({ fileDrag: false });
      if (!hasFiles(event.dataTransfer) || !inScope(event.target)) return;
      event.preventDefault();
      attach(Array.from(event.dataTransfer?.files ?? []));
    };
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, [files, readOnly, scope, store, ui]);

  // A node that no longer exists (undone, deleted elsewhere) can't stay selected.
  useEffect(
    () =>
      store.subscribe(() => {
        const { selectedId } = ui.getState();
        if (selectedId == null) return;
        if (findNode(store.getState().doc, selectedId) == null) ui.set({ selectedId: null });
      }),
    [store, ui],
  );

  return (
    <ScopeContext.Provider value={scope}>
      <BuilderUIContext.Provider value={ui}>
        <BuilderRenderContext.Provider value={render}>
          <MessageResolversContext.Provider value={mergedResolvers}>
            <EditorResolversContext.Provider value={editorContext}>
              <BuilderDndProvider>{children}</BuilderDndProvider>
            </EditorResolversContext.Provider>
          </MessageResolversContext.Provider>
        </BuilderRenderContext.Provider>
      </BuilderUIContext.Provider>
    </ScopeContext.Provider>
  );
};

Inner.displayName = 'BuilderProviderInner';

/**
 * Everything the builder's pieces share: the document (the core's `MessageBuilderProvider`), selection and
 * drag state, drag and drop, markdown rendering and resolvers. Put the pieces (`BuilderCanvas`,
 * `ComponentPalette`, `ValidationPanel`, `JsonPanel`, `WebhookPanel`) anywhere inside it.
 */
export const BuilderProvider = ({
  builder,
  value,
  defaultValue,
  onChange,
  limit,
  coalesceMs,
  validation,
  restrictions,
  target,
  files,
  ...props
}: BuilderProviderProps) => {
  const [ownFiles] = useState(createBuilderFiles);
  // attachment:// references are checked against the message's attachments.
  const checked = useMemo(() => ({ files: [], ...validation }), [validation]);
  return (
    <MessageBuilderProvider
      builder={builder}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      limit={limit}
      coalesceMs={coalesceMs}
      validation={checked}
      restrictions={restrictions}
      target={target}
    >
      <BuilderFilesContext.Provider value={files ?? ownFiles}>
        <Inner {...props} />
      </BuilderFilesContext.Provider>
    </MessageBuilderProvider>
  );
};

BuilderProvider.displayName = 'BuilderProvider';
