import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type PointerSensorOptions,
  type TouchSensorOptions,
} from '@dnd-kit/core';
import { AccessibilityAnnouncer } from '@discord-mana/components';
import { canMove, findNode, type BuilderDocument, type TemplateType } from '../../core';
import { describeNode, describeSlot } from '../describe';
import { canPlace, placeTemplate } from '../placeTemplate';
import { useBuilderContext } from '../useBuilderContext';
import { useBuilderUI, useBuilderUIStore, type DropSlot } from '../uiStore';
import { DragPreview } from './DragPreview';
import { DropIndicator } from './DropIndicator';
import {
  finalIndex,
  isCurrentPosition,
  measureSlots,
  pickSlot,
  sameSlot,
  slotCenter,
  type SlotGeometry,
} from './geometry';

/** Elements a press on doesn't start a drag from: text being edited, inputs and the editor's own controls. */
const NO_DRAG_SELECTOR =
  '[contenteditable="true"], [contenteditable="plaintext-only"], input, textarea, select, [role="textbox"], [data-builder-nodrag]';

const startsDrag = (target: EventTarget | null) =>
  !(target instanceof Element) || target.closest(NO_DRAG_SELECTOR) == null;

/** A pointer sensor that leaves text alone: pressing in an editor selects text instead of dragging the node. */
class NodePointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent, currentTarget }: { nativeEvent: PointerEvent; currentTarget: EventTarget | null },
        { onActivation }: PointerSensorOptions,
      ) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0 || !startsDrag(nativeEvent.target)) return false;
        // Touch has its own sensor: a long press drags, so a swipe still scrolls.
        if (nativeEvent.pointerType === 'touch') return false;
        // Presses in a popout opened from the node reach it through React's tree; they aren't on the node.
        if (currentTarget instanceof Node && !currentTarget.contains(nativeEvent.target as Node)) return false;
        onActivation?.({ event: nativeEvent });
        return true;
      },
    },
  ];
}

/**
 * Elements a long press doesn't drag from: text (a tap there starts editing and swaps the element, which would
 * lose the touch's end) and the editor's own controls.
 */
const NO_TOUCH_DRAG_SELECTOR = NO_DRAG_SELECTOR;

/** Long-press to drag on touch screens; a quick swipe scrolls as usual. */
class NodeTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (
        { nativeEvent, currentTarget }: { nativeEvent: TouchEvent; currentTarget: EventTarget | null },
        { onActivation }: TouchSensorOptions,
      ) => {
        const target = nativeEvent.target;
        if (nativeEvent.touches.length > 1) return false;
        if (target instanceof Element && target.closest(NO_TOUCH_DRAG_SELECTOR) != null) return false;
        if (currentTarget instanceof Node && !currentTarget.contains(target as Node)) return false;
        onActivation?.({ event: nativeEvent });
        return true;
      },
    },
  ];
}

const SCREEN_READER_INSTRUCTIONS =
  'To move this, press Space. Choose where it goes with the arrow keys, then press Space to drop it or Escape to cancel.';

export interface DragData {
  /** The template a palette item inserts. */
  template?: string;
  label: string;
}

/**
 * Drag and drop for the builder: nodes on the canvas and palette items. Drops are checked with the core's
 * `canMove`/`canInsert`, so only valid places light up, and the keyboard steps through those same places.
 */
