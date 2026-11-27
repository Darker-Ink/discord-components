import type { APIEmbed, APIMessageTopLevelComponent } from '@discord-mana/messages';
import { MessageFlag } from './limits';
import { componentKind, findNode, kindInSlot, NODE_SLOTS, slotChildren } from './tree';
import { ROOT_UID } from './types';
import type {
  APIPollCreateRequest,
  BuilderDocument,
  BuilderMode,
  BuilderNode,
  ComponentNode,
  EmbedNode,
  NodeKind,
  TopLevelComponentNode,
  WebhookMessagePayload,
} from './types';

const prefix = Math.random().toString(36).slice(2, 6);
let counter = 0;

/** A new node uid, unique within this page (and, with the random prefix, across saved documents). */
export const createUid = () => `${prefix}${(counter++).toString(36)}`;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Payload keys the builder edits; the rest are kept in `extra`. */
const PAYLOAD_KEYS = [
  'content',
  'username',
  'avatar_url',
  'tts',
  'flags',
  'thread_name',
  'applied_tags',
  'allowed_mentions',
  'embeds',
  'components',
  'attachments',
  'poll',
  'nonce',
  'enforce_nonce',
  'sticker_ids',
  'message_reference',
] as const;

/** Fields of a received message object that a request can't have; dropped when importing one. */
const RESPONSE_ONLY_KEYS = new Set([
  'id',
  'channel_id',
  'guild_id',
  'author',
  'member',
  'timestamp',
  'edited_timestamp',
  'mention_everyone',
  'mentions',
  'mention_roles',
  'mention_channels',
  'pinned',
  'type',
  'webhook_id',
  'application_id',
  'application',
  'reactions',
  'referenced_message',
  'interaction',
  'interaction_metadata',
  'thread',
  'position',
  'resolved',
  'message_snapshots',
  'call',
  'activity',
  'role_subscription_data',
  'sticker_items',
  'stickers',
]);

// ---------------------------------------------------------------------------------------------------------
// API → nodes

const toEmbedNode = (embed: unknown): EmbedNode => {
  const { fields, ...rest } = isObject(embed) ? (embed as APIEmbed) : ({} as APIEmbed);
  return {
    uid: createUid(),
    ...rest,
    fields: (Array.isArray(fields) ? fields : []).map((field) => ({ uid: createUid(), ...field })),
  };
};

const toComponentNode = (component: unknown): ComponentNode => {
  const source = isObject(component) ? component : { type: 0 };
  const node = { uid: createUid(), ...source } as Json;
  const list = (key: string, map: (child: unknown) => unknown) => {
    const value = source[key];
    node[key] = Array.isArray(value) ? value.map(map) : [];
  };
  const withUid = (child: unknown) => ({ uid: createUid(), ...(isObject(child) ? child : {}) });
  switch (componentKind(source.type as number)) {
    case 'actionRow':
    case 'container':
      list('components', toComponentNode);
      break;
    case 'section':
      list('components', toComponentNode);
      if (isObject(source.accessory)) node.accessory = toComponentNode(source.accessory);
      break;
    case 'stringSelect':
      list('options', withUid);
      break;
    case 'mediaGallery':
      list('items', withUid);
      break;
  }
  return node as unknown as ComponentNode;
};

/** Gives a node (and everything under it) new uids, e.g. for duplicates and inserted templates. */
export const reassignUids = <T extends BuilderNode>(node: T, kind: NodeKind): T => {
  const copy = { ...node, uid: createUid() } as Json;
  for (const slot of NODE_SLOTS[kind] ?? []) {
    const children = slotChildren(node, slot).map((child) => reassignUids(child, kindInSlot(child, slot)));
    if (slot === 'accessory') {
      if (children.length > 0) copy.accessory = children[0];
    } else copy[slot] = children;
  }
  return copy as T;
};

/** A poll to fill in: a question and two answers, open for a day. */
export const createPoll = (): APIPollCreateRequest => ({
  question: { text: '' },
  answers: [{ poll_media: { text: '' } }, { poll_media: { text: '' } }],
  duration: 24,
  allow_multiselect: false,
});

export const createDocument = (mode: BuilderMode = 'classic'): BuilderDocument => ({
  uid: ROOT_UID,
  mode,
  content: '',
  embeds: [],
  components: [],
  ...(mode === 'poll' ? { poll: createPoll() } : {}),
});

/**
 * Turns an API payload (Execute Webhook / Create Message body, or a received message object) into a builder
 * document. Tolerant: anything that isn't an object gives an empty document, unknown keys are kept.
 */
