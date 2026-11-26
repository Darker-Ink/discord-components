import {
  useCallback,
  useMemo,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { findNode, slotChildren, useBuilderNode, useNodeIssues, type NodeKind } from '../core';
import { describeNode } from './describe';
import { IssueBadge } from './IssueBadge';
import { NodeToolbar } from './NodeToolbar';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUI, useBuilderUIStore, useIsSelected, type BuilderUIStore } from './uiStore';
import { useMergeRefs } from '@discord-mana/components';
import styles from './NodeFrame.module.css';

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const isMod = (event: { metaKey: boolean; ctrlKey: boolean }) => (isMac() ? event.metaKey : event.ctrlKey);

/** Focuses a node's frame (it selects itself on focus). */
export const focusNode = (ui: BuilderUIStore, uid: string | null) => {
  if (uid == null) return;
  ui.set({ selectedId: uid });
  requestAnimationFrame(() => ui.frames.get(uid)?.focus());
};

/** The first editable text of a node, to start typing in it with Enter. */
export const focusFirstText = (element: HTMLElement | null | undefined, field?: string) => {
  if (element == null) return false;
  const field_ =
    field != null
      ? element.querySelector<HTMLElement>(`[data-builder-field="${CSS.escape(field)}"]`)
      : (element.querySelector<HTMLElement>('[data-builder-first]') ??
        element.querySelector<HTMLElement>('[data-builder-field]'));
  if (field_ == null) return false;
  const target = field_.matches('[role="textbox"]') ? field_ : field_.querySelector<HTMLElement>('[role="textbox"]');
  if (target == null) return false;
  target.focus();
  return true;
};

export interface NodeFrameOptions {
  uid: string;
  kind: NodeKind;
  /** Read-only builders show the message without editing affordances. */
  disabled?: boolean;
}

/**
 * Everything that makes a rendered node editable, as props for its own root element: selection, the focus
 * ring, keyboard commands, dragging, the error outline and the toolbar. `NodeFrame` wraps elements it doesn't
 * own; the embed and its fields put these props on their own elements so the DOM stays exactly the client's.
 */