export const BuilderDndProvider = ({ children }: { children: ReactNode }) => {
  const { store, actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const drag = useBuilderUI((state) => state.drag);
  const slotsRef = useRef<SlotGeometry[]>([]);
  const keyboardIndexRef = useRef(-1);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [keyboardDrag, setKeyboardDrag] = useState(false);

  const isValidFor = useCallback(
    (doc: BuilderDocument, activeId: string, template: string | undefined) => (slot: DropSlot) => {
      const target = { parentId: slot.parentId, slot: slot.slot, index: slot.index };
      const restrictions = store.getRestrictions();
      if (template != null) return canPlace(doc, template as TemplateType, target, restrictions);
      if (isCurrentPosition(doc, activeId, slot)) return true;
      return canMove(doc, activeId, { ...target, index: finalIndex(doc, activeId, slot) }, { restrictions });
    },
    [store],
  );

  const remeasure = useCallback(() => {
    const { drag: current } = ui.getState();
    if (current == null) return;
    const doc = store.getState().doc;
    slotsRef.current = measureSlots(doc, ui, isValidFor(doc, current.activeId, current.template));
  }, [isValidFor, store, ui]);

  const setTarget = useCallback(
    (geometry: SlotGeometry | null) => {
      const previous = ui.getState().dropTarget;
      const next = geometry?.slot ?? null;
      if (sameSlot(previous, next)) {
        if (geometry != null) ui.set({ dropShape: geometry.shape });
        return;
      }
      ui.set({ dropTarget: next, dropShape: geometry?.shape ?? null });
      const doc = store.getState().doc;
      const current = ui.getState().drag;
      if (current == null) return;
      AccessibilityAnnouncer.announce(
        next == null
          ? `${current.label} can't be dropped here.`
          : `${current.label} goes ${describeSlot(doc, next, current.activeId)}.`,
        'polite',
      );
    },
    [store, ui],
  );

  const coordinateGetter = useCallback<KeyboardCoordinateGetter>(
    (event, { currentCoordinates }) => {
      const step =
        event.code === KeyboardCode.Down || event.code === KeyboardCode.Right
          ? 1
          : event.code === KeyboardCode.Up || event.code === KeyboardCode.Left
            ? -1
            : 0;
      if (step === 0) return undefined;
      event.preventDefault();
      remeasure();
      const slots = slotsRef.current;
      if (slots.length === 0) return currentCoordinates;
      keyboardIndexRef.current = Math.max(0, Math.min(slots.length - 1, keyboardIndexRef.current + step));
      const geometry = slots[keyboardIndexRef.current];
      setTarget(geometry);
      const center = slotCenter(geometry);
      return { x: center.x + 8, y: center.y - 12 };
    },
    [remeasure, setTarget],
  );

  const sensors = useSensors(
    useSensor(NodePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(NodeTouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter],
      },
    }),
  );

  const onDragStart = useCallback(
    ({ active, activatorEvent }: DragStartEvent) => {
      const data = active.data.current as DragData | undefined;
      const doc = store.getState().doc;
      const activeId = String(active.id);
      const label = data?.label ?? describeNode(doc, activeId);
      ui.set({ drag: { activeId, template: data?.template, label }, dropTarget: null, contextMenu: null });
      const keyboard = activatorEvent instanceof KeyboardEvent;
      setKeyboardDrag(keyboard);
      startPointRef.current =
        activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent
          ? { x: activatorEvent.clientX, y: activatorEvent.clientY }
          : typeof TouchEvent !== 'undefined' &&
              activatorEvent instanceof TouchEvent &&
              activatorEvent.touches[0] != null
            ? { x: activatorEvent.touches[0].clientX, y: activatorEvent.touches[0].clientY }
            : null;
      if (!keyboard) navigator.vibrate?.(10);
      remeasure();
      if (keyboard) {
        // Start on the node's own place, so the first arrow press moves it one step.
        const location = data?.template == null ? findNode(doc, activeId) : null;
        const slots = slotsRef.current;
        const current =
          location == null
            ? -1
            : slots.findIndex(
                ({ slot }) =>
                  slot.parentId === location.parentId && slot.slot === location.slot && slot.index === location.index,
              );
        keyboardIndexRef.current = current;
        if (current >= 0) setTarget(slots[current]);
      }
      AccessibilityAnnouncer.announce(`Picked up ${label}.`, 'assertive');
    },
    [remeasure, setTarget, store, ui],
  );

  const onDragMove = useCallback(
    ({ delta }: DragMoveEvent) => {
      if (keyboardDrag || startPointRef.current == null) return;
      remeasure();
      const x = startPointRef.current.x + delta.x;
      const y = startPointRef.current.y + delta.y;
      setTarget(pickSlot(slotsRef.current, x, y));
    },
    [keyboardDrag, remeasure, setTarget],
  );

  const finish = useCallback(() => {
    ui.set({ drag: null, dropTarget: null, dropShape: null });
    slotsRef.current = [];
    keyboardIndexRef.current = -1;
    startPointRef.current = null;
  }, [ui]);

  const onDragEnd = useCallback(
    (_event: DragEndEvent) => {
      const { drag: current, dropTarget } = ui.getState();
      finish();
      if (current == null) return;
      if (dropTarget == null) {
        AccessibilityAnnouncer.announce(`${current.label} was not moved.`, 'polite');
        return;
      }
      const doc = store.getState().doc;
      const target = { parentId: dropTarget.parentId, slot: dropTarget.slot, index: dropTarget.index };
      if (current.template != null) {
        const uid = placeTemplate(actions, doc, current.template as TemplateType, target, store.getRestrictions());
        if (uid != null) ui.set({ selectedId: uid, pendingFocus: { uid } });
        AccessibilityAnnouncer.announce(`Added ${current.label}.`, 'polite');
        return;
      }
      if (isCurrentPosition(doc, current.activeId, dropTarget)) {
        AccessibilityAnnouncer.announce(`${current.label} was not moved.`, 'polite');
        return;
      }
      const moved = actions.move(current.activeId, { ...target, index: finalIndex(doc, current.activeId, dropTarget) });
      if (moved) {
        ui.set({ selectedId: current.activeId });
        AccessibilityAnnouncer.announce(`Moved ${current.label}.`, 'polite');
        // Keep keyboard users on the node they moved.
        requestAnimationFrame(() => ui.frames.get(current.activeId)?.focus({ preventScroll: false }));
      }
    },
    [actions, finish, store, ui],
  );

  const onDragCancel = useCallback(() => {
    const current = ui.getState().drag;
    finish();
    if (current != null) AccessibilityAnnouncer.announce(`Cancelled. ${current.label} was not moved.`, 'polite');
  }, [finish, ui]);

  const accessibility = useMemo(
    () => ({
      // Announcements come from the drop targets above, which know about valid places.
      announcements: {
        onDragStart: () => undefined,
        onDragOver: () => undefined,
        onDragEnd: () => undefined,
        onDragCancel: () => undefined,
      },
      screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS },
      // Focus goes where the drop put it (the moved node, or the new node's text), not back to the palette.
      restoreFocus: false,
    }),
    [],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={() => []}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={accessibility}
      autoScroll={{ threshold: { x: 0, y: 0.15 }, acceleration: 6 }}
    >
      {children}
      <DropIndicator />
      <DragOverlay dropAnimation={null} zIndex={1000}>
        {drag != null ? <DragPreview label={drag.label} activeId={drag.activeId} template={drag.template} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

BuilderDndProvider.displayName = 'BuilderDndProvider';