export const fromJSON = (payload: unknown): BuilderDocument => {
  if (!isObject(payload)) return createDocument();
  const flags = typeof payload.flags === 'number' ? payload.flags : undefined;
  const cv2 = flags != null && (flags & MessageFlag.IsComponentsV2) !== 0;
  // A poll makes a poll message; anything else that came with it is kept (and reported by validation).
  const mode: BuilderMode = cv2 ? 'cv2' : isObject(payload.poll) ? 'poll' : 'classic';
  const doc: BuilderDocument = {
    ...createDocument(mode),
    content: typeof payload.content === 'string' ? payload.content : '',
    embeds: Array.isArray(payload.embeds) ? payload.embeds.map(toEmbedNode) : [],
    components: Array.isArray(payload.components)
      ? (payload.components.map(toComponentNode) as TopLevelComponentNode[])
      : [],
  };
  const otherFlags = flags == null ? undefined : flags & ~MessageFlag.IsComponentsV2;
  if (otherFlags != null && (!cv2 || otherFlags !== 0)) doc.flags = otherFlags;
  const extra: Json = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'content' || key === 'embeds' || key === 'components' || key === 'flags') continue;
    if ((PAYLOAD_KEYS as readonly string[]).includes(key)) (doc as unknown as Json)[key] = value;
    else if (!RESPONSE_ONLY_KEYS.has(key)) extra[key] = value;
  }
  if (Object.keys(extra).length > 0) doc.extra = extra;
  return doc;
};

/**
 * Parses pasted JSON into a document. Accepts a payload, a message object, or a Discohook-style
 * `{ messages: [{ data }] }` backup (its first message).
 */
export const parseMessageJSON = (text: string): { doc: BuilderDocument | null; errors: string[] } => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { doc: null, errors: [`Invalid JSON: ${(error as Error).message}`] };
  }
  if (isObject(value) && Array.isArray(value.messages) && isObject(value.messages[0])) {
    value = isObject(value.messages[0].data) ? value.messages[0].data : value.messages[0];
  }
  if (!isObject(value)) return { doc: null, errors: ['Expected a JSON object (a message payload)'] };
  return { doc: fromJSON(value), errors: [] };
};

// ---------------------------------------------------------------------------------------------------------
// Nodes → API

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isObject(value) && Object.keys(value).length === 0);

/** Required keys of nested objects, by the property that holds them. Kept (even empty) when the object is. */
const NESTED_REQUIRED: Record<string, readonly string[]> = {
  author: ['name'],
  footer: ['text'],
  image: ['url'],
  thumbnail: ['url'],
  video: ['url'],
  media: ['url'],
  file: ['url'],
  question: ['text'],
  poll_media: ['text'],
  poll: ['question', 'answers'],
};

/** Kept whenever present: an empty `parse` means "no mentions", which differs from leaving it out. */
const KEEP_IF_PRESENT = new Set(['parse']);

const BUTTON_REQUIRED: Record<number, readonly string[]> = {
  5: ['type', 'style', 'url'],
  6: ['type', 'style', 'sku_id'],
};

/** Required keys of each node kind: written even when empty, so validation reports them. */
const requiredKeys = (node: Json, kind: NodeKind): readonly string[] => {
  switch (kind) {
    case 'embed':
      return [];
    case 'embedField':
      return ['name', 'value'];
    case 'selectOption':
      return ['label', 'value'];
    case 'mediaGalleryItem':
      return ['media'];
    case 'button':
      return BUTTON_REQUIRED[node.style as number] ?? ['type', 'style', 'custom_id'];
    case 'stringSelect':
      return ['type', 'custom_id', 'options'];
    case 'userSelect':
    case 'roleSelect':
    case 'mentionableSelect':
    case 'channelSelect':
      return ['type', 'custom_id'];
    case 'actionRow':
    case 'container':
    case 'section':
      return ['type', 'components'];
    case 'mediaGallery':
      return ['type', 'items'];
    case 'textDisplay':
      return ['type', 'content'];
    case 'thumbnail':
      return ['type', 'media'];
    case 'file':
      return ['type', 'file'];
    default:
      return ['type'];
  }
};

/** Items of these lists keep their required keys even when blank (a poll's empty answer stays an answer). */
const ITEM_REQUIRED: Record<string, readonly string[]> = { answers: ['poll_media'] };

const compactValue = (key: string, value: unknown): unknown => {
  if (Array.isArray(value)) {
    const required = ITEM_REQUIRED[key];
    return value.map((item) =>
      required != null && isObject(item) ? compactObject(item, required, true) : compactValue('', item),
    );
  }
  if (isObject(value)) return compactObject(value, NESTED_REQUIRED[key] ?? [], false);
  return value;
};

