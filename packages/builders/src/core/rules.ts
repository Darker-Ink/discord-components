// Nesting and capacity rules for editing: what may go where. These keep the document structurally valid
// while dragging and inserting; everything else (lengths, required fields) is left to validation.
import { limits } from './limits';
import {
  areEmbedsAllowed,
  componentNames,
  countLimit,
  describeComponentName,
  effectiveLimit,
  isComponentAllowed,
  isEmbedPartAllowed,
  isModeAllowed,
  isTightened,
  type BuilderRestrictions,
  type ComponentName,
} from './restrictions';
import { createNode, isTemplateType, TEMPLATE_INFO, TEMPLATES } from './templates';
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
  /** The node (and everything under it), for new nodes: checked against the restrictions. */
  node?: BuilderNode;
  /** Set when moving an existing node. */
  uid?: string;
}

/** Options of the rule checks: the node's kind (for nodes without a `type`) and the builder's restrictions. */
export interface RuleOptions {
  kind?: NodeKind;
  restrictions?: BuilderRestrictions;
}

const toOptions = (options: NodeKind | RuleOptions | undefined): RuleOptions =>
  typeof options === 'string' ? { kind: options } : (options ?? {});

const resolveParent = (doc: BuilderDocument, parentId: string | null) => {
  if (parentId == null || parentId === ROOT_UID) return { node: doc as object, kind: 'message' as ParentKind };
  const location = findNode(doc, parentId);
  return location ? { node: location.node as object, kind: location.kind as ParentKind } : null;
};

const capitalize = (value: string) => value.replace(/^./, (c) => c.toUpperCase());

/** Why the restrictions rule out a new node (or something in it), if they do. */
const restrictionReason = (node: BuilderNode, kind: NodeKind, restrictions: BuilderRestrictions | undefined) => {
  if (!restrictions) return null;
  let reason: string | null = null;
  walkNode(node, kind, (child, childKind) => {
    if (reason) return;
    if (childKind === 'embed' && !areEmbedsAllowed(restrictions)) reason = "Embeds aren't allowed in this builder";
    else if (childKind === 'embedField' && !isEmbedPartAllowed(restrictions, 'fields')) {
      reason = "Embed fields aren't allowed in this builder";
    } else if (!NON_COMPONENT_KINDS.has(childKind) && !isComponentAllowed(restrictions, child as { type: number })) {
      const [name] = componentNames(child as { type: number });
      reason = `${name ? describeComponentName(name) : 'This component'} aren't allowed in this builder`;
    } else if (
      childKind === 'section' &&
      !isComponentAllowed(restrictions, 'button') &&
      !isComponentAllowed(restrictions, 'thumbnail')
    ) {
      reason = 'Sections need a button or thumbnail, and this builder allows neither';
    }
  });
  return reason;
};

/** Components of each restriction name in a subtree (or the whole message). */
const countNames = (nodes: readonly BuilderNode[], slot: SlotName) => {
  const counts = new Map<ComponentName, number>();
  for (const node of nodes) {
    walkNode(node, kindInSlot(node, slot), (child, childKind) => {
      if (NON_COMPONENT_KINDS.has(childKind)) return;
      for (const name of componentNames(child as { type: number })) counts.set(name, (counts.get(name) ?? 0) + 1);
    });
  }
  return counts;
};

