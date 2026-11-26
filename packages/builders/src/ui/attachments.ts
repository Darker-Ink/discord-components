import type { APIAttachment } from '@discord-mana/messages';
import {
  componentKind,
  findNode,
  walkNode,
  type APIAttachmentRequest,
  type BuilderActions,
  type BuilderDocument,
  type BuilderNode,
  type BuilderStore,
  type NodeKind,
} from '../core';
import { patchField, readField } from './fields';
import type { BuilderFiles, StoredFile } from './files';

// Attachments are the payload's `attachments` (`{ id, filename, description }`, `id` being the `n` of
// `files[n]`), kept in the document so they undo, export and restore like everything else; the bytes are in
// `BuilderFiles`. A spoiler is Discord's `SPOILER_` file name prefix.

export const ATTACHMENT_SCHEME = 'attachment://';
export const SPOILER_PREFIX = 'SPOILER_';

export const isSpoilerName = (name: string) => name.startsWith(SPOILER_PREFIX);

/** `AttachmentFlags.IsSpoiler` (kept here so this module has no runtime dependency on the renderer). */
const IS_SPOILER = 1 << 3;

/** The name without the spoiler prefix (what the client shows). */
export const displayName = (name: string) => (isSpoilerName(name) ? name.slice(SPOILER_PREFIX.length) : name);

/** The attachment:// URL of a file. */
export const attachmentUrl = (name: string) => `${ATTACHMENT_SCHEME}${name}`;

/** The file an attachment:// URL names, or null. */
export const attachmentName = (url: unknown) =>
  typeof url === 'string' && url.startsWith(ATTACHMENT_SCHEME) ? url.slice(ATTACHMENT_SCHEME.length) : null;

/**
 * A name attachment:// can refer to: Discord only matches ASCII letters, digits, underscores, dashes and dots
 * (reference.mdx, "Uploading Files"), so anything else becomes an underscore.
 */
export const sanitizeFilename = (name: string) => {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+/, '');
  return cleaned === '' ? 'file' : cleaned;
};

/** `name`, or `name-2.ext`, `name-3.ext`… if it is taken. */
export const uniqueFilename = (name: string, taken: ReadonlySet<string>) => {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  for (let index = 2; ; index++) {
    const next = `${base}-${index}${extension}`;
    if (!taken.has(next)) return next;
  }
};

export const readAttachments = (doc: BuilderDocument): APIAttachmentRequest[] =>
  Array.isArray(doc.attachments) ? doc.attachments : [];

const withIds = (attachments: APIAttachmentRequest[]) =>
  attachments.map((attachment, index) => ({ ...attachment, id: index }));

/** Where a node can point at a file, by kind. */
const MEDIA_FIELDS: Partial<Record<NodeKind, readonly string[]>> = {
  embed: ['image.url', 'thumbnail.url', 'author.icon_url', 'footer.icon_url'],
  thumbnail: ['media.url'],
  mediaGalleryItem: ['media.url'],
  file: ['file.url'],
};

const forEachNode = (doc: BuilderDocument, visit: (node: BuilderNode, kind: NodeKind) => void) => {
  for (const embed of doc.embeds) walkNode(embed, 'embed', visit);
  for (const component of doc.components) walkNode(component, componentKind(component.type), visit);
};

/** Every attachment:// reference in the message: the node, its field and the file name. */
export const findAttachmentRefs = (doc: BuilderDocument) => {
  const refs: { uid: string; field: string; name: string }[] = [];
  forEachNode(doc, (node, kind) => {
    for (const field of MEDIA_FIELDS[kind] ?? []) {
      const name = attachmentName(readField(node, field));
      if (name != null) refs.push({ uid: node.uid, field, name });
    }
  });
  return refs;
};

/** The file names the message uses (attachment:// references). */
export const referencedFiles = (doc: BuilderDocument) => new Set(findAttachmentRefs(doc).map((ref) => ref.name));

/** Stores the files and adds them to the message's attachments. Returns their names in the message. */
export const attachFiles = (store: BuilderStore, files: BuilderFiles, list: readonly (File | Blob)[]): string[] => {
  const doc = store.getState().doc;
  const current = readAttachments(doc);
  const taken = new Set(current.map((attachment) => attachment.filename ?? ''));
  const names: string[] = [];
  for (const file of list) {
    const raw = 'name' in file && typeof file.name === 'string' ? file.name : 'file';
    const name = uniqueFilename(sanitizeFilename(raw), taken);
    taken.add(name);
    files.put(name, file);
    names.push(name);
  }
  if (names.length > 0) {
    store.actions.updateMessage({
      attachments: withIds([...current, ...names.map((filename) => ({ id: 0, filename }))]),
    });
  }
  return names;
};

/** Puts bytes back under the name of an attachment whose file is missing. */
export const reattachFile = (files: BuilderFiles, name: string, file: Blob) => {
  files.put(name, file);
};

