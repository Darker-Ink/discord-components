import { describe, expect, it } from 'vitest';
import { createBuilderStore, validateDocument } from '../src/core';
import {
  attachFiles,
  collectUploads,
  findAttachmentRefs,
  removeAttachment,
  renameAttachment,
  sanitizeFilename,
  setAttachmentSpoiler,
  toPreviewAttachments,
  uniqueFilename,
} from '../src/ui/attachments';
import { createBuilderFiles } from '../src/ui/files';

const file = (name: string, text = 'data', type = 'text/plain') => new File([text], name, { type });

describe('attachments', () => {
  it('cleans names so attachment:// can refer to them, and keeps them unique', () => {
    expect(sanitizeFilename('harbor map (final).png')).toBe('harbor_map_final_.png');
    expect(sanitizeFilename('Café.png')).toBe('Cafe.png');
    expect(sanitizeFilename('.env')).toBe('env');
    expect(sanitizeFilename('???')).toBe('file');
    expect(uniqueFilename('a.png', new Set(['a.png', 'a-2.png']))).toBe('a-3.png');
  });

  it('attaches files as the payload’s attachments, numbered like files[n]', () => {
    const store = createBuilderStore({ content: 'Hi' });
    const files = createBuilderFiles();
    const names = attachFiles(store, files, [file('a.txt'), file('a.txt'), file('b c.png', 'x', 'image/png')]);
    expect(names).toEqual(['a.txt', 'a-2.txt', 'b_c.png']);
    expect(store.toJSON().attachments).toEqual([
      { id: 0, filename: 'a.txt' },
      { id: 1, filename: 'a-2.txt' },
      { id: 2, filename: 'b_c.png' },
    ]);
    const { uploads, missing } = collectUploads(store.getState().doc, files);
    expect(uploads.map((upload) => upload.name)).toEqual(names);
    expect(missing).toEqual([]);
  });

  it('renames (and spoilers) a file everywhere it is referenced, in one undo step', () => {
    const store = createBuilderStore({
      embeds: [
        {
          title: 'T',
          image: { url: 'attachment://map.png' },
          footer: { text: 'f', icon_url: 'attachment://map.png' },
        },
      ],
    });
    const files = createBuilderFiles();
    attachFiles(store, files, [file('map.png', 'x', 'image/png')]);
    const renamed = renameAttachment(store, files, 'map.png', 'harbor.png');
    expect(renamed).toBe('harbor.png');
    expect(store.toJSON().embeds?.[0].image?.url).toBe('attachment://harbor.png');
    expect(store.toJSON().embeds?.[0].footer?.icon_url).toBe('attachment://harbor.png');
    const spoiler = setAttachmentSpoiler(store, files, 'harbor.png', true);
    expect(spoiler).toBe('SPOILER_harbor.png');
    expect(findAttachmentRefs(store.getState().doc).map((ref) => ref.name)).toEqual([
      'SPOILER_harbor.png',
      'SPOILER_harbor.png',
    ]);
    expect(toPreviewAttachments(store.getState().doc, files)[0].flags).toBe(1 << 3);
    // The bytes stay reachable under every name, so undo and redo find them.
    store.actions.undo();
    expect(store.toJSON().attachments?.[0].filename).toBe('harbor.png');
    expect(files.get('harbor.png')).toBeDefined();
    expect(files.get('SPOILER_harbor.png')).toBe(files.get('map.png'));
  });

  it('reports references to removed files, and (in Components v2) files nothing shows', () => {
    const store = createBuilderStore({ embeds: [{ title: 'T', image: { url: 'attachment://map.png' } }] });
    const files = createBuilderFiles();
    attachFiles(store, files, [file('map.png', 'x', 'image/png')]);
    removeAttachment(store.actions, store.getState().doc, 'map.png');
    const issues = validateDocument(store.getState().doc, { files: [] });
    expect(issues.some((issue) => issue.code === 'ATTACHMENT_NOT_FOUND')).toBe(true);

    const cv2 = createBuilderStore({ flags: 1 << 15, components: [{ type: 10, content: 'Hi' }] });
    attachFiles(cv2, files, [file('notes.txt')]);
    const unreferenced = validateDocument(cv2.getState().doc, { files: [] });
    expect(unreferenced.some((issue) => issue.code === 'UNREFERENCED_ATTACHMENT')).toBe(true);
  });

  it('knows which files a restored message is missing', () => {
    const store = createBuilderStore({ content: 'Hi', attachments: [{ id: 0, filename: 'gone.png' }] });
    const { uploads, missing } = collectUploads(store.getState().doc, createBuilderFiles());
    expect(uploads).toEqual([]);
    expect(missing).toEqual(['gone.png']);
  });
});
