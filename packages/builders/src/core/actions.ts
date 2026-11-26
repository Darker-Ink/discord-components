// Pure document operations. Each returns a new document (sharing every untouched node) or, when the change
// isn't allowed, the same document.
import { convertToClassic, convertToCV2 } from './convert';
import { createUid, reassignUids } from './json';
import { limits } from './limits';
import { isModeAllowed, type BuilderRestrictions } from './restrictions';
import { checkInsert, checkMove, inferSlot, type RuleOptions } from './rules';
import { sanitize } from './sanitize';
import { createNode, isTemplateType, TEMPLATE_INFO } from './templates';
import type { TemplateType } from './templates';
import { componentKind, findNode, kindInSlot, NODE_SLOTS, replaceNode, setSlot, slotChildren, walkNode } from './tree';
import { ROOT_UID } from './types';
import type { BuilderDocument, BuilderMode, BuilderNode, NodeKind, NodeTarget, SlotName } from './types';

const clampIndex = (index: number | undefined, length: number) =>
  index == null || index < 0 || index > length ? length : index;

const parentKindOf = (doc: BuilderDocument, parentId: string | null): NodeKind | 'message' | null => {
  if (parentId == null || parentId === ROOT_UID) return 'message';
  return findNode(doc, parentId)?.kind ?? null;
};

const resolveSlot = (doc: BuilderDocument, target: NodeTarget, kind: NodeKind): SlotName | null => {
  if (target.slot) return target.slot;
  const parentKind = parentKindOf(doc, target.parentId);
  return parentKind ? inferSlot(parentKind, kind) : null;
};

const insertAt = (doc: BuilderDocument, node: BuilderNode, parentId: string | null, slot: SlotName, index?: number) =>
  setSlot(doc, parentId, slot, (children) => {
    const copy = [...children];
    copy.splice(clampIndex(index, copy.length), 0, node);
    return copy;
  });

export interface InsertResult {
  doc: BuilderDocument;
  /** The inserted node's uid, or `null` when it couldn't be inserted. */
  uid: string | null;
  reason?: string;
}

/**
 * Inserts a node (a template type, or a node: it and its children get new uids) at `target`. `kind` is needed
 * for nodes without a `type` (embeds, fields, options, gallery items) unless the target slot implies it.
 */
export const insertNode = (
  doc: BuilderDocument,
  target: NodeTarget,
  nodeOrType: BuilderNode | TemplateType,
  options?: NodeKind | RuleOptions,
): InsertResult => {
  const { kind, restrictions } =
    typeof options === 'string' ? { kind: options, restrictions: undefined } : (options ?? {});
  const nodeKind = isTemplateType(nodeOrType)
    ? TEMPLATE_INFO[nodeOrType].kind
    : (kind ??
      (target.slot ? kindInSlot(nodeOrType, target.slot) : componentKind((nodeOrType as { type: number }).type)));
  const slot = resolveSlot(doc, target, nodeKind);
  if (!slot) return { doc, uid: null, reason: 'The target no longer exists' };
  const node = isTemplateType(nodeOrType) ? createNode(nodeOrType, restrictions) : reassignUids(nodeOrType, nodeKind);
  const result = checkInsert(doc, node, { ...target, slot }, { kind: nodeKind, restrictions });
  if (!result.ok) return { doc, uid: null, reason: result.reason };
  return { doc: insertAt(doc, node, target.parentId, slot, target.index), uid: node.uid };
};

/** Keys a patch can't change: the uid, and child lists (edited with insert/move/remove). */
const PROTECTED_KEYS = new Set(['uid', 'fields', 'components', 'accessory', 'options', 'items']);

