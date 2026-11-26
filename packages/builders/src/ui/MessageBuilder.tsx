import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { HeaderBar, Tabs, type TabsItem } from '@discord-mana/components';
import { TextIcon } from '@discord-mana/icons';
import { useBuilderIssues, useBuilderSelector, type BuilderMode } from '../core';
import { BuilderCanvas, type BuilderAuthor } from './BuilderCanvas';
import { BuilderHistoryButtons, BuilderModeSwitch } from './BuilderControls';
import { BuilderProvider, useBuilderScope, type BuilderProviderProps } from './BuilderProvider';
import { ComponentPalette } from './ComponentPalette';
import { JsonPanel } from './JsonPanel';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUIStore } from './uiStore';
import { ValidationPanel } from './ValidationPanel';
import { WebhookPanel, type WebhookPanelProps } from './WebhookPanel';
import styles from './MessageBuilder.module.css';

export type BuilderPanelId = 'issues' | 'json' | 'send';

export interface BuilderPanelsProps {
  className?: string;
  /** Which tabs to show, in order. Default all three. */
  panels?: readonly BuilderPanelId[];
  selectedId?: BuilderPanelId;
  onSelect?: (id: BuilderPanelId) => void;
  /** Passed to the Send tab. */
  webhookStorageKey?: string;
  fetch?: typeof fetch;
  /** Extra actions in the JSON tab's bar. */
  jsonActions?: ReactNode;
  /** Passed to the Send tab. */
  onWebhookChange?: WebhookPanelProps['onWebhookChange'];
}

/** The side panel: Issues (with a count), JSON and Send, as tabs. */
export const BuilderPanels = ({
  className,
  panels = ['issues', 'json', 'send'],
  selectedId,
  onSelect,
  webhookStorageKey,
  fetch: fetchImpl,
  jsonActions,
  onWebhookChange,
}: BuilderPanelsProps) => {
  const issues = useBuilderIssues();
  const [own, setOwn] = useState<BuilderPanelId>(panels[0] ?? 'issues');
  const selected = selectedId ?? own;
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const all: Record<BuilderPanelId, TabsItem<BuilderPanelId>> = {
    issues: {
      id: 'issues',
      label: 'Issues',
      count: issues.length > 0 ? issues.length : undefined,
      'aria-label': issues.length > 0 ? `Issues: ${errors} errors, ${issues.length - errors} warnings` : 'Issues',
      panel: () => <ValidationPanel className={styles.panelBody} />,
    },
    json: { id: 'json', label: 'JSON', panel: () => <JsonPanel className={styles.panelBody} actions={jsonActions} /> },
    send: {
      id: 'send',
      label: 'Send',
      panel: () => (
        <WebhookPanel
          className={styles.panelBody}
          storageKey={webhookStorageKey}
          fetch={fetchImpl}
          onWebhookChange={onWebhookChange}
        />
      ),
    },
  };
  return (
    <div className={clsx(styles.panels, className)} {...useBuilderScope()}>
      <Tabs
        aria-label="Message tools"
        items={panels.map((id) => all[id])}
        selectedId={selected}
        onChange={(id) => {
          setOwn(id);
          onSelect?.(id);
        }}
      />
    </div>
  );
};

BuilderPanels.displayName = 'BuilderPanels';

/** A channel's look around the canvas: the header bar, then the message list. */
export const BuilderChannel = ({
  name = 'message-builder',
  topic,
  children,
  className,
  actions,
  footer,
}: {
  name?: string;
  topic?: string;
  children: ReactNode;
  className?: string;
  /** Rendered at the end of the header bar. */
  actions?: ReactNode;
  /** Under the messages, where the client has its chat input. */
  footer?: ReactNode;
}) => {
  const ui = useBuilderUIStore();
  return (
    <section className={clsx(styles.channel, className)} aria-label={`#${name}`}>
      <HeaderBar className={styles.channelHeader} aria-label={`#${name}`}>
        <HeaderBar.ChannelIcon icon={TextIcon} aria-label="Text channel" disabled />
        <HeaderBar.Title>{name}</HeaderBar.Title>
        {topic != null ? (
          <>
            <HeaderBar.Divider />
            <span className={styles.topic}>{topic}</span>
          </>
        ) : null}
        {actions != null ? <div className={styles.channelActions}>{actions}</div> : null}
      </HeaderBar>
      <div
        className={styles.channelScroller}
        // A click in the channel but outside the message clears the selection.
        onPointerUp={(event) => {
          const target = event.target as Element;
          if (target.closest('[data-builder-canvas], [data-builder-ui]') == null) ui.set({ selectedId: null });
        }}
      >
        {children}
      </div>
      {footer}
    </section>
  );
};

