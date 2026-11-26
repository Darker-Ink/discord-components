import { findNode, slotChildren, type BuilderDocument, type NodeKind, type SlotName } from '../../core';
import { listKey, type BuilderUIStore, type DropSlot } from '../uiStore';

// Where a dragged node can go, and how each place is drawn. Every valid insertion point is a "slot" with a
// line (between two nodes) or a box (an empty list); the pointer picks the nearest slot in the innermost list
// under it, and the keyboard steps through slots in document order.

export interface SlotGeometry {
  slot: DropSlot;
  /** `line`: x1,y1 → x2,y2. `box`: the empty list's rect. */
  shape: { type: 'line'; x1: number; y1: number; x2: number; y2: number } | { type: 'box'; rect: DOMRect };
  /** The list's rect, to prefer the innermost list under the pointer. */
  listRect: DOMRect | null;
  depth: number;
}

// Lists the canvas draws. Select options and gallery items are reordered in their own editors.
const CANVAS_SLOTS: Partial<Record<NodeKind, readonly SlotName[]>> = {
  embed: ['fields'],
  actionRow: ['components'],
  section: ['components', 'accessory'],
  container: ['components'],
};

export type IsValidSlot = (slot: DropSlot) => boolean;

/** Every list of the document the canvas shows, outermost first, in document order. */
export const walkLists = (
  doc: BuilderDocument,
  visit: (parentId: string | null, slot: SlotName, depth: number) => void,
) => {
  const visitNode = (node: object, uid: string, kind: NodeKind, depth: number) => {
    for (const slot of CANVAS_SLOTS[kind] ?? []) {
      visit(uid, slot, depth);
      for (const child of slotChildren(node, slot)) {
        const location = findNode(doc, child.uid);
        if (location != null) visitNode(child, child.uid, location.kind, depth + 1);
      }
    }
  };
  for (const slot of doc.mode === 'classic' ? (['embeds', 'components'] as const) : (['components'] as const)) {
    visit(null, slot, 0);
    for (const child of slotChildren(doc, slot)) {
      const location = findNode(doc, child.uid);
      if (location != null) visitNode(child, child.uid, location.kind, 1);
    }
  }
};

const sameRow = (a: DOMRect, b: DOMRect) => Math.abs(a.top - b.top) < 4 && Math.abs(a.bottom - b.bottom) < 24;

const childUids = (doc: BuilderDocument, parentId: string | null, slot: SlotName) => {
  const parent = parentId == null ? doc : findNode(doc, parentId)?.node;
  return parent == null ? [] : slotChildren(parent, slot).map((node) => node.uid);
};

const isRowList = (doc: BuilderDocument, parentId: string | null, slot: SlotName) =>
  parentId != null && slot === 'components' && findNode(doc, parentId)?.kind === 'actionRow';

/** The valid slots of the document for one drag, with where to draw each (measured now). */
export const measureSlots = (doc: BuilderDocument, ui: BuilderUIStore, isValid: IsValidSlot): SlotGeometry[] => {
  const result: SlotGeometry[] = [];
  walkLists(doc, (parentId, slot, depth) => {
    const uids = childUids(doc, parentId, slot);
    const listElement =
      ui.lists.get(listKey(parentId, slot)) ?? (parentId != null ? ui.frames.get(parentId) : undefined);
    const listRect = listElement?.getBoundingClientRect() ?? null;
    const rects = uids.map((uid) => ui.frames.get(uid)?.getBoundingClientRect() ?? null);
    const row = isRowList(doc, parentId, slot);
    const count = slot === 'accessory' ? 0 : uids.length;
    for (let index = 0; index <= count; index++) {
      const dropSlot: DropSlot = { parentId, slot, index };
      if (!isValid(dropSlot)) continue;
      // An empty list of the message (no embeds yet): a line under what the message already shows.
      const atCanvasEnd = count === 0 && listRect != null && listElement?.hasAttribute('data-builder-canvas') === true;
      const geometry = atCanvasEnd
        ? ({
            type: 'line',
            x1: listRect.left + 72,
            y1: listRect.bottom - 4,
            x2: listRect.right - 16,
            y2: listRect.bottom - 4,
          } as const)
        : slotShape(rects, index, row, listRect, slot === 'accessory' ? rects[0] : null);
      if (geometry != null) result.push({ slot: dropSlot, shape: geometry, listRect, depth });
    }
  });
  return result;
};

