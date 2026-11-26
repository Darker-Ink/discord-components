import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { limits } from '../core';
import { createAttachmentResolver } from './attachments';

// Files attached to the message live only here, in the page's memory: never in the document (which keeps just
// their names, as the payload's `attachments`), never in storage, and never sent anywhere but to the webhook
// with the message. A document restored from storage or a link names files whose bytes aren't here: those
// are "missing" until attached again.

export interface StoredFile {
  blob: Blob;
  /** An object URL for previews. */
  url: string;
  size: number;
  /** MIME type, `''` when unknown. */
  type: string;
  /** Images and videos, once measured. */
  width?: number;
  height?: number;
}

export interface BuilderFiles {
  /** The bytes stored under a file name (after a rename, under the old name too, so undo finds them). */
  get: (name: string) => StoredFile | undefined;
  /** Stores bytes under a name; images and videos are measured in the background. */
  put: (name: string, blob: Blob) => StoredFile;
  /** Makes the bytes of `from` also available as `to`. */
  alias: (from: string, to: string) => void;
  subscribe: (listener: () => void) => () => void;
  /** Changes whenever a file is stored or measured. */
  getVersion: () => number;
}

/** Discord's default size limit for each file (reference.mdx, "Uploading Files"). */
export const FILE_SIZE_LIMIT = limits.message.fileSize;
/**
 * The size limit of a whole request (resources/message.mdx, "Create Message > Limitations"); Execute Webhook
 * doesn't state its own, so the same is assumed for webhooks.
 */
export const REQUEST_SIZE_LIMIT = limits.message.requestSize;

export const createBuilderFiles = (): BuilderFiles => {
  const files = new Map<string, StoredFile>();
  const listeners = new Set<() => void>();
  let version = 0;
  const notify = () => {
    version++;
    for (const listener of listeners) listener();
  };
  const measure = (stored: StoredFile) => {
    if (typeof window === 'undefined') return;
    const done = (width: number, height: number) => {
      stored.width = width;
      stored.height = height;
      notify();
    };
    if (stored.type.startsWith('image/')) {
      const image = new Image();
      image.onload = () => done(image.naturalWidth, image.naturalHeight);
      image.src = stored.url;
    } else if (stored.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
      video.src = stored.url;
    }
  };
  return {
    get: (name) => files.get(name),
    put: (name, blob) => {
      const stored: StoredFile = {
        blob,
        url: typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '',
        size: blob.size,
        type: blob.type,
      };
      files.set(name, stored);
      measure(stored);
      notify();
      return stored;
    },
    alias: (from, to) => {
      const stored = files.get(from);
      if (stored == null || from === to) return;
      files.set(to, stored);
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
  };
};

export const BuilderFilesContext = createContext<BuilderFiles | null>(null);

BuilderFilesContext.displayName = 'BuilderFilesContext';

const fallback = createBuilderFiles();

/** The files attached in the nearest builder. */
export const useBuilderFiles = (): BuilderFiles => useContext(BuilderFilesContext) ?? fallback;

/** Re-renders when files are attached or measured; returns a counter to use as a memo dependency. */
export const useFilesVersion = () => {
  const files = useBuilderFiles();
  return useSyncExternalStore(files.subscribe, files.getVersion, files.getVersion);
};

/** Resolves attachment:// URLs to the attached files, for drawing the message. */
export const useAttachmentResolver = () => {
  const files = useBuilderFiles();
  const version = useFilesVersion();
  // `version` changes when a file is attached or measured.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createAttachmentResolver(files), [files, version]);
};

const UNITS = ['B', 'KB', 'MB', 'GB'];

/** A size as the client writes it (1 KB = 1024 bytes). */
export const formatBytes = (bytes: number) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)} ${UNITS[unit]}`;
};