/**
 * Drops empty optional values (undefined, null, '', [] and {}) recursively. Required keys come back (as they
 * were) when the object has anything else, or always with `force`.
 */
const compactObject = (value: Json, required: readonly string[], force: boolean): Json => {
  const result: Json = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'uid') continue;
    const next = compactValue(key, child);
    if (!isEmpty(next) || KEEP_IF_PRESENT.has(key)) result[key] = next;
  }
  if (force || Object.keys(result).length > 0) {
    for (const key of required) {
      if (key in result) continue;
      const original = value[key];
      result[key] = isObject(original)
        ? compactObject(original, NESTED_REQUIRED[key] ?? [], true)
        : (original ?? (key === 'components' || key === 'items' || key === 'options' || key === 'answers' ? [] : ''));
    }
  }
  return result;
};

const apiCache = new WeakMap<object, unknown>();

const toAPI = (node: BuilderNode, kind: NodeKind): unknown => {
  let api = apiCache.get(node);
  if (api !== undefined) return api;
  if (kind === 'unknown') {
    const { uid: _uid, ...rest } = node as Json;
    api = rest;
  } else {
    const slots = NODE_SLOTS[kind] ?? [];
    const own: Json = {};
    for (const [key, value] of Object.entries(node)) {
      if (!(slots as readonly string[]).includes(key)) own[key] = value;
    }
    const result = compactObject(own, requiredKeys(node as Json, kind), true);
    for (const slot of slots) {
      const children = slotChildren(node, slot).map((child) => toAPI(child, kindInSlot(child, slot)));
      if (slot === 'accessory') {
        if (children.length > 0) result.accessory = children[0];
      } else if (children.length > 0 || requiredKeys(node as Json, kind).includes(slot)) {
        result[slot] = children;
      }
    }
    // Keep the API's key order: slot arrays where the node had them.
    api = Object.fromEntries(
      Object.keys(node)
        .filter((key) => key in result)
        .map((key) => [key, result[key]])
        .concat(Object.entries(result).filter(([key]) => !(key in node))),
    );
  }
  apiCache.set(node, api);
  return api;
};

/**
 * The API object for one node and everything under it (an embed with its fields, a container with its
 * children). Memoised per node object, so unchanged parts of the document keep the same API object.
 */
export const nodeToAPI = <T = unknown>(doc: BuilderDocument, uid: string): T | null => {
  const location = findNode(doc, uid);
  return location ? (toAPI(location.node, location.kind) as T) : null;
};

/** The API object for a node you already have (e.g. from `useBuilderNode`), given its kind. */
export const nodeToJSON = <T = unknown>(node: BuilderNode, kind: NodeKind): T => toAPI(node, kind) as T;

const payloadCache = new WeakMap<BuilderDocument, WebhookMessagePayload>();

/**
 * The document as an API payload: uids and empty optional fields removed, IS_COMPONENTS_V2 set in `cv2` mode.
 * Whatever the document holds is written out, even if the mode doesn't allow it (validation reports it).
 */
export const toJSON = (doc: BuilderDocument): WebhookMessagePayload => {
  const cached = payloadCache.get(doc);
  if (cached) return cached;
  const { uid: _uid, mode, content, embeds, components, extra, flags, ...rest } = doc;
  const payload: Json = {};
  if (content !== '') payload.content = content;
  const otherKeys = compactObject(rest as Json, [], false);
  for (const key of PAYLOAD_KEYS) {
    if (key in otherKeys) payload[key] = otherKeys[key];
    else if (key === 'flags') {
      const next = mode === 'cv2' ? (flags ?? 0) | MessageFlag.IsComponentsV2 : flags;
      if (next != null) payload.flags = mode === 'cv2' ? next : next & ~MessageFlag.IsComponentsV2;
    } else if (key === 'embeds' && embeds.length > 0)
      payload.embeds = embeds.map((embed) => toAPI(embed, 'embed')) as APIEmbed[];
    else if (key === 'components' && components.length > 0) {
      payload.components = components.map((component) =>
        toAPI(component, componentKind(component.type)),
      ) as APIMessageTopLevelComponent[];
    }
  }
  if (extra) Object.assign(payload, extra);
  payloadCache.set(doc, payload as WebhookMessagePayload);
  return payload as WebhookMessagePayload;
};

/** `JSON.stringify(toJSON(doc))`, indented by default. */
export const stringifyMessage = (doc: BuilderDocument, space: number | string = 2) =>
  JSON.stringify(toJSON(doc), null, space);
