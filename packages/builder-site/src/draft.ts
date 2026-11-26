import type { WebhookMessagePayload } from '@discord-mana/builders';

// The draft lives in this browser (autosaved) and can travel in a link: the payload, deflated and base64url'd
// into the URL's hash, so it never reaches a server.

const DRAFT_KEY = 'discord-mana-builder:draft';
export const WEBHOOK_KEY = 'discord-mana-builder:webhook';
const HASH_PREFIX = '#m=';

export const readDraft = (): WebhookMessagePayload | null => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw != null ? (JSON.parse(raw) as WebhookMessagePayload) : null;
  } catch {
    return null;
  }
};

export const writeDraft = (payload: WebhookMessagePayload) => {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Storage is full or blocked: the draft lasts until the page closes.
  }
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string) => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());

/** A link to this page with the payload in its hash. */
export const createShareUrl = async (payload: WebhookMessagePayload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const packed = await pipe(bytes, new CompressionStream('deflate-raw'));
  return `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${toBase64Url(packed)}`;
};

/** The payload in the page's hash, if it has one. */
export const readSharedPayload = async (): Promise<WebhookMessagePayload | null> => {
  const { hash } = window.location;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const bytes = await pipe(fromBase64Url(hash.slice(HASH_PREFIX.length)), new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(bytes)) as WebhookMessagePayload;
  } catch {
    return null;
  }
};

export const clearHash = () => {
  if (window.location.hash !== '')
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
};
