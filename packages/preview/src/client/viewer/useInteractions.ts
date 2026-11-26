import { useCallback, useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  openInteractionModal,
  type APIMessage,
  type APIModalSubmission,
  type MessageComponentInteraction,
} from '@discord-mana/messages';
import type { InteractionEvent, ModalSubmitEvent, ReadyEvent } from '../../shared/api';
import { parseTimeout } from '../viewParams';
import type { Command } from './commands';

interface Pending {
  resolve: () => void;
  reject: (reason: unknown) => void;
  timer: number;
  /** The message the interaction came from, for modals' app header and `update` replies. */
  message: APIMessage | null;
}

/** An error without a message, which the components show as Discord's "This interaction failed". */
const interactionFailed = () => new Error('');

const DISCORD_EPOCH = 1420070400000n;
let sequence = 0n;
const nextInteractionId = () =>
  String(((BigInt(Date.now()) - DISCORD_EPOCH) << 22n) + (sequence++ % 4096n) + (1n << 12n));

/** Starts a timer, or none for a timeout of `Infinity`. */
const startTimer = (callback: () => void, ms: number) => (Number.isFinite(ms) ? window.setTimeout(callback, ms) : 0);

export interface UseInteractionsOptions {
  /** Both opt-ins are present (`options.interactions` and `interactions=1`) and the page is framed. */
  enabled: boolean;
  previewId: string;
  allowedOrigins: string[] | null;
  setMessages: Dispatch<SetStateAction<APIMessage[]>>;
  getMessages: () => APIMessage[];
  /**
   * How long an interaction may go unanswered, and how long once deferred (ms; `Infinity` for never). Discord's
   * 3 seconds and 15 minutes by default; the URL params and the page's `configure` command change them.
   */
  timeouts: { response: number; deferred: number };
}

/**
 * Connects a preview to the page that embeds it: component interactions and modal submissions go out as
 * postMessage events, and the page answers with commands that add, change or remove messages, open modals, or
 * settle the interaction. Nothing leaves the browser and nothing is stored.
 */