const check = (
  doc: BuilderDocument,
  candidate: Candidate,
  target: NodeTarget,
  restrictions: BuilderRestrictions | undefined,
): RuleResult => {
  const parent = resolveParent(doc, target.parentId);
  if (!parent) return fail('The target no longer exists');
  const slot = target.slot ?? inferSlot(parent.kind, candidate.kind);
  const allowed = allowedChildKinds(parent.kind, slot, doc.mode);
  if (!allowed.includes(candidate.kind)) {
    if (parent.kind === 'message' && slot === 'embeds') return fail('Components v2 messages cannot have embeds');
    if (parent.kind === 'message' && doc.mode === 'classic') {
      return fail(capitalize(`${describeKind(candidate.kind)} needs a Components v2 message`));
    }
    return fail(capitalize(`${describeKind(candidate.kind)} can't go in ${describeKind(parent.kind)}`));
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
  if (candidate.node) {
    const reason = restrictionReason(candidate.node, candidate.kind, restrictions);
    if (reason) return fail(reason);
  }
  const sameList =
    moving != null && (moving.parentId ?? ROOT_UID) === (target.parentId ?? ROOT_UID) && moving.slot === slot;
  const siblings = slotChildren(parent.node, slot).filter((node) => !(sameList && node.uid === candidate.uid));

  const max = (key: Parameters<typeof effectiveLimit>[1]) => effectiveLimit(restrictions, key);
  const full = (limit: number, what: string) => (siblings.length >= limit ? fail(what) : OK);
  let result: RuleResult = OK;
  switch (parent.kind) {
    case 'message':
      if (slot === 'embeds') result = full(max('embeds'), `A message can have up to ${max('embeds')} embeds`);
      else if (doc.mode === 'classic') {
        result = full(
          limits.message.classicActionRows,
          `A message can have up to ${limits.message.classicActionRows} action rows`,
        );
      }
      break;
    case 'embed':
      result = full(max('embedFields'), `An embed can have up to ${max('embedFields')} fields`);
      break;
    case 'actionRow': {
      const kinds = siblings.map((node) => kindInSlot(node, 'components'));
      if (candidate.kind === 'button') {
        if (kinds.some((kind) => kind !== 'button')) {
          result = fail('An action row with a select menu has no room for buttons');
        } else {
          result = full(max('actionRowButtons'), `An action row can have up to ${max('actionRowButtons')} buttons`);
        }
      } else if (siblings.length > 0) result = fail('A select menu needs an action row of its own');
      break;
    }
    case 'section':
      if (slot === 'accessory') result = full(1, 'The section already has an accessory');
      else {
        result = full(max('sectionComponents'), `A section can have up to ${max('sectionComponents')} text displays`);
      }
      break;
    case 'stringSelect':
      result = full(max('selectOptions'), `A select menu can have up to ${max('selectOptions')} options`);
      break;
    case 'mediaGallery':
      result = full(max('galleryItems'), `A media gallery can have up to ${max('galleryItems')} items`);
      break;
  }
  if (!result.ok || moving || !candidate.node) return result;

  const added = countNodeComponents(candidate.node, candidate.kind);
  if (added > 0) {
    const total = countComponents(doc);
    const limit =
      doc.mode === 'cv2' ? max('components') : isTightened(restrictions, 'components') ? max('components') : Infinity;
    if (total + added > limit) return fail(`A message can have up to ${limit} components (${total} used)`);
  }
  if (restrictions?.counts) {
    const adding = countNames([candidate.node], slot);
    const existing = countNames(doc.components, 'components');
    for (const [name, count] of adding) {
      const limit = countLimit(restrictions, name);
      if ((existing.get(name) ?? 0) + count > limit) {
        return fail(`${describeComponentName(name)}: at most ${limit} in this builder`);
      }
    }
  }
  return OK;
};

const candidateOf = (
  node: BuilderNode | TemplateType,
  kindHint: NodeKind | undefined,
  restrictions: BuilderRestrictions | undefined,
): Candidate => {
  if (isTemplateType(node)) return { kind: TEMPLATE_INFO[node].kind, node: createNode(node, restrictions) };
  return { kind: kindHint ?? kindInSlot(node, 'components'), node };
};

/**
 * Whether a new node (a template type, or a node) can be inserted at `target`, and why not. Nodes without a
 * `type` (embeds, fields, options, gallery items) need `kind`. With `restrictions`, the node and everything
 * in it must be allowed by them.
 */
export const checkInsert = (
  doc: BuilderDocument,
  node: BuilderNode | TemplateType,
  target: NodeTarget,
  options?: NodeKind | RuleOptions,
): RuleResult => {
  const { kind, restrictions } = toOptions(options);
  return check(doc, candidateOf(node, kind, restrictions), target, restrictions);
};

export const canInsert = (
  doc: BuilderDocument,
  node: BuilderNode | TemplateType,
  target: NodeTarget,
  options?: NodeKind | RuleOptions,
) => checkInsert(doc, node, target, options).ok;

/** Whether the node `uid` can move to `target`, and why not. Cheap enough for every dragover. */
export const checkMove = (
  doc: BuilderDocument,
  uid: string,
  target: NodeTarget,
  { restrictions }: RuleOptions = {},
): RuleResult => {
  const location = findNode(doc, uid);
  if (!location) return fail('The node no longer exists');
  return check(doc, { kind: location.kind, uid }, target, restrictions);
};

export const canMove = (doc: BuilderDocument, uid: string, target: NodeTarget, options?: RuleOptions) =>
  checkMove(doc, uid, target, options).ok;

/**
 * Whether a template can be used at all under the restrictions (in some allowed mode, wherever it goes): for
 * hiding palette entries. `allowedTemplates` answers for a specific place.
 */
export const isTemplateAllowed = (type: TemplateType, restrictions: BuilderRestrictions | undefined) => {
  const info = TEMPLATE_INFO[type];
  if (!info.modes.some((mode) => isModeAllowed(restrictions, mode))) return false;
  return restrictionReason(createNode(type, restrictions), info.kind, restrictions) == null;
};

/** Template types that can be inserted at `target` right now (for "add" menus and palettes). */
export const allowedTemplates = (
  doc: BuilderDocument,
  target: NodeTarget,
  { restrictions }: RuleOptions = {},
): TemplateType[] =>
  TEMPLATES.filter(
    (info) => info.modes.includes(doc.mode) && checkInsert(doc, info.type, target, { restrictions }).ok,
  ).map((info) => info.type);
