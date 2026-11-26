import { useRef } from 'react';
import { Menu, MenuGroup, MenuItem, MenuSeparator, Popout } from '@discord-mana/components';
import {
  ArrowSmallDownIcon,
  ArrowSmallUpIcon,
  CopyIcon,
  PaperIcon,
  PlusSmallIcon,
  TrashIcon,
  ArrowAngleLeftUpIcon,
} from '@discord-mana/icons';
import {
  allowedTemplates,
  findNode,
  NODE_SLOTS,
  nodeToJSON,
  slotChildren,
  type BuilderDocument,
  type TemplateType,
} from '../core';
import { focusNode, isMac } from './NodeFrame';
import { KIND_ICONS, KIND_LABELS, PALETTE_ITEMS } from './meta';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUI, useBuilderUIStore } from './uiStore';
import styles from './NodeContextMenu.module.css';

const MOD = () => (isMac() ? '⌘' : 'Ctrl+');

const siblingsOf = (doc: BuilderDocument, uid: string) => {
  const location = findNode(doc, uid);
  if (location == null) return null;
  const parent = location.parentId == null ? doc : findNode(doc, location.parentId)?.node;
  return parent == null ? null : { location, siblings: slotChildren(parent, location.slot) };
};

/** The menu for a node (right-click, Shift+F10, or "More" in its toolbar). */
export const NodeContextMenu = () => {
  const ui = useBuilderUIStore();
  const { store, actions } = useBuilderContext();
  const menu = useBuilderUI((state) => state.contextMenu);
  const anchorRef = useRef<HTMLDivElement>(null);
  const close = () => ui.set({ contextMenu: null });
  if (menu == null) return null;
  const doc = store.getState().doc;
  const info = siblingsOf(doc, menu.uid);
  if (info == null) return null;
  const { location, siblings } = info;
  const slots = (NODE_SLOTS[location.kind] ?? []).filter((slot) => slot !== 'options' && slot !== 'items');
  const addable = slots.flatMap((slot) =>
    allowedTemplates(doc, { parentId: menu.uid, slot }).map((template) => ({ slot, template })),
  );
  const move = (offset: number) => {
    if (actions.move(menu.uid, { parentId: location.parentId, slot: location.slot, index: location.index + offset }))
      focusNode(ui, menu.uid);
  };
  const add = (slot: (typeof slots)[number], template: TemplateType) => {
    const uid = actions.insert(menu.uid, slot, -1, template);
    if (uid != null) ui.set({ selectedId: uid, pendingFocus: { uid } });
  };
  return (
    <>
      <div ref={anchorRef} className={styles.anchor} style={{ left: menu.x, top: menu.y }} aria-hidden />
      <Popout
        key={`${menu.uid}:${menu.x}:${menu.y}`}
        shouldShow
        targetElementRef={anchorRef}
        position="bottom"
        align="left"
        spacing={0}
        onRequestClose={close}
        renderPopout={({ closePopout }) => (
          <Menu
            navId="builder-node-menu"
            aria-label={`${KIND_LABELS[location.kind]} actions`}
            onClose={() => {
              closePopout();
              close();
            }}
            onSelect={() => undefined}
          >
            <MenuGroup>
              <MenuItem
                id="duplicate"
                label="Duplicate"
                icon={CopyIcon}
                shortcut={`${MOD()}D`}
                action={() => focusNode(ui, actions.duplicate(menu.uid))}
              />
              <MenuItem
                id="move-up"
                label="Move up"
                icon={ArrowSmallUpIcon}
                shortcut="Alt+↑"
                disabled={location.index === 0 || location.slot === 'accessory'}
                action={() => move(-1)}
              />
              <MenuItem
                id="move-down"
                label="Move down"
                icon={ArrowSmallDownIcon}
                shortcut="Alt+↓"
                disabled={location.index >= siblings.length - 1 || location.slot === 'accessory'}
                action={() => move(1)}
              />
              {location.parentId != null ? (
                <MenuItem
                  id="select-parent"
                  label="Select parent"
                  icon={ArrowAngleLeftUpIcon}
                  shortcut="Esc"
                  action={() => focusNode(ui, location.parentId)}
                />
              ) : null}
            </MenuGroup>
            {addable.length > 0 ? (
              <MenuGroup>
                <MenuItem id="add" label="Add inside" icon={PlusSmallIcon}>
                  {addable.map(({ slot, template }) => {
                    const item = PALETTE_ITEMS.find((entry) => entry.template === template);
                    return (
                      <MenuItem
                        key={`${slot}-${template}`}
                        id={`add-${slot}-${template}`}
                        label={item?.label ?? template}
                        icon={item?.icon ?? KIND_ICONS.unknown}
                        action={() => add(slot, template)}
                      />
                    );
                  })}
                </MenuItem>
              </MenuGroup>
            ) : null}
            <MenuGroup>
              <MenuItem
                id="copy-json"
                label="Copy JSON"
                icon={PaperIcon}
                action={() => {
                  void navigator.clipboard?.writeText(
                    JSON.stringify(nodeToJSON(location.node, location.kind), null, 2),
                  );
                }}
              />
            </MenuGroup>
            <MenuSeparator />
            <MenuItem
              id="delete"
              label={`Delete ${KIND_LABELS[location.kind].toLowerCase()}`}
              icon={TrashIcon}
              color="danger"
              shortcut="Del"
              action={() => {
                const next =
                  siblings[location.index + 1]?.uid ?? siblings[location.index - 1]?.uid ?? location.parentId;
                actions.remove(menu.uid);
                if (next != null) focusNode(ui, next);
                else ui.set({ selectedId: null });
              }}
            />
          </Menu>
        )}
      >
        {() => null}
      </Popout>
    </>
  );
};

NodeContextMenu.displayName = 'NodeContextMenu';