const applyPatch = <T extends object>(node: T, patch: Record<string, unknown>, protectedKeys: ReadonlySet<string>) => {
  const next = { ...node } as Record<string, unknown>;
  let changed = false;
  for (const [key, value] of Object.entries(patch)) {
    if (protectedKeys.has(key)) continue;
    if (value === undefined) {
      if (key in next) {
        delete next[key];
        changed = true;
      }
    } else if (next[key] !== value) {
      next[key] = value;
      changed = true;
    }
  }
  return changed ? (next as T) : node;
};

/** After a `type` change, adds the child lists the new kind has and drops the ones it hasn't. */
const reshape = (node: BuilderNode, from: NodeKind, to: NodeKind): BuilderNode => {
  if (from === to) return node;
  const next = { ...node } as Record<string, unknown>;
  for (const slot of NODE_SLOTS[from] ?? []) if (!(NODE_SLOTS[to] ?? []).includes(slot)) delete next[slot];
  for (const slot of NODE_SLOTS[to] ?? []) if (slot !== 'accessory' && !Array.isArray(next[slot])) next[slot] = [];
  return next as unknown as BuilderNode;
};

/**
 * Shallow-merges `patch` into a node's API fields (`undefined` removes a key). `ROOT_UID` (or `null`) updates
 * the message (`content`, `username`, `flags`…). Child lists can't be patched.
 */
export const updateNode = (doc: BuilderDocument, uid: string | null, patch: Record<string, unknown>) => {
  if (uid == null || uid === ROOT_UID) return updateMessage(doc, patch);
  const location = findNode(doc, uid);
  if (!location) return doc;
  let next = applyPatch(location.node, patch, PROTECTED_KEYS);
  if (next === location.node) return doc;
  if ('type' in patch && location.slot !== 'fields' && location.slot !== 'options' && location.slot !== 'items') {
    next = reshape(next, location.kind, componentKind((next as { type: number }).type));
  }
  return replaceNode(doc, uid, next);
};

const ROOT_PROTECTED = new Set(['uid', 'mode', 'embeds', 'components']);

/** Updates the message's own fields (`content`, `username`, `avatar_url`, `flags`, `allowed_mentions`…). */
export const updateMessage = (doc: BuilderDocument, patch: Record<string, unknown>) => {
  const next = applyPatch(doc, patch, ROOT_PROTECTED);
  if (next !== doc && typeof next.content !== 'string') return { ...next, content: '' };
  return next;
};

export const removeNode = (doc: BuilderDocument, uid: string) => {
  const location = findNode(doc, uid);
  if (!location) return doc;
  return setSlot(doc, location.parentId, location.slot, (children) => children.filter((node) => node.uid !== uid));
};

/**
 * Moves a node. `target.index` is its final position in the target list (like `arrayMove`), defaulting to
 * the end. Returns the same document when the move isn't allowed (see `checkMove`).
 */
export const moveNode = (doc: BuilderDocument, uid: string, target: NodeTarget, options: RuleOptions = {}) => {
  const location = findNode(doc, uid);
  if (!location) return doc;
  const slot = target.slot ?? resolveSlot(doc, target, location.kind);
  if (!slot) return doc;
  const resolved = { ...target, slot };
  if (!checkMove(doc, uid, resolved, options).ok) return doc;
  const sameList = (location.parentId ?? ROOT_UID) === (target.parentId ?? ROOT_UID) && location.slot === slot;
  if (sameList) {
    if (slot === 'accessory') return doc;
    const parent = location.parentId == null ? doc : findNode(doc, location.parentId)?.node;
    const to = clampIndex(target.index, slotChildren(parent ?? doc, slot).length - 1);
    if (to === location.index) return doc;
    return setSlot(doc, location.parentId, slot, (children) => {
      const copy = [...children];
      const [node] = copy.splice(location.index, 1);
      copy.splice(to, 0, node);
      return copy;
    });
  }
  return insertAt(removeNode(doc, uid), location.node, target.parentId, slot, target.index);
};

const truncate = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

