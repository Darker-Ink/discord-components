// Nesting and capacity rules for editing: what may go where. These keep the document structurally valid
// while dragging and inserting; everything else (lengths, required fields) is left to validation.
import { limits } from './limits';
import { isTemplateType, TEMPLATE_INFO, TEMPLATES } from './templates';
import type { TemplateType } from './templates';
import { findNode, isAncestor, kindInSlot, slotChildren, walkNode } from './tree';
import { ROOT_UID } from './types';
import type { BuilderDocument, BuilderMode, BuilderNode, NodeKind, NodeTarget, SlotName } from './types';

type ParentKind = NodeKind | 'message';

const BUTTON_AND_SELECTS: readonly NodeKind[] = [
  'button',
  'stringSelect',
  'userSelect',
  'roleSelect',
  'mentionableSelect',
  'channelSelect',
];

const CONTAINER_CHILDREN: readonly NodeKind[] = [
  'actionRow',
  'textDisplay',
  'section',
  'mediaGallery',
  'file',
  'separator',
  'unknown',
];

const CV2_TOP_LEVEL: readonly NodeKind[] = [...CONTAINER_CHILDREN, 'container'];

/** Kinds allowed in each slot of each parent (the message's top level depends on the mode). */
export const allowedChildKinds = (parentKind: ParentKind, slot: SlotName, mode: BuilderMode): readonly NodeKind[] => {
  switch (parentKind) {
    case 'message':
      if (slot === 'embeds') return mode === 'classic' ? ['embed'] : [];
      if (slot === 'components') return mode === 'classic' ? ['actionRow'] : CV2_TOP_LEVEL;
      return [];
    case 'embed':
      return slot === 'fields' ? ['embedField'] : [];
    case 'actionRow':
      return slot === 'components' ? BUTTON_AND_SELECTS : [];
    case 'section':
      if (slot === 'components') return ['textDisplay'];
      if (slot === 'accessory') return ['button', 'thumbnail'];
      return [];
    case 'container':
      return slot === 'components' ? CONTAINER_CHILDREN : [];
    case 'stringSelect':
      return slot === 'options' ? ['selectOption'] : [];
    case 'mediaGallery':
      return slot === 'items' ? ['mediaGalleryItem'] : [];
    default:
      return [];
  }
};

/** The slot a child of `childKind` goes into under a parent of `parentKind`. */
export const inferSlot = (parentKind: ParentKind, childKind: NodeKind): SlotName => {
  switch (parentKind) {
    case 'message':
      return childKind === 'embed' ? 'embeds' : 'components';
    case 'embed':
      return 'fields';
    case 'section':
      return childKind === 'button' || childKind === 'thumbnail' ? 'accessory' : 'components';
    case 'stringSelect':
      return 'options';
    case 'mediaGallery':
      return 'items';
    default:
      return 'components';
  }
};

const NON_COMPONENT_KINDS: ReadonlySet<NodeKind> = new Set(['embed', 'embedField', 'selectOption', 'mediaGalleryItem']);

/** Components in a node's subtree, as Discord counts them towards the 40 (options and gallery items don't). */
export const countNodeComponents = (node: BuilderNode, kind: NodeKind) => {
  let count = 0;
  walkNode(node, kind, (_child, childKind) => {
    if (!NON_COMPONENT_KINDS.has(childKind)) count++;
  });
  return count;
};

/** Components in the whole message, nested ones included. */
export const countComponents = (doc: BuilderDocument) =>
  doc.components.reduce((total, node) => total + countNodeComponents(node, kindInSlot(node, 'components')), 0);

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

const OK: RuleResult = { ok: true };
const fail = (reason: string): RuleResult => ({ ok: false, reason });

const KIND_LABELS: Record<ParentKind, string> = {
  message: 'the message',
  embed: 'an embed',
  embedField: 'a field',
  selectOption: 'an option',
  mediaGalleryItem: 'a gallery item',
  actionRow: 'an action row',
  button: 'a button',
  stringSelect: 'a string select',
  userSelect: 'a user select',
  roleSelect: 'a role select',
  mentionableSelect: 'a mentionable select',
  channelSelect: 'a channel select',
  section: 'a section',
  textDisplay: 'a text display',
  thumbnail: 'a thumbnail',
  mediaGallery: 'a media gallery',
  file: 'a file',
  separator: 'a separator',
  container: 'a container',
  unknown: 'an unknown component',
};

export const describeKind = (kind: ParentKind) => KIND_LABELS[kind];

interface Candidate {
  kind: NodeKind;
  componentCount: number;
  /** Set when moving an existing node. */
  uid?: string;
}

const resolveParent = (doc: BuilderDocument, parentId: string | null) => {
  if (parentId == null || parentId === ROOT_UID) return { node: doc as object, kind: 'message' as ParentKind };
  const location = findNode(doc, parentId);
  return location ? { node: location.node as object, kind: location.kind as ParentKind } : null;
};

