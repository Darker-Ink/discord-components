import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { componentButtonStyles } from '@discord-mana/messages';
import { useBuilderNode, type ButtonNode } from '../core';
import { useHistoryKeys } from './BuilderTextField';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import styles from './ButtonLabelEditor.module.css';

const COPIED_STYLES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'color',
  'textTransform',
  'fontFeatureSettings',
] as const;

/**
 * Edits a selected button's label in place. A button can't hold an editable text in every browser, so this
 * lays an editable copy of the label exactly over the real one: the button keeps rendering (and resizing) from
 * the saved label underneath, and the text you type is the one you see.
 */
export const ButtonLabelEditor = ({ uid }: { uid: string }) => {
  const ui = useBuilderUIStore();
  const { actions } = useBuilderContext();
  const node = useBuilderNode<ButtonNode>(uid);
  const label = node != null && 'label' in node ? (node.label ?? '') : '';
  const premium = node?.style === 6;
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<CSSProperties | null>(null);
  const [editing, setEditing] = useState(false);
  const historyKeys = useHistoryKeys();

  const findLabel = useCallback(
    () => ui.frames.get(uid)?.querySelector<HTMLElement>(`.${componentButtonStyles.label}`) ?? null,
    [ui, uid],
  );

  const measure = useCallback(() => {
    const frame = ui.frames.get(uid);
    const target = findLabel();
    if (frame == null || target == null) {
      setBox(null);
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const computed = getComputedStyle(target);
    const next: Record<string, string | number> = {
      left: rect.left - frameRect.left,
      top: rect.top - frameRect.top,
      height: rect.height,
    };
    for (const key of COPIED_STYLES) next[key] = computed[key];
    setBox((previous) =>
      previous != null && Object.entries(next).every(([key, value]) => previous[key as keyof CSSProperties] === value)
        ? previous
        : (next as CSSProperties),
    );
  }, [findLabel, ui, uid]);

  useLayoutEffect(() => {
    // Measuring the label after each render is what keeps the copy aligned with it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
  });

  useLayoutEffect(() => {
    const frame = ui.frames.get(uid);
    if (frame == null) return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measure, ui, uid]);

  // The real label hides while its copy is being edited, so only one text shows.
  useLayoutEffect(() => {
    const target = findLabel();
    if (target == null || !editing) return;
    target.style.visibility = 'hidden';
    return () => {
      target.style.visibility = '';
    };
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element != null && !editing && element.textContent !== label) element.textContent = label;
  }, [editing, label, box]);

  if (premium || box == null) return null;
  return (
    <span
      ref={ref}
      className={styles.label}
      data-editing={editing || undefined}
      data-builder-field="label"
      data-builder-nodrag
      role="textbox"
      aria-label="Button label"
      tabIndex={0}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      style={box}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        setEditing(false);
        actions.checkpoint();
      }}
      onInput={(event) => {
        const text = (event.currentTarget.textContent ?? '').replace(/\n/g, ' ');
        actions.update(uid, { label: text === '' ? undefined : text }, { coalesce: `${uid}:label` });
      }}
      onKeyDown={(event) => {
        if (historyKeys(event)) return;
        event.stopPropagation();
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          event.currentTarget.blur();
          ui.frames.get(uid)?.focus();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain').replace(/\r?\n/g, ' '));
      }}
    />
  );
};

ButtonLabelEditor.displayName = 'ButtonLabelEditor';
