import { findNode, slotChildren, type BuilderDocument, type BuilderNode, type NodeKind } from '../core';
import { KIND_LABELS } from './meta';
import type { DropSlot } from './uiStore';

const truncate = (text: string, length = 32) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/** A short text that tells nodes apart: a button's label, an embed's title, a field's name… */
export const nodeSummary = (node: BuilderNode, kind: NodeKind): string | undefined => {
  const value = node as unknown as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const text = value[key];
      if (typeof text === 'string' && text.trim() !== '') return text.replace(/\s+/g, ' ').trim();
    }
    return undefined;
  };
  switch (kind) {
    case 'embed':
      return (
        pick('title', 'description') ??
        (value.author as { name?: string } | undefined)?.name ??
        (value.footer as { text?: string } | undefined)?.text
      );
    case 'embedField':
      return pick('name', 'value');
    case 'button':
    case 'selectOption':
      return pick('label', 'url');
    case 'stringSelect':
    case 'userSelect':
    case 'roleSelect':
    case 'mentionableSelect':
    case 'channelSelect':
      return pick('placeholder', 'custom_id');
    case 'textDisplay':
      return pick('content');
    case 'section': {
      const first = (value.components as { content?: string }[] | undefined)?.[0]?.content;
      return first?.trim() ? first.replace(/\s+/g, ' ').trim() : undefined;
    }
    case 'file':
      return (value.file as { url?: string } | undefined)?.url;
    default:
      return undefined;
  }
};

/** The node's position among its siblings of the same kind, from 1 ("Embed 2"). */
const ordinal = (doc: BuilderDocument, uid: string) => {
  const location = findNode(doc, uid);
  if (location == null) return 1;
  const parent = location.parentId == null ? doc : findNode(doc, location.parentId)?.node;
  if (parent == null) return location.index + 1;
  const siblings = slotChildren(parent, location.slot);
  let count = 0;
  for (const sibling of siblings.slice(0, location.index + 1)) {
    if (findNode(doc, sibling.uid)?.kind === location.kind) count++;
  }
  return count;
};

/** "Button “Click me”", "Embed 2", "Container 1": how a node is named to screen readers and in lists. */
export const describeNode = (doc: BuilderDocument, uid: string) => {
  const location = findNode(doc, uid);
  if (location == null) return 'Message';
  const label = KIND_LABELS[location.kind];
  const summary = nodeSummary(location.node, location.kind);
  return summary != null ? `${label} “${truncate(summary)}”` : `${label} ${ordinal(doc, uid)}`;
};

const listName = (doc: BuilderDocument, slot: DropSlot) => {
  if (slot.parentId == null) return slot.slot === 'embeds' ? 'the message’s embeds' : 'the message';
  return describeNode(doc, slot.parentId);
};

/** Where a drop slot is, in words: "after Button “Yes” in Action row 1". */
export const describeSlot = (doc: BuilderDocument, slot: DropSlot, activeId?: string) => {
  const parent = slot.parentId == null ? doc : findNode(doc, slot.parentId)?.node;
  const where = listName(doc, slot);
  if (slot.slot === 'accessory') return `beside the text of ${where}`;
  const siblings = parent == null ? [] : slotChildren(parent, slot.slot).filter((node) => node.uid !== activeId);
  if (siblings.length === 0) return `into ${where}`;
  const all = parent == null ? [] : slotChildren(parent, slot.slot);
  const before = all.slice(0, slot.index).filter((node) => node.uid !== activeId);
  if (before.length === 0) return `first in ${where}`;
  return `after ${describeNode(doc, before[before.length - 1].uid)} in ${where}`;
};