const slotShape = (
  rects: (DOMRect | null)[],
  index: number,
  row: boolean,
  listRect: DOMRect | null,
  replaced: DOMRect | null | undefined,
): SlotGeometry['shape'] | null => {
  if (replaced != null) return { type: 'box', rect: replaced };
  const present = rects.filter((rect) => rect != null);
  if (present.length === 0) return listRect != null ? { type: 'box', rect: listRect } : null;
  const current = rects[index] ?? null;
  const previous = index > 0 ? (rects[index - 1] ?? null) : null;
  const left = listRect?.left ?? Math.min(...present.map((rect) => rect.left));
  const right = listRect?.right ?? Math.max(...present.map((rect) => rect.right));
  if (current != null && previous != null && (row || sameRow(previous, current))) {
    const x = (previous.right + current.left) / 2;
    return { type: 'line', x1: x, y1: current.top, x2: x, y2: current.bottom };
  }
  if (current != null) {
    const y = previous != null ? (previous.bottom + current.top) / 2 : current.top - 2;
    return row
      ? { type: 'line', x1: current.left - 3, y1: current.top, x2: current.left - 3, y2: current.bottom }
      : { type: 'line', x1: left, y1: y, x2: right, y2: y };
  }
  if (previous == null) return null;
  return row
    ? { type: 'line', x1: previous.right + 3, y1: previous.top, x2: previous.right + 3, y2: previous.bottom }
    : { type: 'line', x1: left, y1: previous.bottom + 2, x2: right, y2: previous.bottom + 2 };
};

const distance = (x: number, y: number, shape: SlotGeometry['shape']) => {
  if (shape.type === 'box') {
    const { rect } = shape;
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.hypot(dx, dy);
  }
  const { x1, y1, x2, y2 } = shape;
  const length = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / length));
  return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
};

const contains = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

/** The slot for a pointer position: the nearest one in the innermost list under it, else the nearest at all. */
export const pickSlot = (slots: SlotGeometry[], x: number, y: number, maxDistance = 160): SlotGeometry | null => {
  const inside = slots.filter((slot) => slot.listRect != null && contains(slot.listRect, x, y));
  const pool =
    inside.length > 0
      ? (() => {
          const deepest = Math.max(...inside.map((slot) => slot.depth));
          const atDepth = inside.filter((slot) => slot.depth === deepest);
          const smallest = Math.min(...atDepth.map((slot) => slot.listRect!.width * slot.listRect!.height));
          return atDepth.filter((slot) => slot.listRect!.width * slot.listRect!.height === smallest);
        })()
      : slots;
  let best: SlotGeometry | null = null;
  let bestDistance = Infinity;
  for (const slot of pool) {
    const value = distance(x, y, slot.shape);
    if (value < bestDistance) {
      best = slot;
      bestDistance = value;
    }
  }
  return best != null && (inside.length > 0 || bestDistance <= maxDistance) ? best : null;
};

export const sameSlot = (a: DropSlot | null, b: DropSlot | null) =>
  a === b || (a != null && b != null && a.parentId === b.parentId && a.slot === b.slot && a.index === b.index);

/** The center of a slot's shape (the keyboard moves the drag preview there). */
export const slotCenter = ({ shape }: SlotGeometry) =>
  shape.type === 'line'
    ? { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2 }
    : { x: shape.rect.left + shape.rect.width / 2, y: shape.rect.top + shape.rect.height / 2 };

/**
 * The final index for `actions.move` (an index in the list after the node is taken out), from a slot's
 * insertion index (an index in the list as it is).
 */
export const finalIndex = (doc: BuilderDocument, uid: string, slot: DropSlot) => {
  const location = findNode(doc, uid);
  if (location == null || slot.slot === 'accessory') return slot.index;
  const sameList = location.parentId === slot.parentId && location.slot === slot.slot;
  return sameList && location.index < slot.index ? slot.index - 1 : slot.index;
};

/** Whether a slot is where the node already is (dropping there changes nothing). */
export const isCurrentPosition = (doc: BuilderDocument, uid: string, slot: DropSlot) => {
  const location = findNode(doc, uid);
  if (location == null) return false;
  if (location.parentId !== slot.parentId || location.slot !== slot.slot) return false;
  return slot.index === location.index || slot.index === location.index + 1;
};

/** Insertion points of every list the canvas shows, without measuring (for "can this go anywhere?"). */
export const listSlots = (doc: BuilderDocument, { endsOnly = false } = {}): DropSlot[] => {
  const result: DropSlot[] = [];
  walkLists(doc, (parentId, slot) => {
    const count = slot === 'accessory' ? 0 : childUids(doc, parentId, slot).length;
    for (let index = endsOnly ? count : 0; index <= count; index++) result.push({ parentId, slot, index });
  });
  return result;
};
