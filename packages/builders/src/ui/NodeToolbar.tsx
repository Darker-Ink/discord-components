import { useEffect, useLayoutEffect, useState, type ComponentType, type MouseEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { ScrollerNone, Tooltip, type PopoutRenderProps } from '@discord-mana/components';
import { AnchoredPopout } from './popouts';
import {
  ArrowSmallDownIcon,
  ArrowSmallUpIcon,
  CopyIcon,
  DragIcon,
  MoreHorizontalIcon,
  TrashIcon,
  type IconProps,
} from '@discord-mana/icons';
import { findNode, type NodeKind } from '../core';
import { isMac } from './NodeFrame';
import { KIND_ICONS, KIND_LABELS } from './meta';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './NodeToolbar.module.css';

const MOD = () => (isMac() ? '⌘' : 'Ctrl+');

export interface NodeToolbarButtonProps {
  icon: ComponentType<IconProps>;
  label: string;
  shortcut?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Shows the button pressed (a toggle that is on). */
  active?: boolean;
  danger?: boolean;
  /** Content drawn instead of the icon (a colour swatch, an emoji). */
  children?: ReactNode;
}

/** One button of a node's toolbar, drawn like the client's message hover bar. */
export const NodeToolbarButton = ({
  icon: Icon,
  label,
  shortcut,
  onClick,
  active,
  danger,
  children,
}: NodeToolbarButtonProps) => (
  <Tooltip text={label} keyboardShortcut={shortcut} position="top">
    <button
      type="button"
      data-builder-nodrag
      className={clsx(styles.button, { [styles.danger]: danger })}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children ?? <Icon size="sm" color="currentColor" className={styles.icon} />}
    </button>
  </Tooltip>
);

NodeToolbarButton.displayName = 'NodeToolbarButton';

export interface NodeToolbarPopoutButtonProps extends Omit<NodeToolbarButtonProps, 'onClick'> {
  renderPopout: (props: PopoutRenderProps) => ReactNode;
}

/** A toolbar button that opens a small editor next to the node. */
export const NodeToolbarPopoutButton = ({
  renderPopout,
  icon: Icon,
  label,
  children,
  active,
}: NodeToolbarPopoutButtonProps) => (
  <AnchoredPopout renderPopout={renderPopout} position="bottom" align="center">
    {(props, { isShown }) => (
      <Tooltip text={isShown ? null : label} position="top">
        <button
          type="button"
          data-builder-nodrag
          className={clsx(styles.button, { [styles.open]: isShown })}
          aria-label={label}
          aria-pressed={active}
          {...props}
        >
          {children ?? <Icon size="sm" color="currentColor" className={styles.icon} />}
        </button>
      </Tooltip>
    )}
  </AnchoredPopout>
);

NodeToolbarPopoutButton.displayName = 'NodeToolbarPopoutButton';

export const NodeToolbarSeparator = () => <div className={styles.separator} role="separator" />;

NodeToolbarSeparator.displayName = 'NodeToolbarSeparator';

/**
 * Whether an on-screen keyboard is up for text being typed: the docked bar would sit behind it (or crowd the
 * line being typed), so it steps aside. With a hardware keyboard, or once the keyboard is dismissed without
 * leaving the text (Android's back button), the bar stays.
 */
const useSoftKeyboard = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const element = document.activeElement;
      const typing =
        element instanceof HTMLElement &&
        (element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
      const covered = viewport != null && window.innerHeight - viewport.height > 120;
      setOpen(typing && covered);
    };
    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    viewport?.addEventListener('resize', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      viewport?.removeEventListener('resize', update);
    };
  }, []);
  return open;
};