export const useInteractions = ({
  enabled,
  previewId,
  allowedOrigins,
  setMessages,
  getMessages,
  timeouts: initialTimeouts,
}: UseInteractionsOptions) => {
  const pending = useRef(new Map<string, Pending>());
  const timeouts = useRef(initialTimeouts);

  const post = useCallback(
    (event: InteractionEvent | ModalSubmitEvent | ReadyEvent) => {
      // With allowed origins the events only ever reach those; otherwise any parent may listen.
      if (allowedOrigins == null) window.parent.postMessage(event, '*');
      else for (const origin of allowedOrigins) window.parent.postMessage(event, origin);
    },
    [allowedOrigins],
  );

  const track = useCallback((interactionId: string, message: APIMessage | null) => {
    const entries = pending.current;
    return new Promise<void>((resolve, reject) => {
      const fail = () => {
        entries.delete(interactionId);
        reject(interactionFailed());
      };
      entries.set(interactionId, { resolve, reject, message, timer: startTimer(fail, timeouts.current.response) });
    });
  }, []);

  const settle = useCallback((interactionId: string | undefined, error?: unknown) => {
    if (interactionId == null) return;
    const entry = pending.current.get(interactionId);
    if (entry == null) return;
    window.clearTimeout(entry.timer);
    pending.current.delete(interactionId);
    if (error === undefined) entry.resolve();
    else entry.reject(error);
  }, []);

  const defer = useCallback(
    (interactionId: string) => {
      const entry = pending.current.get(interactionId);
      if (entry == null) return;
      window.clearTimeout(entry.timer);
      entry.timer = startTimer(() => settle(interactionId, interactionFailed()), timeouts.current.deferred);
    },
    [settle],
  );

  const openModal = useCallback(
    (command: Extract<Command, { type: 'discord-mana:open-modal' }>) => {
      const source = pending.current.get(command.interactionId)?.message ?? null;
      const author = source?.author;
      const application = command.application ?? {
        id: author?.id ?? '0',
        name: author?.global_name ?? author?.username ?? 'App',
        ...(author?.avatar_url != null ? { icon_url: author.avatar_url } : {}),
      };
      settle(command.interactionId);
      openInteractionModal({
        modal: command.modal,
        application,
        onSubmit: (submission: APIModalSubmission) => {
          const interactionId = nextInteractionId();
          post({
            type: 'discord-mana:modal-submit',
            previewId,
            interactionId,
            sourceInteractionId: command.interactionId,
            messageId: source?.id ?? null,
            data: submission as ModalSubmitEvent['data'],
          });
          return track(interactionId, source);
        },
      });
    },
    [post, previewId, settle, track],
  );

  const apply = useCallback(
    async (command: Command) => {
      switch (command.type) {
        case 'discord-mana:ping':
          post({ type: 'discord-mana:ready', previewId });
          return;
        case 'discord-mana:configure': {
          // Applies to interactions from now on; ones already waiting keep their timers.
          const response = parseTimeout(command.timeouts?.response);
          const deferred = parseTimeout(command.timeouts?.deferred);
          timeouts.current = {
            response: response ?? timeouts.current.response,
            deferred: deferred ?? timeouts.current.deferred,
          };
          return;
        }
        case 'discord-mana:append-message':
          setMessages((messages) => [...messages, command.message]);
          settle(command.interactionId);
          return;
        case 'discord-mana:update-message': {
          const current = getMessages().find((message) => message.id === command.messageId);
          if (current == null) {
            console.warn(`[discord-mana preview] update-message: no message ${command.messageId}`);
            return;
          }
          const { mergeMessage } = await import('./commands');
          const result = mergeMessage(current, command.patch);
          if ('error' in result) {
            console.warn('[discord-mana preview] Ignored an invalid update-message command:', result.error);
            return;
          }
          setMessages((messages) =>
            messages.map((message) => (message.id === command.messageId ? result.message : message)),
          );
          settle(command.interactionId);
          return;
        }
        case 'discord-mana:delete-message':
          setMessages((messages) => messages.filter((message) => message.id !== command.messageId));
          settle(command.interactionId);
          return;
        case 'discord-mana:open-modal':
          openModal(command);
          return;
        case 'discord-mana:set-loading':
          defer(command.interactionId);
          return;
        case 'discord-mana:ack':
          settle(command.interactionId);
          return;
        case 'discord-mana:interaction-failed':
          settle(command.interactionId, command.message ?? interactionFailed());
          return;
      }
    },
    [defer, getMessages, openModal, post, previewId, setMessages, settle],
  );

  // The listener always applies commands with the latest state, without re-subscribing (and re-announcing).
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let detach = () => {};
    // The validation code (zod and the API's schemas) only loads for pages that use interactions.
    void import('./commands').then(({ parseCommand }) => {
      if (cancelled) return;
      let queue = Promise.resolve();
      const onMessage = (event: MessageEvent) => {
        if (event.source !== window.parent) return;
        const data = event.data as { type?: unknown } | null;
        if (typeof data?.type !== 'string' || !data.type.startsWith('discord-mana:')) return;
        if (allowedOrigins != null && !allowedOrigins.includes(event.origin)) {
          console.warn(`[discord-mana preview] Ignored ${data.type} from ${event.origin}: not an allowed origin.`);
          return;
        }
        const result = parseCommand(data);
        if ('error' in result) {
          console.warn(`[discord-mana preview] Ignored an invalid ${data.type} command:`, result.error);
          return;
        }
        // Commands apply in the order they arrive, even when one has to wait for a lazy import.
        queue = queue.then(() => applyRef.current(result.command));
      };
      window.addEventListener('message', onMessage);
      detach = () => window.removeEventListener('message', onMessage);
      post({ type: 'discord-mana:ready', previewId });
    });
    const entries = pending.current;
    return () => {
      cancelled = true;
      detach();
      for (const entry of entries.values()) window.clearTimeout(entry.timer);
      entries.clear();
    };
  }, [enabled, allowedOrigins, post, previewId]);

  return useCallback(
    (interaction: MessageComponentInteraction<APIMessage>) => {
      const interactionId = nextInteractionId();
      post({
        type: 'discord-mana:interaction',
        previewId,
        messageId: interaction.message.id,
        interactionId,
        data: interaction.data,
      });
      return track(interactionId, interaction.message);
    },
    [post, previewId, track],
  );
};
