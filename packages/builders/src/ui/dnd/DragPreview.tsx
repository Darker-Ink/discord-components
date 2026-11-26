import { findNode } from '../../core';
import { KIND_ICONS, PALETTE_ITEMS } from '../meta';
import { useBuilderContext } from '../useBuilderContext';
import { useBuilderUI } from '../uiStore';
import styles from './Dnd.module.css';

/** What follows the pointer while dragging: the node's icon and name, and whether it can drop here. */
export const DragPreview = ({ label, activeId, template }: { label: string; activeId: string; template?: string }) => {
  const { store } = useBuilderContext();
  const canDrop = useBuilderUI((state) => state.dropTarget != null);
  const kind =
    template != null
      ? PALETTE_ITEMS.find((item) => item.template === template)?.kind
      : findNode(store.getState().doc, activeId)?.kind;
  const Icon = PALETTE_ITEMS.find((item) => item.template === template)?.icon ?? KIND_ICONS[kind ?? 'unknown'];
  return (
    <div className={styles.preview} data-can-drop={canDrop}>
      <Icon size="xs" color="currentColor" />
      <span className={styles.previewLabel}>{label}</span>
    </div>
  );
};

DragPreview.displayName = 'DragPreview';
