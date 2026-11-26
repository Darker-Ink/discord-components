// Shapes the API returns, shared by the Worker and the SPA.

/** The look a creator can preset for a preview; URL params override it. */
export const THEMES = ['light', 'ash', 'dark', 'onyx'] as const;
export type PreviewTheme = (typeof THEMES)[number];

export interface PreviewOptions {
  /** Shows buttons and selects enabled (display only: interacting does nothing). */
  interactive: boolean;
  /**
   * Lets the page that embeds the preview handle its interactions (events out, commands in, all through
   * postMessage). Only active when the embed URL also has `interactions=1`.
   */
  interactions: boolean;
  /** Parent origins allowed to send commands and receive events; `null` allows any. */
  allowedOrigins: string[] | null;
  /** Title in the page header and the document title. */
  title: string | null;
  /** Theme used when the URL has no `theme` param. */
  theme: PreviewTheme | null;
}

export interface Limits {
  maxBodyBytes: number;
  maxMessagesPerPreview: number;
  maxPreviewsPerKey: number;
  maxStorageBytesPerKey: number;
  defaultPreviewTtlSeconds: number;
  maxPreviewTtlSeconds: number;
  defaultSignedUrlTtlSeconds: number;
  maxSignedUrlTtlSeconds: number;
  keyCreationLimit: number;
  keyCreationWindowSeconds: number;
}

export interface CreatedKey {
  id: string;
  /** The full key. Returned once, at creation. */
  key: string;
  name: string | null;
  createdAt: string;
}

export interface PreviewSummary {
  id: string;
  secret: boolean;
  messageCount: number;
  size: number;
  options: PreviewOptions;
  createdAt: string;
  expiresAt: string;
  /** Public previews' URL; null for secret ones (sign one with `POST /api/previews/:id`). */
  url: string | null;
}

export interface PreviewContent {
  id: string;
  messages: unknown[];
  options: PreviewOptions;
  createdAt: string;
  expiresAt: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** The message a preview page posts to its parent window whenever its height changes. */
export interface ResizeMessage {
  type: 'discord-mana:resize';
  id: string;
  height: number;
}

/** Sent when the preview is ready for commands (and again in answer to `discord-mana:ping`). */
export interface ReadyEvent {
  type: 'discord-mana:ready';
  previewId: string;
}

/** A button click or select change, with `data` in the API's interaction data shape. */
export interface InteractionEvent {
  type: 'discord-mana:interaction';
  previewId: string;
  messageId: string;
  interactionId: string;
  data: { custom_id: string; component_type: number; values?: string[]; resolved?: unknown };
}

/** A submitted modal, with `data` in the API's modal submit shape. */
export interface ModalSubmitEvent {
  type: 'discord-mana:modal-submit';
  previewId: string;
  interactionId: string;
  /** The interaction the modal was opened in answer to, and the message it came from. */
  sourceInteractionId: string;
  messageId: string | null;
  data: { custom_id: string; components: unknown[]; resolved?: unknown; attachments?: unknown[] };
}

export const DEMO_PREVIEW_ID = 'demo';

/** Options stored before a field existed get its default. */
export const readOptions = (stored: string | Partial<PreviewOptions>): PreviewOptions => ({
  interactive: false,
  interactions: false,
  allowedOrigins: null,
  title: null,
  theme: null,
  ...(typeof stored === 'string' ? (JSON.parse(stored) as Partial<PreviewOptions>) : stored),
});
