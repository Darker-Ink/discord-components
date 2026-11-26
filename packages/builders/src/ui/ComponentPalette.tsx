import { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { AccessibilityAnnouncer, Tooltip } from '@discord-mana/components';
import {
  findNode,
  NODE_SLOTS,
  useBuilderSelector,
  type BuilderDocument,
  type BuilderMode,
  type NodeTarget,
  type TemplateType,
} from '../core';
import { useBuilderScope } from './BuilderProvider';
import { listSlots } from './dnd/geometry';
import { canPlace, placeTemplate } from './placeTemplate';
import { PALETTE_ITEMS, type PaletteItem } from './meta';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './ComponentPalette.module.css';

const GROUPS: { title: string; templates: readonly string[] }[] = [
  { title: 'Embeds', templates: ['embed', 'field'] },
  {
    title: 'Layout',
    templates: ['container', 'text-display', 'section', 'media-gallery', 'thumbnail', 'file', 'separator'],
  },
  {
    title: 'Interactive',
    templates: [
      'action-row',
      'button',
      'link-button',
      'premium-button',
      'string-select',
      'user-select',
      'role-select',
      'mentionable-select',
      'channel-select',
    ],
  },
];

/**
 * Where a click on a palette item puts it: into the selected node if it fits there, else right after the
 * selection, else at the end of the message, else into the first place that takes it.
 */
export const findInsertTarget = (
  doc: BuilderDocument,
  template: TemplateType,
  selectedId: string | null,
): NodeTarget | null => {
  const fits = (target: NodeTarget) => canPlace(doc, template, target);
  const location = selectedId != null ? findNode(doc, selectedId) : null;
  if (location != null) {
    for (const slot of NODE_SLOTS[location.kind] ?? []) {
      const target = { parentId: selectedId, slot };
      if (fits(target)) return target;
    }
    const after = { parentId: location.parentId, slot: location.slot, index: location.index + 1 };
    if (location.slot !== 'accessory' && fits(after)) return after;
    // Up the tree: after each ancestor.
    let parentId = location.parentId;
    while (parentId != null) {
      const parent = findNode(doc, parentId);
      if (parent == null) break;
      for (const slot of NODE_SLOTS[parent.kind] ?? []) {
        if (fits({ parentId, slot })) return { parentId, slot };
      }
      const next = { parentId: parent.parentId, slot: parent.slot, index: parent.index + 1 };
      if (parent.slot !== 'accessory' && fits(next)) return next;
      parentId = parent.parentId;
    }
  }
  for (const slot of ['embeds', 'components'] as const) {
    if (fits({ parentId: null, slot })) return { parentId: null, slot };
  }
  const first = listSlots(doc).find((slot) => fits(slot));
  return first ?? null;
};

const PaletteButton = ({ item, available, compact }: { item: PaletteItem; available: boolean; compact: boolean }) => {
  const { store, actions } = useBuilderContext();
  const ui = useBuilderUIStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${item.template}`,
    data: { template: item.template, label: item.label },
    disabled: !available,
  });
  const add = useCallback(() => {
    const doc = store.getState().doc;
    const target = findInsertTarget(doc, item.template as TemplateType, ui.getState().selectedId);
    if (target == null) {
      AccessibilityAnnouncer.announce(`${item.label} can't be added here.`, 'polite');
      return;
    }
    const uid = placeTemplate(actions, doc, item.template as TemplateType, target);
    if (uid != null) {
      ui.set({ selectedId: uid, pendingFocus: { uid } });
      AccessibilityAnnouncer.announce(`Added ${item.label}.`, 'polite');
      requestAnimationFrame(() => ui.frames.get(uid)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  }, [actions, item, store, ui]);
  const Icon = item.icon;
  const button = (
    <button
      ref={setNodeRef}
      type="button"
      className={clsx(styles.item, { [styles.dragging]: isDragging })}
      {...attributes}
      {...listeners}
      aria-disabled={!available}
      aria-label={`${item.label}: ${item.description}`}
      role="button"
      tabIndex={0}
      onClick={available ? add : undefined}
    >
      <span className={styles.icon}>
        <Icon size="sm" color="currentColor" />
      </span>
      {!compact ? <span className={styles.label}>{item.label}</span> : null}
    </button>
  );
  return (
    <li>
      <Tooltip
        text={available ? item.description : `${item.description}. Nowhere to put one right now.`}
        position="right"
      >
        {button}
      </Tooltip>
    </li>
  );
};

PaletteButton.displayName = 'PaletteButton';

export interface ComponentPaletteProps {
  className?: string;
  /** Icons only (a narrow rail). */
  compact?: boolean;
  /** A row that scrolls sideways (small screens), instead of grouped columns. */
  orientation?: 'vertical' | 'horizontal';
  /** Which items to offer (defaults to everything the current mode can use). */
  items?: readonly PaletteItem[];
}

/**
 * What can be added to the message: drag an item onto the canvas (only places that take it light up), or click
 * it to add it next to the selection. Items the message can't take anywhere right now are dimmed.
 */
export const ComponentPalette = ({
  className,
  compact = false,
  orientation = 'vertical',
  items = PALETTE_ITEMS,
}: ComponentPaletteProps) => {
  const mode = useBuilderSelector((state) => state.doc.mode);
  const available = useBuilderSelector(
    useCallback(
      (state: { doc: BuilderDocument }) => {
        const slots = listSlots(state.doc, { endsOnly: true });
        return items
          .filter((item) => slots.some((slot) => canPlace(state.doc, item.template as TemplateType, slot)))
          .map((item) => item.template)
          .join(',');
      },
      [items],
    ),
  );
  const availableSet = useMemo(() => new Set(available.split(',')), [available]);
  const scope = useBuilderScope();
  return (
    <nav
      className={clsx(
        styles.palette,
        { [styles.compact]: compact, [styles.horizontal]: orientation === 'horizontal' },
        className,
      )}
      aria-label="Components"
      {...scope}
    >
      {GROUPS.map((group) => {
        const entries = group.templates
          .map((template) => items.find((item) => item.template === template))
          .filter((item): item is PaletteItem => item != null && item.modes.includes(mode as BuilderMode));
        if (entries.length === 0) return null;
        return (
          <section key={group.title} className={styles.group} aria-label={group.title}>
            {!compact && orientation === 'vertical' ? <h3 className={styles.title}>{group.title}</h3> : null}
            <ul className={styles.list}>
              {entries.map((item) => (
                <PaletteButton
                  key={item.template}
                  item={item}
                  available={availableSet.has(item.template)}
                  compact={compact}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
};

ComponentPalette.displayName = 'ComponentPalette';