/** The bar above a selected node: drag handle, its own tools, duplicate, more and delete. */
export const NodeToolbar = ({ uid, kind, tools }: { uid: string; kind: NodeKind; tools?: ReactNode }) => {
  const ui = useBuilderUIStore();
  const { actions, store } = useBuilderContext();
  // Stay on the canvas (a fixed toolbar would otherwise only be kept in the window).
  const boundary = ui.frames.get(uid)?.closest('[data-builder-canvas]') ?? 'clippingAncestors';
  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    // Beside the node where there's room (it covers nothing there), else over its top end like the client's
    // message toolbar.
    placement: 'right-start',
    strategy: 'fixed',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['top-end', 'top-start', 'bottom-start'], boundary }),
      shift({ padding: 8, boundary }),
    ],
    whileElementsMounted: autoUpdate,
  });
  useLayoutEffect(() => {
    setReference(ui.frames.get(uid) ?? null);
  }, [setReference, ui, uid]);
  const KindIcon = KIND_ICONS[kind];
  const { toolbar } = useBuilderRender();
  const keyboard = useSoftKeyboard();
  if (toolbar === 'docked') {
    const move = (offset: number) => {
      const doc = store.getState().doc;
      const location = findNode(doc, uid);
      if (location == null || location.slot === 'accessory') return;
      actions.move(uid, { parentId: location.parentId, slot: location.slot, index: location.index + offset });
    };
    return (
      <div
        className={styles.dock}
        data-builder-ui
        data-hidden={keyboard || undefined}
        role="toolbar"
        aria-label={`${KIND_LABELS[kind]} tools`}
      >
        <span className={styles.dockKind}>
          <KindIcon size="xs" color="currentColor" />
          {KIND_LABELS[kind]}
        </span>
        <ScrollerNone orientation="horizontal" className={styles.dockTools}>
          {tools}
          {tools != null ? <NodeToolbarSeparator /> : null}
          <NodeToolbarButton icon={ArrowSmallUpIcon} label="Move up" onClick={() => move(-1)} />
          <NodeToolbarButton icon={ArrowSmallDownIcon} label="Move down" onClick={() => move(1)} />
          <NodeToolbarButton
            icon={CopyIcon}
            label="Duplicate"
            onClick={() => {
              const copy = actions.duplicate(uid);
              if (copy != null) ui.set({ selectedId: copy });
            }}
          />
          <NodeToolbarButton
            icon={MoreHorizontalIcon}
            label="More"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              ui.set({ contextMenu: { uid, x: rect.left, y: rect.top - 4 } });
            }}
          />
          <NodeToolbarButton icon={TrashIcon} label="Delete" danger onClick={() => actions.remove(uid)} />
        </ScrollerNone>
        <button type="button" className={styles.dockDone} onClick={() => ui.set({ selectedId: null })}>
          Done
        </button>
      </div>
    );
  }
  return (
    <div
      ref={setFloating}
      style={floatingStyles}
      className={styles.toolbar}
      data-builder-ui
      role="toolbar"
      aria-label={`${KIND_LABELS[kind]} tools`}
    >
      <Tooltip text="Drag to move" position="top">
        <span className={styles.handle} aria-hidden>
          <DragIcon size="xs" color="currentColor" />
          <KindIcon size="xs" color="currentColor" />
          <span className={styles.kind}>{KIND_LABELS[kind]}</span>
        </span>
      </Tooltip>
      {tools != null ? (
        <>
          <NodeToolbarSeparator />
          {tools}
        </>
      ) : null}
      <NodeToolbarSeparator />
      <NodeToolbarButton
        icon={CopyIcon}
        label="Duplicate"
        shortcut={`${MOD()}D`}
        onClick={() => {
          const copy = actions.duplicate(uid);
          if (copy != null) ui.set({ selectedId: copy });
        }}
      />
      <NodeToolbarButton
        icon={MoreHorizontalIcon}
        label="More"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          ui.set({ contextMenu: { uid, x: rect.left, y: rect.bottom + 4 } });
        }}
      />
      <NodeToolbarButton icon={TrashIcon} label="Delete" shortcut="Del" danger onClick={() => actions.remove(uid)} />
    </div>
  );
};

NodeToolbar.displayName = 'NodeToolbar';