BuilderChannel.displayName = 'BuilderChannel';

const ControlledMode = ({ mode }: { mode?: BuilderMode }) => {
  const { actions } = useBuilderContext();
  const current = useBuilderSelector((state) => state.doc.mode);
  useEffect(() => {
    if (mode != null && mode !== current) actions.setMode(mode, { convert: true });
  }, [actions, current, mode]);
  return null;
};

export interface MessageBuilderProps extends Omit<BuilderProviderProps, 'children'> {
  /** `classic` (content, embeds, action rows) or `cv2` (Components v2). Changing it converts the message. */
  mode?: BuilderMode;
  onModeChange?: (mode: BuilderMode) => void;
  /** The webhook's own name and avatar. */
  author?: BuilderAuthor;
  channelName?: string;
  /** Tabs of the side panel; `[]` hides it. */
  panels?: readonly BuilderPanelId[];
  /** Hide the component palette. */
  hidePalette?: boolean;
  /** Offer to remember the webhook URL under this localStorage key. */
  webhookStorageKey?: string;
  /** Replaces `fetch` for sending (tests, or your own proxy). */
  fetch?: typeof fetch;
  className?: string;
}

const Layout = ({
  onModeChange,
  author,
  channelName,
  panels = ['issues', 'json', 'send'],
  hidePalette = false,
  webhookStorageKey,
  fetch: fetchImpl,
  className,
  mode,
}: Omit<MessageBuilderProps, keyof BuilderProviderProps>) => {
  const scope = useBuilderScope();
  return (
    <div
      className={clsx(
        styles.builder,
        { [styles.noPalette]: hidePalette, [styles.noPanels]: panels.length === 0 },
        className,
      )}
      {...scope}
    >
      <ControlledMode mode={mode} />
      {!hidePalette ? (
        <aside className={styles.palette} aria-label="Add components">
          <ComponentPalette />
        </aside>
      ) : null}
      <BuilderChannel
        name={channelName}
        className={styles.main}
        actions={
          <>
            <BuilderModeSwitch onChange={onModeChange} />
            <BuilderHistoryButtons />
          </>
        }
      >
        <BuilderCanvas author={author} />
      </BuilderChannel>
      {panels.length > 0 ? (
        <aside className={styles.side} aria-label="Message tools">
          <BuilderPanels panels={panels} webhookStorageKey={webhookStorageKey} fetch={fetchImpl} />
        </aside>
      ) : null}
    </div>
  );
};

Layout.displayName = 'MessageBuilderLayout';

/**
 * The whole message builder: a palette to drag components from, the message drawn exactly like Discord and
 * edited in place, and a side panel with validation, live JSON and sending with a webhook. Controlled with
 * `value`/`onChange` (a `BuilderDocument`; use `toJSON`/`fromJSON` for payloads) or uncontrolled with
 * `defaultValue` (a document or a payload).
 */
export const MessageBuilder = ({
  mode,
  onModeChange,
  author,
  channelName,
  panels,
  hidePalette,
  webhookStorageKey,
  fetch: fetchImpl,
  className,
  ...provider
}: MessageBuilderProps) => (
  <BuilderProvider {...provider}>
    <Layout
      mode={mode}
      onModeChange={onModeChange}
      author={author}
      channelName={channelName}
      panels={panels}
      hidePalette={hidePalette}
      webhookStorageKey={webhookStorageKey}
      fetch={fetchImpl}
      className={className}
    />
  </BuilderProvider>
);

MessageBuilder.displayName = 'MessageBuilder';
