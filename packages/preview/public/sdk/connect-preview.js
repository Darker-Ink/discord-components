// @ts-check
/* global window, URL */
/**
 * connectPreview: talk to a mana preview embedded in an iframe. Framework-free, no dependencies.
 * Types: ./connect-preview.d.ts. Docs: /docs#interactions
 *
 * @typedef {import('./connect-preview.d.ts').ConnectPreviewOptions} ConnectPreviewOptions
 * @typedef {import('./connect-preview.d.ts').PreviewConnection} PreviewConnection
 * @typedef {import('./connect-preview.d.ts').InteractionContext} InteractionContext
 */

const PREFIX = 'discord-mana:';

/**
 * @param {HTMLIFrameElement} iframe The iframe showing `/p/<id>?interactions=1`.
 * @param {ConnectPreviewOptions} [options]
 * @returns {PreviewConnection}
 */
export function connectPreview(iframe, options = {}) {
  const origin = new URL(iframe.src, window.location.href).origin;
  /** @type {Record<string, unknown>[]} */
  let queue = [];
  let ready = false;

  /** @param {Record<string, unknown>} command */
  const send = (command) => {
    const target = iframe.contentWindow;
    if (!ready || target == null) {
      queue.push(command);
      return;
    }
    target.postMessage(command, origin);
  };

  /** @param {string} name @param {Record<string, unknown>} [fields] */
  const command = (name, fields = {}) => send({ type: PREFIX + name, ...fields });

  /** @type {PreviewConnection} */
  const connection = {
    appendMessage: (message, interactionId) =>
      command('append-message', { message, ...(interactionId ? { interactionId } : {}) }),
    updateMessage: (messageId, message, interactionId) =>
      command('update-message', { messageId, message, ...(interactionId ? { interactionId } : {}) }),
    deleteMessage: (messageId, interactionId) =>
      command('delete-message', { messageId, ...(interactionId ? { interactionId } : {}) }),
    openModal: (interactionId, modal, application) =>
      command('open-modal', { interactionId, modal, ...(application ? { application } : {}) }),
    setLoading: (interactionId) => command('set-loading', { interactionId }),
    ack: (interactionId) => command('ack', { interactionId }),
    fail: (interactionId, message) => command('interaction-failed', { interactionId, ...(message ? { message } : {}) }),
    disconnect: () => window.removeEventListener('message', onMessage),
  };

  /**
   * Calls a handler with helpers bound to the interaction, and answers for it if the handler doesn't: an
   * acknowledgement once it returns, "thinking…" while its promise is pending, and a failure if it throws.
   * @param {((event: any, context: InteractionContext) => unknown) | undefined} handler
   * @param {any} event
   */
  const handle = async (handler, event) => {
    if (handler == null) return;
    const id = event.interactionId;
    let answered = false;
    let deferred = false;
    /** @param {() => void} answer */
    const once = (answer) => {
      answered = true;
      answer();
    };
    /** @type {InteractionContext} */
    const context = {
      reply: (message) => once(() => connection.appendMessage(message, id)),
      update: (message, messageId = event.messageId) => once(() => connection.updateMessage(messageId, message, id)),
      openModal: (modal, application) => once(() => connection.openModal(id, modal, application)),
      defer: () => {
        deferred = true;
        connection.setLoading(id);
      },
      fail: (message) => once(() => connection.fail(id, message)),
    };
    try {
      const result = handler(event, context);
      if (result != null && typeof (/** @type {any} */ (result).then) === 'function') {
        if (!answered && !deferred) connection.setLoading(id);
        await result;
      }
      // A deferred interaction is answered later, through the connection's methods.
      if (!answered && !deferred) connection.ack(id);
    } catch (error) {
      if (!answered)
        connection.fail(id, error instanceof Error && error.message ? error.message.slice(0, 200) : undefined);
    }
  };

  /** @param {MessageEvent} event */
  function onMessage(event) {
    if (event.source !== iframe.contentWindow || event.origin !== origin) return;
    const data = event.data;
    if (data == null || typeof data.type !== 'string' || !data.type.startsWith(PREFIX)) return;
    switch (data.type) {
      case 'discord-mana:ready': {
        ready = true;
        // Settings first (again after every reload of the preview), then whatever was queued.
        if (options.timeouts != null) send({ type: PREFIX + 'configure', timeouts: options.timeouts });
        const pending = queue;
        queue = [];
        for (const item of pending) send(item);
        options.onReady?.(data);
        break;
      }
      case 'discord-mana:interaction':
        void handle(options.onInteraction, data);
        break;
      case 'discord-mana:modal-submit':
        void handle(options.onModalSubmit, data);
        break;
      case 'discord-mana:resize':
        if (options.autoResize !== false) iframe.style.height = `${data.height}px`;
        break;
    }
  }

  window.addEventListener('message', onMessage);
  // If the preview loaded before this ran, ask it to announce itself again.
  iframe.contentWindow?.postMessage({ type: PREFIX + 'ping' }, origin);
  iframe.addEventListener('load', () => {
    ready = false;
    iframe.contentWindow?.postMessage({ type: PREFIX + 'ping' }, origin);
  });
  return connection;
}
