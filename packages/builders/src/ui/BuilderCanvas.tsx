import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Popout, Text } from '@discord-mana/components';
import { Message, MessageListItem, type APIMessage } from '@discord-mana/messages';
import { ROOT_UID, toJSON, useBuilderSelector, useNodeIssues, type BuilderDocument } from '../core';
import { BuilderTextField } from './BuilderTextField';
import { EditableComponents } from './EditableComponents';
import { EditableEmbed } from './EditableEmbed';
import { NodeContextMenu } from './NodeContextMenu';
import { focusFirstText } from './NodeFrame';
import { NodeTextInput, PopoutPanel } from './popouts';
import { useBuilderRender } from './renderContext';
import { listKey, useBuilderUI, useBuilderUIStore } from './uiStore';
import { IssueBadge } from './IssueBadge';
import { useBuilderScope } from './BuilderProvider';
import styles from './BuilderCanvas.module.css';

/** Who the message is from when the payload doesn't say (a webhook's own name and avatar). */
export interface BuilderAuthor {
  id?: string;
  username: string;
  avatarUrl?: string | null;
}

export const DEFAULT_AUTHOR: BuilderAuthor = { id: '1300000000000000001', username: 'Captain Hook', avatarUrl: null };

const MESSAGE_ID = '1300000000000000002';

/**
 * The message as the client would show it, from a document: the author is the webhook (username and avatar
 * overrides applied), and media in the payload is sized like Discord's response would be.
 */
export const toPreviewMessage = (
  doc: BuilderDocument,
  { author = DEFAULT_AUTHOR, timestamp, channelId }: { author?: BuilderAuthor; timestamp: string; channelId: string },
): APIMessage => {
  const payload = toJSON(doc);
  return {
    id: MESSAGE_ID,
    channel_id: channelId,
    type: 0,
    timestamp,
    edited_timestamp: null,
    content: doc.mode === 'cv2' ? '' : (payload.content ?? ''),
    flags: payload.flags,
    author: {
      id: author.id ?? DEFAULT_AUTHOR.id!,
      username: payload.username ?? author.username,
      global_name: null,
      avatar: null,
      bot: true,
      avatar_url: payload.avatar_url ?? author.avatarUrl ?? undefined,
    } as APIMessage['author'],
    webhook_id: author.id ?? DEFAULT_AUTHOR.id,
    embeds: payload.embeds ?? [],
    components: payload.components ?? [],
  } as APIMessage;
};

/** Selection follows the innermost node under the pointer; anything else on the canvas clears it. */
const nodeOf = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>('[data-builder-node]') : null;

const isEditorUI = (target: EventTarget | null) =>
  target instanceof Element && target.closest('[data-builder-ui], [data-builder-field], [role="textbox"]') != null;

/**
 * Focuses the text the editor asked for once its node has rendered: the first text of a node just added, or
 * the text an issue is about.
 */
