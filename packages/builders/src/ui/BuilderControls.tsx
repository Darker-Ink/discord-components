import { useCallback } from 'react';
import clsx from 'clsx';
import { IconButton, Tooltip } from '@discord-mana/components';
import { RedoIcon, UndoIcon } from '@discord-mana/icons';
import { allowedModes, useBuilderRestrictions, useBuilderSelector, type BuilderMode } from '../core';
import { isMac } from './NodeFrame';
import { useBuilderContext } from './useBuilderContext';
import styles from './BuilderControls.module.css';

const MODES: { mode: BuilderMode; label: string }[] = [
  { mode: 'classic', label: 'Embeds' },
  { mode: 'cv2', label: 'Components v2' },
  { mode: 'poll', label: 'Poll' },
];

export interface BuilderModeSwitchProps {
  className?: string;
  /** Called after the mode changed (the message is converted; undo brings the old one back). */
  onChange?: (mode: BuilderMode) => void;
  /** Shorter labels for narrow places (`{ cv2: 'CV2' }`); the full names stay the accessible ones. */
  labels?: Partial<Record<BuilderMode, string>>;
}

/**
 * Switches between a classic message (embeds), Components v2 and a poll (which goes alone). The message is
 * converted rather than lost where it can be (embeds become containers and back, a poll keeps the first line as
 * its question), and undo restores exactly what was there.
 */
export const BuilderModeSwitch = ({ className, onChange, labels }: BuilderModeSwitchProps) => {
  const { actions } = useBuilderContext();
  const mode = useBuilderSelector((state) => state.doc.mode);
  // A builder that allows one mode has nothing to switch.
  const modes = allowedModes(useBuilderRestrictions());
  if (modes.length < 2) return null;
  return (
    <div className={clsx(styles.switch, className)} role="radiogroup" aria-label="Message type">
      {MODES.filter((entry) => modes.includes(entry.mode)).map((entry) => (
        <button
          key={entry.mode}
          type="button"
          role="radio"
          aria-checked={mode === entry.mode}
          aria-label={labels?.[entry.mode] != null ? entry.label : undefined}
          className={styles.option}
          onClick={() => {
            if (mode === entry.mode) return;
            actions.setMode(entry.mode, { convert: true });
            onChange?.(entry.mode);
          }}
        >
          {labels?.[entry.mode] ?? entry.label}
        </button>
      ))}
    </div>
  );
};

BuilderModeSwitch.displayName = 'BuilderModeSwitch';

/** Undo and redo for the whole message (also Ctrl/⌘+Z and Ctrl/⌘+Shift+Z anywhere in the builder). */
export const BuilderHistoryButtons = ({ className }: { className?: string }) => {
  const { actions } = useBuilderContext();
  const canUndo = useBuilderSelector(useCallback((state) => state.past.length > 0, []));
  const canRedo = useBuilderSelector(useCallback((state) => state.future.length > 0, []));
  const mod = isMac() ? '⌘' : 'Ctrl+';
  return (
    <div className={clsx(styles.history, className)}>
      <Tooltip text="Undo" keyboardShortcut={`${mod}Z`} position="bottom">
        <IconButton
          variant="icon-only"
          size="sm"
          icon={{ type: 'icon', asset: UndoIcon }}
          aria-label="Undo"
          disabled={!canUndo}
          onClick={actions.undo}
        />
      </Tooltip>
      <Tooltip text="Redo" keyboardShortcut={`${mod}Shift+Z`} position="bottom">
        <IconButton
          variant="icon-only"
          size="sm"
          icon={{ type: 'icon', asset: RedoIcon }}
          aria-label="Redo"
          disabled={!canRedo}
          onClick={actions.redo}
        />
      </Tooltip>
    </div>
  );
};

BuilderHistoryButtons.displayName = 'BuilderHistoryButtons';