/** `value` with a `-copy`, `-copy-2`… suffix that isn't in `taken`. */
const uniqueCopy = (value: string, taken: ReadonlySet<string>, max: number) => {
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? '-copy' : `-copy-${n}`;
    const candidate = truncate(value, max - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
};

const collectCustomIds = (doc: BuilderDocument) => {
  const ids = new Set<string>();
  for (const node of doc.components) {
    walkNode(node, kindInSlot(node, 'components'), (child) => {
      const customId = (child as { custom_id?: unknown }).custom_id;
      if (typeof customId === 'string') ids.add(customId);
    });
  }
  return ids;
};

/** A copy of the node right after it, with new uids, unique `custom_id`s and option values, no API `id`s. */
export const duplicateNode = (doc: BuilderDocument, uid: string, { restrictions }: RuleOptions = {}): InsertResult => {
  const location = findNode(doc, uid);
  if (!location) return { doc, uid: null, reason: 'The node no longer exists' };
  if (location.slot === 'accessory') return { doc, uid: null, reason: 'A section has only one accessory' };
  const target = { parentId: location.parentId, slot: location.slot, index: location.index + 1 };
  const result = checkInsert(doc, location.node, target, { kind: location.kind, restrictions });
  if (!result.ok) return { doc, uid: null, reason: result.reason };
  const customIds = collectCustomIds(doc);
  const fix = (node: BuilderNode, kind: NodeKind): BuilderNode => {
    const next = { ...node, uid: createUid() } as Record<string, unknown>;
    delete next.id;
    if (kind === 'selectOption' && location.kind === 'selectOption' && typeof next.value === 'string') {
      const parent = location.parentId ? findNode(doc, location.parentId)?.node : null;
      const values = new Set(
        parent ? slotChildren(parent, 'options').map((option) => String((option as { value?: string }).value)) : [],
      );
      next.value = uniqueCopy(next.value, values, limits.select.optionValue);
    }
    if (typeof next.custom_id === 'string' && next.custom_id !== '') {
      next.custom_id = uniqueCopy(next.custom_id, customIds, limits.components.customId);
      customIds.add(next.custom_id as string);
    }
    for (const slot of NODE_SLOTS[kind] ?? []) {
      const children = slotChildren(node, slot).map((child) => fix(child, kindInSlot(child, slot)));
      if (slot === 'accessory') {
        if (children.length > 0) next.accessory = children[0];
      } else next[slot] = children;
    }
    return next as unknown as BuilderNode;
  };
  const copy = fix(location.node, location.kind);
  return { doc: insertAt(doc, copy, location.parentId, location.slot, target.index), uid: copy.uid };
};

export interface SetModeOptions {
  /**
   * `true` (default) converts what the other mode can't show (embeds become containers, containers become
   * embeds…). `false` removes it instead.
   */
  convert?: boolean;
  /** A mode the restrictions don't allow isn't switched to; the result is sanitized against them. */
  restrictions?: BuilderRestrictions;
}

/** Switches between classic messages (content, embeds, action rows) and Components v2. */
export const setMode = (
  doc: BuilderDocument,
  mode: BuilderMode,
  { convert = true, restrictions }: SetModeOptions = {},
): BuilderDocument => {
  if (doc.mode === mode || !isModeAllowed(restrictions, mode)) return doc;
  let next: BuilderDocument;
  if (convert) next = mode === 'cv2' ? convertToCV2(doc) : convertToClassic(doc);
  else if (mode === 'cv2') {
    const { poll: _poll, sticker_ids: _stickers, ...rest } = doc;
    next = { ...rest, mode, content: '', embeds: [] };
  } else next = { ...doc, mode, components: doc.components.filter((node) => node.type === 1) };
  return sanitize(next, restrictions);
};

/** Replaces the whole message (e.g. after importing JSON), keeping the root uid. */
export const replaceDocument = (_doc: BuilderDocument, next: BuilderDocument) => ({ ...next, uid: ROOT_UID });
