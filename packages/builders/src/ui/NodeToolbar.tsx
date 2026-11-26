import { useLayoutEffect, type ComponentType, type MouseEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { Tooltip, type PopoutRenderProps } from '@discord-mana/components';
import { AnchoredPopout } from './popouts';
import { CopyIcon, DragIcon, MoreHorizontalIcon, TrashIcon, type IconProps } from '@discord-mana/icons';
import type { NodeKind } from '../core';
import { isMac } from './NodeFrame';
import { KIND_ICONS, KIND_LABELS } from './meta';
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

/** The bar above a selected node: drag handle, its own tools, duplicate, more and delete. */
export const NodeToolbar = ({ uid, kind, tools }: { uid: string; kind: NodeKind; tools?: ReactNode }) => {
  const ui = useBuilderUIStore();
  const { actions } = useBuilderContext();
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
      flip({ fallbackPlacements: ['top-end', 'top-start', 'bottom-start'] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  useLayoutEffect(() => {
    setReference(ui.frames.get(uid) ?? null);
  }, [setReference, ui, uid]);
  const KindIcon = KIND_ICONS[kind];
  return (
    <div
      ref={setFloating}
      style={floatingStyles}
      className={styles.toolbar}
      data-builder-ui
      role="toolbar"
      aria-label={`${KIND_LABELS[kind]} tools`}
    >
      <Tooltip text="Drag to move, or press Space on the selection" position="top">
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