const check = (doc: BuilderDocument, candidate: Candidate, target: NodeTarget): RuleResult => {
  const parent = resolveParent(doc, target.parentId);
  if (!parent) return fail('The target no longer exists');
  const slot = target.slot ?? inferSlot(parent.kind, candidate.kind);
  const allowed = allowedChildKinds(parent.kind, slot, doc.mode);
  if (!allowed.includes(candidate.kind)) {
    if (parent.kind === 'message' && slot === 'embeds') return fail('Components v2 messages cannot have embeds');
    if (parent.kind === 'message' && doc.mode === 'classic') {
      return fail(
        `${describeKind(candidate.kind)} needs a Components v2 message`.replace(/^./, (c) => c.toUpperCase()),
      );
    }
    return fail(
      `${describeKind(candidate.kind)} can't go in ${describeKind(parent.kind)}`.replace(/^./, (c) => c.toUpperCase()),
    );
  }

  const moving = candidate.uid != null ? findNode(doc, candidate.uid) : null;
  if (candidate.uid != null) {
    if (!moving) return fail('The node no longer exists');
    if (
      candidate.uid === target.parentId ||
      (target.parentId != null && isAncestor(doc, candidate.uid, target.parentId))
    ) {
      return fail("A node can't go inside itself");
    }
  }
  const sameList =
    moving != null && (moving.parentId ?? ROOT_UID) === (target.parentId ?? ROOT_UID) && moving.slot === slot;
  const siblings = slotChildren(parent.node, slot).filter((node) => !(sameList && node.uid === candidate.uid));

  const full = (limit: number, what: string) => (siblings.length >= limit ? fail(what) : OK);
  let result: RuleResult = OK;
  switch (parent.kind) {
    case 'message':
      if (slot === 'embeds')
        result = full(limits.message.embeds, `A message can have up to ${limits.message.embeds} embeds`);
      else if (doc.mode === 'classic') {
        result = full(
          limits.message.classicActionRows,
          `A message can have up to ${limits.message.classicActionRows} action rows`,
        );
      }
      break;
    case 'embed':
      result = full(limits.embed.fields, `An embed can have up to ${limits.embed.fields} fields`);
      break;
    case 'actionRow': {
      const kinds = siblings.map((node) => kindInSlot(node, 'components'));
      if (candidate.kind === 'button') {
        if (kinds.some((kind) => kind !== 'button'))
          result = fail('An action row with a select menu has no room for buttons');
        else
          result = full(limits.actionRow.buttons, `An action row can have up to ${limits.actionRow.buttons} buttons`);
      } else if (siblings.length > 0) result = fail('A select menu needs an action row of its own');
      break;
    }
    case 'section':
      if (slot === 'accessory') result = full(1, 'The section already has an accessory');
      else
        result = full(
          limits.section.maxComponents,
          `A section can have up to ${limits.section.maxComponents} text displays`,
        );
      break;
    case 'stringSelect':
      result = full(limits.select.options, `A select menu can have up to ${limits.select.options} options`);
      break;
    case 'mediaGallery':
      result = full(
        limits.mediaGallery.maxItems,
        `A media gallery can have up to ${limits.mediaGallery.maxItems} items`,
      );
      break;
  }
  if (!result.ok) return result;

  if (doc.mode === 'cv2' && !moving && candidate.componentCount > 0) {
    const total = countComponents(doc);
    if (total + candidate.componentCount > limits.components.total) {
      return fail(`A message can have up to ${limits.components.total} components (${total} used)`);
    }
  }
  return OK;
};

const candidateOf = (node: BuilderNode | TemplateType, kindHint?: NodeKind): Candidate => {
  if (isTemplateType(node)) {
    const info = TEMPLATE_INFO[node];
    return { kind: info.kind, componentCount: info.componentCount };
  }
  const kind = kindHint ?? kindInSlot(node, 'components');
  return { kind, componentCount: countNodeComponents(node, kind) };
};

/**
 * Whether a new node (a template type, or a node with its kind) can be inserted at `target`, and why not.
 * Nodes without a `type` (embeds, fields, options, gallery items) need `kind`.
 */
export const checkInsert = (
  doc: BuilderDocument,
  node: BuilderNode | TemplateType,
  target: NodeTarget,
  kind?: NodeKind,
): RuleResult => check(doc, candidateOf(node, kind), target);

export const canInsert = (
  doc: BuilderDocument,
  node: BuilderNode | TemplateType,
  target: NodeTarget,
  kind?: NodeKind,
) => checkInsert(doc, node, target, kind).ok;

/** Whether the node `uid` can move to `target`, and why not. Cheap enough for every dragover. */
export const checkMove = (doc: BuilderDocument, uid: string, target: NodeTarget): RuleResult => {
  const location = findNode(doc, uid);
  if (!location) return fail('The node no longer exists');
  return check(doc, { kind: location.kind, componentCount: 0, uid }, target);
};

export const canMove = (doc: BuilderDocument, uid: string, target: NodeTarget) => checkMove(doc, uid, target).ok;

/** Template types that can be inserted at `target` right now (for "add" menus and palettes). */
export const allowedTemplates = (doc: BuilderDocument, target: NodeTarget): TemplateType[] =>
  TEMPLATES.filter((info) => info.modes.includes(doc.mode) && checkInsert(doc, info.type, target).ok).map(
    (info) => info.type,
  );
