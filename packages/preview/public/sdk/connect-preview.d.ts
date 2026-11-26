// Types for connect-preview.js. Messages and modals use Discord's API shapes (see discord-api-types).

/** A message in Discord's API format. `author.id` and `author.username` are required; the rest is optional. */
export interface PreviewMessage {
  id?: string;
  author: { id: string; username: string; global_name?: string | null; avatar_url?: string; bot?: boolean };
  content?: string;
  timestamp?: string;
  embeds?: unknown[];
  attachments?: unknown[];
  components?: unknown[];
  [field: string]: unknown;
}

/** A modal, as an app responds with it (APIModalInteractionResponseCallbackData). */
export interface PreviewModal {
  custom_id: string;
  title: string;
  components: unknown[];
}

/** Shown at the top of a modal. Defaults to the author of the message the interaction came from. */
export interface PreviewApplication {
  id: string;
  name: string;
  icon_url?: string;
}

export interface ReadyEvent {
  type: 'discord-mana:ready';
  previewId: string;
}

export interface InteractionEvent {
  type: 'discord-mana:interaction';
  previewId: string;
  messageId: string;
  interactionId: string;
  /** The API's message component interaction data. */
  data: { custom_id: string; component_type: number; values?: string[]; resolved?: unknown };
}

export interface ModalSubmitEvent {
  type: 'discord-mana:modal-submit';
  previewId: string;
  interactionId: string;
  /** The interaction the modal was opened for, and the message that interaction came from. */
  sourceInteractionId: string;
  messageId: string | null;
  /** The API's modal submit data; `attachments` holds the File objects of file uploads. */
  data: { custom_id: string; components: unknown[]; resolved?: unknown; attachments?: File[] };
}

/** Answers bound to one interaction. Use one; if the handler uses none, the interaction is acknowledged. */
export interface InteractionContext {
  /** Adds a message below the others. */
  reply(message: PreviewMessage): void;
  /** Changes a message: by default the one the interaction came from. Fields you leave out are kept. */
  update(message: Partial<PreviewMessage>, messageId?: string): void;
  /** Opens a modal (component interactions only). */
  openModal(modal: PreviewModal, application?: PreviewApplication): void;
  /**
   * Keeps the component loading ("thinking…") for up to 15 minutes; answer later with the connection's methods
   * and the event's `interactionId`. Done for you while a returned promise is pending.
   */
  defer(): void;
  /** Shows "This interaction failed", or your message under the component. */
  fail(message?: string): void;
}

export interface ConnectPreviewOptions {
  /** A button was clicked or a select changed. Return a promise to show the component loading until it settles. */
  onInteraction?: (event: InteractionEvent, context: InteractionContext) => unknown;
  /** A modal was submitted. Return a promise to keep its Submit button loading. */
  onModalSubmit?: (event: ModalSubmitEvent, context: InteractionContext) => unknown;
  /** The preview is ready for commands (commands sent earlier are queued until then). */
  onReady?: (event: ReadyEvent) => void;
  /** Set the iframe's height from the preview's resize messages. Default true. */
  autoResize?: boolean;
  /**
   * How long the preview waits before showing "This interaction failed", in ms. 0, Infinity or "none" never
   * fail; other values are clamped to 100 ms to 24 hours.
   */
  timeouts?: {
    /** For an interaction nobody answers. Default 3000 (Discord's 3 seconds). */
    response?: number | 'none';
    /** Once deferred ("thinking…"). Default 900000 (Discord's 15 minutes). */
    deferred?: number | 'none';
  };
}

export interface PreviewConnection {
  appendMessage(message: PreviewMessage, interactionId?: string): void;
  updateMessage(messageId: string, message: Partial<PreviewMessage>, interactionId?: string): void;
  deleteMessage(messageId: string, interactionId?: string): void;
  openModal(interactionId: string, modal: PreviewModal, application?: PreviewApplication): void;
  /** Shows the interaction as loading ("thinking…") for up to 15 minutes. */
  setLoading(interactionId: string): void;
  /** Settles an interaction without changing anything. */
  ack(interactionId: string): void;
  /** Shows "This interaction failed", or `message`. */
  fail(interactionId: string, message?: string): void;
  /** Stops listening to the preview. */
  disconnect(): void;
}

export function connectPreview(iframe: HTMLIFrameElement, options?: ConnectPreviewOptions): PreviewConnection;