const patchAttachment = (
  actions: BuilderActions,
  doc: BuilderDocument,
  name: string,
  patch: (attachment: APIAttachmentRequest) => APIAttachmentRequest | null,
) => {
  const next = readAttachments(doc)
    .map((attachment) => (attachment.filename === name ? patch(attachment) : attachment))
    .filter((attachment): attachment is APIAttachmentRequest => attachment != null);
  actions.updateMessage({ attachments: next.length > 0 ? withIds(next) : undefined });
};

/**
 * Renames an attachment and every attachment:// reference to it (one undo step). The name is cleaned up and
 * made unique; returns the name it got.
 */
export const renameAttachment = (store: BuilderStore, files: BuilderFiles, from: string, to: string) => {
  const doc = store.getState().doc;
  const taken = new Set(
    readAttachments(doc)
      .map((attachment) => attachment.filename ?? '')
      .filter((name) => name !== from),
  );
  const name = uniqueFilename(sanitizeFilename(to), taken);
  if (name === from) return from;
  files.alias(from, name);
  store.actions.batch(() => {
    patchAttachment(store.actions, doc, from, (attachment) => ({ ...attachment, filename: name }));
    for (const ref of findAttachmentRefs(doc)) {
      if (ref.name !== from) continue;
      const node = findNode(store.getState().doc, ref.uid)?.node;
      if (node != null) store.actions.update(ref.uid, patchField(node, ref.field, attachmentUrl(name)));
    }
  });
  return name;
};

/** Spoilers are the `SPOILER_` name prefix, so this renames the file (and what refers to it). */
export const setAttachmentSpoiler = (store: BuilderStore, files: BuilderFiles, name: string, spoiler: boolean) => {
  if (isSpoilerName(name) === spoiler) return name;
  return renameAttachment(store, files, name, spoiler ? `${SPOILER_PREFIX}${name}` : displayName(name));
};

export const setAttachmentDescription = (actions: BuilderActions, doc: BuilderDocument, name: string, text: string) =>
  patchAttachment(actions, doc, name, (attachment) => {
    const { description: _description, ...rest } = attachment;
    return text === '' ? rest : { ...rest, description: text };
  });

/** Removes an attachment; references to it stay (and are reported) so nothing else changes under the user. */
export const removeAttachment = (actions: BuilderActions, doc: BuilderDocument, name: string) =>
  patchAttachment(actions, doc, name, () => null);

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif)$/i;
const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)$/i;

/** Whether a file shows as media (in a gallery, an embed's image) rather than as a file card. */
export const isMediaFile = (name: string, stored?: StoredFile) =>
  stored != null && stored.type !== ''
    ? stored.type.startsWith('image/') || stored.type.startsWith('video/')
    : IMAGE_EXTENSION.test(name) || VIDEO_EXTENSION.test(name);

export const isImageFile = (name: string, stored?: StoredFile) =>
  stored != null && stored.type !== '' ? stored.type.startsWith('image/') : IMAGE_EXTENSION.test(name);

/** What an attachment:// URL shows in the preview: the local file, sized like Discord's response would be. */
export interface ResolvedAttachment {
  url: string;
  filename: string;
  size: number;
  content_type?: string;
  width?: number;
  height?: number;
}

export type AttachmentResolver = (url: string) => ResolvedAttachment | undefined;

export const createAttachmentResolver =
  (files: BuilderFiles): AttachmentResolver =>
  (url) => {
    const name = attachmentName(url);
    if (name == null) return undefined;
    const stored = files.get(name);
    if (stored == null) return undefined;
    return {
      url: stored.url,
      filename: name,
      size: stored.size,
      content_type: stored.type || undefined,
      width: stored.width,
      height: stored.height,
    };
  };

/** The message's attachments as the API returns them, for drawing (classic messages show them all). */
export const toPreviewAttachments = (doc: BuilderDocument, files: BuilderFiles): APIAttachment[] =>
  readAttachments(doc).map((attachment, index) => {
    const name = attachment.filename ?? `file-${index}`;
    const stored = files.get(name);
    return {
      id: `${index}`,
      filename: name,
      ...(attachment.description != null ? { description: attachment.description } : {}),
      size: stored?.size ?? 0,
      url: stored?.url ?? '',
      proxy_url: stored?.url ?? '',
      ...(stored?.type ? { content_type: stored.type } : {}),
      ...(stored?.width != null ? { width: stored.width, height: stored.height } : {}),
      flags: isSpoilerName(name) ? IS_SPOILER : 0,
    };
  });

/** The files to send with the message, in the order of its attachments (`files[n]` is attachment `n`). */
export const collectUploads = (doc: BuilderDocument, files: BuilderFiles) => {
  const uploads: { name: string; data: Blob }[] = [];
  const missing: string[] = [];
  for (const attachment of readAttachments(doc)) {
    const name = attachment.filename ?? '';
    const stored = files.get(name);
    if (stored == null) missing.push(name);
    else uploads.push({ name, data: stored.blob });
  }
  return { uploads, missing };
};
