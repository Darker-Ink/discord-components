import { useMemo, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Button,
  Popout,
  Switch,
  Text,
  TextInput,
  type PopoutRenderProps,
  type PopoutTriggerProps,
  type PopoutTriggerState,
} from '@discord-mana/components';
import { useNodeIssues } from '../core';
import { patchField, readField, useEditableNode } from './fields';
import { useBuilderContext } from './useBuilderContext';
import styles from './popouts.module.css';

/** The surface of a small editor next to a node: a title, its controls, and actions at the bottom. */
export const PopoutPanel = ({
  title,
  children,
  footer,
  className,
  width = 300,
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  width?: number;
}) => (
  <div
    className={clsx(styles.panel, className)}
    style={{ width }}
    role="dialog"
    aria-label={typeof title === 'string' ? title : undefined}
    data-builder-ui
    data-builder-nodrag
    // Keys typed here belong to the inputs, not the node behind.
    onKeyDown={(event) => {
      if (event.key !== 'Escape') event.stopPropagation();
    }}
  >
    <Text variant="heading-sm/semibold" color="text-strong" className={styles.title}>
      {title}
    </Text>
    <div className={styles.body}>{children}</div>
    {footer != null ? <div className={styles.footer}>{footer}</div> : null}
  </div>
);

PopoutPanel.displayName = 'PopoutPanel';

const useFieldError = (uid: string, field: string) => {
  const issues = useNodeIssues(uid);
  return useMemo(
    () =>
      issues
        .filter((issue) => issue.field === field || issue.field?.startsWith(`${field}.`))
        .map((issue) => issue.message)
        .join(' ') || undefined,
    [issues, field],
  );
};

export interface NodeTextInputProps {
  uid: string;
  field: string;
  label: string;
  placeholder?: string;
  description?: ReactNode;
  type?: string;
  autoFocus?: boolean;
  /** Converts the typed text to what is stored (e.g. a number); `undefined` removes the field. */
  parse?: (text: string) => unknown;
  format?: (value: unknown) => string;
}

/** A text input bound to one property of a node: every change is saved, problems show under it. */
export const NodeTextInput = ({
  uid,
  field,
  label,
  placeholder,
  description,
  type,
  autoFocus,
  parse,
  format,
}: NodeTextInputProps) => {
  const { actions } = useBuilderContext();
  const node = useEditableNode(uid);
  const raw = readField(node, field);
  const value = format != null ? format(raw) : typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
  const error = useFieldError(uid, field);
  return (
    <TextInput
      label={label}
      description={description}
      placeholder={placeholder}
      value={value}
      type={type}
      autoFocus={autoFocus}
      errorMessage={error}
      onChange={(text) => {
        if (node == null) return;
        actions.update(uid, patchField(node, field, parse != null ? parse(text) : text), {
          coalesce: `${uid}:${field}`,
        });
      }}
      onBlur={() => actions.checkpoint()}
    />
  );
};

NodeTextInput.displayName = 'NodeTextInput';

/** A switch bound to a boolean property of a node (absent counts as `defaultValue`). */
export const NodeSwitch = ({
  uid,
  field,
  label,
  description,
  defaultValue = false,
}: {
  uid: string;
  field: string;
  label: string;
  description?: string;
  defaultValue?: boolean;
}) => {
  const { actions } = useBuilderContext();
  const node = useEditableNode(uid);
  const raw = readField(node, field);
  const checked = typeof raw === 'boolean' ? raw : defaultValue;
  return (
    <Switch
      label={label}
      description={description}
      checked={checked}
      onChange={(next: boolean) => {
        if (node == null) return;
        // Store only what differs from the API's default, like a hand-written payload would.
        actions.update(uid, patchField(node, field, next === defaultValue ? undefined : next));
      }}
    />
  );
};

NodeSwitch.displayName = 'NodeSwitch';

export const RemoveButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button variant="critical-secondary" size="sm" text={label} onClick={onClick} />
);

RemoveButton.displayName = 'RemoveButton';

export type AnchoredTriggerProps = PopoutTriggerProps & { ref: (element: HTMLElement | null) => void };

/**
 * A `Popout` whose trigger gets a `ref` with its other props, so it is positioned against whatever element the
 * trigger renders (a toolbar button, a placeholder on the canvas).
 */
export const AnchoredPopout = ({
  renderPopout,
  children,
  position = 'bottom',
  align = 'left',
  spacing = 8,
}: {
  renderPopout: (props: PopoutRenderProps) => ReactNode;
  children: (props: AnchoredTriggerProps, state: PopoutTriggerState) => ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'right' | 'center' | 'top' | 'bottom';
  spacing?: number;
}) => {
  const targetRef = useRef<HTMLElement | null>(null);
  return (
    <Popout
      renderPopout={renderPopout}
      position={position}
      align={align}
      targetElementRef={targetRef}
      spacing={spacing}
    >
      {(props, state) =>
        children(
          {
            ...props,
            ref: (element) => {
              targetRef.current = element;
            },
          },
          state,
        )
      }
    </Popout>
  );
};

AnchoredPopout.displayName = 'AnchoredPopout';

/** A popout opened by clicking something on the canvas (an "add image" placeholder, a colour bar). */
export const SlotPopout = AnchoredPopout;
