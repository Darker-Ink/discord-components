import { ROOT_UID } from './types';
import type { BuilderDocument, BuilderNode, NodeKind, NodeLocation, SlotName } from './types';

const COMPONENT_KINDS: Record<number, NodeKind> = {
  1: 'actionRow',
  2: 'button',
  3: 'stringSelect',
  5: 'userSelect',
  6: 'roleSelect',
  7: 'mentionableSelect',
  8: 'channelSelect',
  9: 'section',
  10: 'textDisplay',
  11: 'thumbnail',
  12: 'mediaGallery',
  13: 'file',
  14: 'separator',
  17: 'container',
};

/** Component type numbers by kind (the inverse of `componentKind`). */
export const COMPONENT_TYPES = {
  actionRow: 1,
  button: 2,
  stringSelect: 3,
  userSelect: 5,
  roleSelect: 6,
  mentionableSelect: 7,
  channelSelect: 8,
  section: 9,
  textDisplay: 10,
  thumbnail: 11,
  mediaGallery: 12,
  file: 13,
  separator: 14,
  container: 17,
} as const satisfies Partial<Record<NodeKind, number>>;

export const componentKind = (type: number): NodeKind => COMPONENT_KINDS[type] ?? 'unknown';

export const SELECT_KINDS: ReadonlySet<NodeKind> = new Set([
  'stringSelect',
  'userSelect',
  'roleSelect',
  'mentionableSelect',
  'channelSelect',
]);

/** The kind of a node, given the slot it is in (embeds, fields, options and gallery items have no `type`). */
export const kindInSlot = (node: object, slot: SlotName): NodeKind => {
  if (slot === 'embeds') return 'embed';
  if (slot === 'fields') return 'embedField';
  if (slot === 'options') return 'selectOption';
  if (slot === 'items') return 'mediaGalleryItem';
  return componentKind((node as { type: number }).type);
};

/** Slots each kind of node has, in order. */
export const NODE_SLOTS: Partial<Record<NodeKind, readonly SlotName[]>> = {
  embed: ['fields'],
  actionRow: ['components'],
  section: ['components', 'accessory'],
  container: ['components'],
  stringSelect: ['options'],
  mediaGallery: ['items'],
};

/** The children of `parent` in `slot`, as a list (`accessory` gives zero or one). */
export const slotChildren = (parent: object, slot: SlotName): BuilderNode[] => {
  const value = (parent as Record<string, unknown>)[slot];
  if (slot === 'accessory') return value == null ? [] : [value as BuilderNode];
  return Array.isArray(value) ? (value as BuilderNode[]) : [];
};

interface DocumentIndex {
  byUid: Map<string, NodeLocation>;
  /** `path.join('\u0000')` → uid, to map validation paths back to nodes. */
  byPath: Map<string, string>;
}

const indexes = new WeakMap<BuilderDocument, DocumentIndex>();

export const pathKey = (path: readonly (string | number)[]) => path.join('\u0000');

const buildIndex = (doc: BuilderDocument): DocumentIndex => {
  const byUid = new Map<string, NodeLocation>();
  const byPath = new Map<string, string>();
  const visit = (
    parent: object,
    parentId: string | null,
    parentPath: (string | number)[],
    slots: readonly SlotName[],
  ) => {
    for (const slot of slots) {
      const children = slotChildren(parent, slot);
      children.forEach((node, index) => {
        const kind = kindInSlot(node, slot);
        const path = slot === 'accessory' ? [...parentPath, slot] : [...parentPath, slot, index];
        byUid.set(node.uid, { node, kind, parentId, slot, index, path });
        byPath.set(pathKey(path), node.uid);
        const childSlots = NODE_SLOTS[kind];
        if (childSlots) visit(node, node.uid, path, childSlots);
      });
    }
  };
  byPath.set(pathKey([]), ROOT_UID);
  visit(doc, null, [], ['embeds', 'components']);
  return { byUid, byPath };
};

export const getIndex = (doc: BuilderDocument): DocumentIndex => {
  let index = indexes.get(doc);
  if (!index) {
    index = buildIndex(doc);
    indexes.set(doc, index);
  }
  return index;
};

/** Finds a node by uid. Cached per document, so repeated lookups are O(1). */
export const findNode = (doc: BuilderDocument, uid: string): NodeLocation | null =>
  getIndex(doc).byUid.get(uid) ?? null;

/** The uid of the deepest node at or above a JSON path, and the rest of the path below it. */
export const nodeAtPath = (doc: BuilderDocument, path: readonly (string | number)[]) => {
  const { byPath } = getIndex(doc);
  for (let length = path.length; length >= 0; length--) {
    const uid = byPath.get(pathKey(path.slice(0, length)));
    if (uid != null) return { uid, rest: path.slice(length) };
  }
  return { uid: ROOT_UID, rest: [...path] };
};

/** Uids of a node's ancestors, nearest first (the message is not included). */
export const getAncestors = (doc: BuilderDocument, uid: string): string[] => {
  const result: string[] = [];
  let location = findNode(doc, uid);
  while (location?.parentId != null) {
    result.push(location.parentId);
    location = findNode(doc, location.parentId);
  }
  return result;
};

export const isAncestor = (doc: BuilderDocument, ancestorUid: string, uid: string) =>
  getAncestors(doc, uid).includes(ancestorUid);

/** Every node under (and including) `node`, depth first. */
export const walkNode = (node: BuilderNode, kind: NodeKind, visit: (node: BuilderNode, kind: NodeKind) => void) => {
  visit(node, kind);
  for (const slot of NODE_SLOTS[kind] ?? []) {
    for (const child of slotChildren(node, slot)) walkNode(child, kindInSlot(child, slot), visit);
  }
};

// Structural updates: replace one node and copy its ancestors, so untouched nodes keep their identity.

type Container = BuilderDocument | BuilderNode;

const withSlot = <T extends Container>(parent: T, slot: SlotName, children: BuilderNode[]): T => {
  if (slot === 'accessory') {
    const next = { ...parent } as Record<string, unknown>;
    if (children.length === 0) delete next.accessory;
    else next.accessory = children[0];
    return next as T;
  }
  return { ...parent, [slot]: children };
};

/** Replaces the children of `parentId` (null for the message) in `slot`. */
export const setSlot = (
  doc: BuilderDocument,
  parentId: string | null,
  slot: SlotName,
  update: (children: BuilderNode[]) => BuilderNode[],
): BuilderDocument => {
  if (parentId == null || parentId === ROOT_UID) return withSlot(doc, slot, update(slotChildren(doc, slot)));
  const location = findNode(doc, parentId);
  if (!location) return doc;
  return replaceNode(doc, parentId, withSlot(location.node, slot, update(slotChildren(location.node, slot))));
};

/** Replaces a node (found by uid) with `next`, copying its ancestors. */
export const replaceNode = (doc: BuilderDocument, uid: string, next: BuilderNode): BuilderDocument => {
  const location = findNode(doc, uid);
  if (!location) return doc;
  return setSlot(doc, location.parentId, location.slot, (children) => {
    const copy = [...children];
    copy[location.slot === 'accessory' ? 0 : location.index] = next;
    return copy;
  });
};