export const useNodeFrame = ({ uid, kind, disabled = false }: NodeFrameOptions) => {
  const ui = useBuilderUIStore();
  const { store, actions } = useBuilderContext();
  const node = useBuilderNode(uid);
  const selected = useIsSelected(uid);
  const issues = useNodeIssues(uid);
  const label = useMemo(
    () => (node != null ? describeNode(store.getState().doc, uid) : ''),
    // The label follows the node's own text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node, uid],
  );
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uid,
    data: { label },
    disabled,
  });
  const register = useCallback(
    (element: HTMLElement | null) => {
      if (element != null) ui.frames.set(uid, element);
      else if (ui.frames.get(uid)?.isConnected !== true) ui.frames.delete(uid);
    },
    [ui, uid],
  );
  const ref = useMergeRefs<HTMLElement>(register, setNodeRef);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || disabled) return;
      // While dragging with the keyboard, the arrow keys and Space belong to the drag.
      if (ui.getState().drag != null) return;
      const doc = store.getState().doc;
      const location = findNode(doc, uid);
      if (location == null) return;
      const parent = location.parentId == null ? doc : findNode(doc, location.parentId)?.node;
      const siblings = parent != null ? slotChildren(parent, location.slot) : [];
      const sibling = (offset: number) => siblings[location.index + offset]?.uid ?? null;
      const handled = (() => {
        switch (event.key) {
          case 'Enter':
            return focusFirstText(event.currentTarget);
          case 'Escape':
            if (location.parentId != null) focusNode(ui, location.parentId);
            else {
              ui.set({ selectedId: null });
              event.currentTarget.blur();
            }
            return true;
          case 'ArrowUp':
          case 'ArrowLeft':
          case 'ArrowDown':
          case 'ArrowRight': {
            const step = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
            if (event.altKey) {
              const index = location.index + step;
              if (index < 0 || index >= siblings.length) return true;
              if (actions.move(uid, { parentId: location.parentId, slot: location.slot, index })) focusNode(ui, uid);
              return true;
            }
            const next = sibling(step);
            if (next != null) focusNode(ui, next);
            return true;
          }
          case 'Delete':
          case 'Backspace': {
            const next = sibling(1) ?? sibling(-1) ?? location.parentId;
            actions.remove(uid);
            if (next != null) focusNode(ui, next);
            else ui.set({ selectedId: null });
            return true;
          }
          case 'd':
          case 'D':
            if (!isMod(event)) return false;
            focusNode(ui, actions.duplicate(uid));
            return true;
          case 'ContextMenu':
          case 'F10': {
            if (event.key === 'F10' && !event.shiftKey) return false;
            const rect = event.currentTarget.getBoundingClientRect();
            ui.set({ selectedId: uid, contextMenu: { uid, x: rect.left + 16, y: rect.top + 16 } });
            return true;
          }
          default:
            return false;
        }
      })();
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      (listeners?.onKeyDown as ((event: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
    },
    [actions, disabled, listeners, store, ui, uid],
  );

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      // A click selects on release (see BuilderCanvas); focus from the keyboard selects right away.
      if (event.target === event.currentTarget && ui.modality === 'keyboard') ui.set({ selectedId: uid });
    },
    [ui, uid],
  );

  const errors = issues.filter((issue) => issue.severity === 'error' && issue.field == null);
  const warnings = issues.filter((issue) => issue.severity === 'warning' && issue.field == null);

  const frameProps = {
    'data-builder-node': uid,
    'data-builder-kind': kind,
    'data-selected': selected || undefined,
    'data-dragging': isDragging || undefined,
    'data-issue': errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : undefined,
    tabIndex: disabled ? undefined : 0,
    role: 'group',
    'aria-label': label,
    'aria-roledescription': disabled ? undefined : `draggable ${kind}`,
    'aria-describedby': disabled ? undefined : attributes['aria-describedby'],
    onKeyDown,
    onFocus,
    onPointerDown: listeners?.onPointerDown as PointerEventHandler<HTMLElement> | undefined,
  };

  return { ref, frameProps, selected, isDragging, label, nodeIssues: issues };
};

export interface NodeFrameProps extends NodeFrameOptions {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
  /** Controls for this kind of node, shown in its toolbar while it is selected. */
  tools?: ReactNode;
  /** Shown under the node while it is selected (e.g. a gallery's item strip). */
  selectedChildren?: ReactNode;
}

/** A rendered node, made selectable, focusable, draggable and deletable, with a toolbar while selected. */
export const NodeFrame = ({
  uid,
  kind,
  disabled,
  children,
  as: Tag = 'div',
  className,
  style,
  ref: externalRef,
  tools,
  selectedChildren,
}: NodeFrameProps) => {
  const { ref, frameProps, selected, nodeIssues } = useNodeFrame({ uid, kind, disabled });
  const mergedRef = useMergeRefs<HTMLElement>(ref, externalRef);
  return (
    <Tag ref={mergedRef} className={clsx(styles.frame, className)} style={style} {...frameProps}>
      {children}
      {selected && selectedChildren != null ? selectedChildren : null}
      {!disabled ? <FrameChrome uid={uid} kind={kind} selected={selected} tools={tools} issues={nodeIssues} /> : null}
    </Tag>
  );
};

NodeFrame.displayName = 'NodeFrame';

/** The parts drawn over a frame: the issue badge and, while selected, the toolbar. */
export const FrameChrome = ({
  uid,
  kind,
  selected,
  tools,
  issues,
}: {
  uid: string;
  kind: NodeKind;
  selected: boolean;
  tools?: ReactNode;
  issues: ReturnType<typeof useNodeIssues>;
}) => {
  const dragging = useBuilderUI((state) => state.drag != null);
  return (
    <>
      <IssueBadge issues={issues.filter((issue) => issue.field == null)} />
      {selected && !dragging ? <NodeToolbar uid={uid} kind={kind} tools={tools} /> : null}
    </>
  );
};

FrameChrome.displayName = 'FrameChrome';