const usePendingFocus = () => {
  const ui = useBuilderUIStore();
  const pending = useBuilderUI((state) => state.pendingFocus);
  useEffect(() => {
    if (pending == null) return;
    const frame = requestAnimationFrame(() => {
      const element =
        pending.uid === ROOT_UID
          ? document.querySelector<HTMLElement>('[data-builder-canvas]')
          : ui.frames.get(pending.uid);
      if (focusFirstText(element, pending.field)) ui.set({ pendingFocus: null });
      else if (pending.field == null) {
        element?.focus();
        ui.set({ pendingFocus: null });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pending, ui]);
};

const IdentityPopout = ({ author }: { author: BuilderAuthor }) => (
  <PopoutPanel title="Webhook profile">
    <NodeTextInput
      uid={ROOT_UID}
      field="username"
      label="Username"
      placeholder={author.username}
      description="Replaces the webhook’s name for this message"
      autoFocus
    />
    <NodeTextInput
      uid={ROOT_UID}
      field="avatar_url"
      label="Avatar URL"
      placeholder="https://…"
      description="Replaces the webhook’s avatar for this message"
    />
  </PopoutPanel>
);

export interface BuilderCanvasProps {
  /** The webhook's own name and avatar, shown when the message doesn't override them. */
  author?: BuilderAuthor;
  /** When the message appears to be sent (defaults to when the canvas mounted). */
  timestamp?: string;
  className?: string;
  /** Shown when the message is empty. */
  emptyState?: ReactNode;
}

/**
 * The message being built, drawn like the client draws it in a channel, and edited in place. Click anything to
 * select it; type to change text; drag to move; right-click for more.
 */
export const BuilderCanvas = ({ author = DEFAULT_AUTHOR, timestamp, className, emptyState }: BuilderCanvasProps) => {
  const ui = useBuilderUIStore();
  const { readOnly, channelId, renderMessageMarkdown: renderMessage } = useBuilderRender();
  const doc = useBuilderSelector((state) => state.doc);
  const dragging = useBuilderUI((state) => state.drag != null);
  const [sentAt] = useState(() => timestamp ?? new Date().toISOString());
  const message = useMemo(
    () => toPreviewMessage(doc, { author, timestamp: timestamp ?? sentAt, channelId }),
    [author, channelId, doc, sentAt, timestamp],
  );
  const identityRef = useRef<Element | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const rootIssues = useNodeIssues(ROOT_UID);
  usePendingFocus();
  // The message's own lists: drops on an empty message land in its placeholder, else anywhere on the canvas.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const registerCanvas = useCallback(
    (element: HTMLDivElement | null) => {
      canvasRef.current = element;
      for (const slot of ['embeds', 'components'] as const) {
        if (element != null) ui.lists.set(listKey(null, slot), element);
        else ui.lists.delete(listKey(null, slot));
      }
    },
    [ui],
  );
  const registerEmpty = useCallback(
    (element: HTMLDivElement | null) => {
      const target = element ?? canvasRef.current;
      if (target != null) ui.lists.set(listKey(null, 'components'), target);
    },
    [ui],
  );
  const scope = useBuilderScope();

  // Selection happens on release, not on press: selecting shows a node's empty parts, and the layout must not
  // move under a press that turns into a drag.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDownCapture = useCallback((event: PointerEvent<HTMLDivElement>) => {
    // Popouts opened from the canvas are portals: their events arrive here through React, not the DOM.
    if (!event.currentTarget.contains(event.target as Node)) return;
    event.currentTarget.removeAttribute('data-keyboard');
    pressRef.current = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  }, []);

  const onPointerUpCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      pressRef.current = null;
      if (readOnly || press == null || !event.currentTarget.contains(event.target as Node)) return;
      if (ui.getState().drag != null || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
      const target = event.target as Element;
      if (target.closest('[data-builder-ui]') != null && nodeOf(target) == null) return;
      const frame = nodeOf(target);
      const uid = frame?.dataset.builderNode ?? null;
      ui.set({ selectedId: uid, contextMenu: null });
      // Focus the node, unless the press is in its text (which focuses itself).
      if (frame != null && !isEditorUI(target)) frame.focus({ preventScroll: true });
    },
    [readOnly, ui],
  );

  // A builder's buttons, links, selects and images do nothing but get selected.
  const swallow = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (readOnly || isEditorUI(event.target) || !event.currentTarget.contains(event.target as Node)) return;
      if (nodeOf(event.target) == null && !(event.target as Element).closest('a, button')) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [readOnly],
  );

  const onContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (readOnly || !event.currentTarget.contains(event.target as Node)) return;
      const frame = nodeOf(event.target);
      if (frame == null || isEditorUI(event.target)) return;
      event.preventDefault();
      const uid = frame.dataset.builderNode!;
      ui.set({ selectedId: uid, contextMenu: { uid, x: event.clientX, y: event.clientY } });
    },
    [readOnly, ui],
  );

  const isEmpty =
    doc.components.length === 0 && (doc.mode === 'cv2' || (doc.embeds.length === 0 && doc.content === ''));

  const accessories = (
    <>
      {doc.mode === 'classic'
        ? doc.embeds.map((embed, index) => (
            <EditableEmbed key={embed.uid} uid={embed.uid} embedIndex={index} message={message} />
          ))
        : null}
      <EditableComponents message={message} />
      {isEmpty && !readOnly && doc.mode === 'cv2' ? (
        <div className={styles.empty} ref={registerEmpty}>
          {emptyState ?? <DefaultEmptyState mode={doc.mode} />}
        </div>
      ) : null}
    </>
  );

  const content =
    doc.mode === 'classic' ? (
      <BuilderTextField
        uid={ROOT_UID}
        kind="message"
        field="content"
        multiline
        placeholder={readOnly ? undefined : isEmpty ? 'Type a message, or drag in an embed…' : 'Add a message'}
        renderPreview={(value) =>
          renderMessage(value, { kind: 'content', messageId: message.id, channelId: message.channel_id })
        }
        aria-label="Message content"
        disabled={readOnly}
      />
    ) : null;
  return (
    <div
      ref={registerCanvas}
      className={clsx(styles.canvas, className)}
      {...scope}
      data-builder-canvas
      data-dragging={dragging || undefined}
      data-readonly={readOnly || undefined}
      onPointerDownCapture={onPointerDownCapture}
      onPointerUpCapture={onPointerUpCapture}
      onClickCapture={swallow}
      onMouseDownCapture={(event) => {
        // Text selection and focus still work in editable text; elsewhere, nothing should react to a press.
        if (readOnly || isEditorUI(event.target) || nodeOf(event.target) == null) return;
        if (!event.currentTarget.contains(event.target as Node)) return;
        if ((event.target as Element).closest('a, button, img, video, [role="button"], [role="combobox"]') != null)
          event.preventDefault();
      }}
      onContextMenu={onContextMenu}
      // Focus rings are for keyboard users; a click selects without one.
      onKeyDownCapture={(event) => {
        if (event.currentTarget.contains(event.target as Node)) event.currentTarget.setAttribute('data-keyboard', '');
      }}
    >
      <ol className={styles.list} aria-label="Message preview">
        <MessageListItem message={message}>
          <Message
            message={message}
            accessories={accessories}
            onClickAvatar={
              readOnly
                ? undefined
                : (event) => {
                    identityRef.current = event.currentTarget;
                    setIdentityOpen(true);
                  }
            }
            onClickUsername={
              readOnly
                ? undefined
                : (event) => {
                    identityRef.current = event.currentTarget;
                    setIdentityOpen(true);
                  }
            }
          >
            {content}
          </Message>
        </MessageListItem>
      </ol>
      {rootIssues.length > 0 && !readOnly ? (
        <div className={styles.rootIssues}>
          <IssueBadge issues={rootIssues.filter((issue) => issue.field !== 'content')} />
        </div>
      ) : null}
      <Popout
        shouldShow={identityOpen}
        targetElementRef={identityRef}
        position="bottom"
        align="left"
        onRequestClose={() => setIdentityOpen(false)}
        renderPopout={() => <IdentityPopout author={author} />}
      >
        {() => null}
      </Popout>
      {!readOnly ? <NodeContextMenu /> : null}
    </div>
  );
};

BuilderCanvas.displayName = 'BuilderCanvas';

const DefaultEmptyState = ({ mode }: { mode: 'classic' | 'cv2' }) => (
  <>
    <Text variant="heading-md/semibold" color="text-strong">
      {mode === 'cv2' ? 'Start with a container or some text' : 'Start with an embed'}
    </Text>
    <Text variant="body-sm/normal" color="text-muted">
      Drag a component in from the left, or click one to add it.
    </Text>
  </>
);
