import { useCallback } from 'react';
import { AccessibilityAnnouncer } from '@discord-mana/components';
import {
  createUid,
  isMessageFieldAllowed,
  isTemplateAllowed,
  type BuilderNode,
  type BuilderStore,
  type TemplateType,
} from '../core';
import { attachFiles, attachmentUrl, isMediaFile } from './attachments';
import { findInsertTarget } from './ComponentPalette';
import { useBuilderFiles, type BuilderFiles } from './files';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore, type BuilderUIStore } from './uiStore';

/**
 * Opens the system's file picker. Call it from a click (or another user gesture): browsers only open it then.
 * Resolves with the chosen files (none when cancelled, where the browser says so).
 */
export const pickFiles = ({ multiple = true, accept }: { multiple?: boolean; accept?: string } = {}) =>
  new Promise<File[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    if (accept != null) input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve([]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });

/**
 * In Components v2, only files a component points at are shown: new media goes in a gallery, other files in
 * File components, next to the selection (or at the end).
 */
const showInComponents = (store: BuilderStore, ui: BuilderUIStore, files: BuilderFiles, names: string[]) => {
  const restrictions = store.getRestrictions();
  const media = names.filter((name) => isMediaFile(name, files.get(name)));
  const others = names.filter((name) => !media.includes(name));
  const place = (template: TemplateType, node: BuilderNode) => {
    if (!isTemplateAllowed(template, restrictions)) return null;
    const doc = store.getState().doc;
    const target = findInsertTarget(doc, template, ui.getState().selectedId, restrictions);
    if (target == null) return null;
    return store.actions.insert(target.parentId, target.slot, target.index, node);
  };
  let last: string | null = null;
  store.actions.batch(() => {
    if (media.length > 0) {
      last =
        place('media-gallery', {
          uid: createUid(),
          type: 12,
          items: media.slice(0, 10).map((name) => ({ uid: createUid(), media: { url: attachmentUrl(name) } })),
        } as BuilderNode) ?? last;
    }
    for (const name of others) {
      last = place('file', { uid: createUid(), type: 13, file: { url: attachmentUrl(name) } } as BuilderNode) ?? last;
    }
  });
  if (last != null) ui.set({ selectedId: last });
};

/**
 * Attaches files to the message (drop, paste or the picker). In Components v2 they are also shown, in a
 * gallery or File components. Returns the names they got, or `[]` when this builder takes no files.
 */
export const attachToMessage = (
  store: BuilderStore,
  ui: BuilderUIStore,
  files: BuilderFiles,
  list: readonly File[],
  { show = true }: { show?: boolean } = {},
): string[] => {
  if (list.length === 0) return [];
  if (!isMessageFieldAllowed(store.getRestrictions(), 'attachments')) {
    AccessibilityAnnouncer.announce('Files can’t be attached here.', 'polite');
    return [];
  }
  const names = store.actions.batch(() => {
    const attached = attachFiles(store, files, list);
    if (show && store.getState().doc.mode === 'cv2') showInComponents(store, ui, files, attached);
    return attached;
  });
  AccessibilityAnnouncer.announce(
    names.length === 1 ? `Attached ${names[0]}.` : `Attached ${names.length} files.`,
    'polite',
  );
  return names;
};

/** `attachToMessage` for this builder. */
export const useAttachFiles = () => {
  const { store } = useBuilderContext();
  const files = useBuilderFiles();
  const ui = useBuilderUIStore();
  return useCallback(
    (list: readonly File[], options?: { show?: boolean }) => attachToMessage(store, ui, files, list, options),
    [files, store, ui],
  );
};

/** Whether a drag carries files (from the desktop, another app). */
export const hasFiles = (transfer: DataTransfer | null) =>
  transfer != null && Array.from(transfer.types).includes('Files');
