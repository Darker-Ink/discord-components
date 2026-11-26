// Shapes the API returns, shared by the Worker and the SPA.

/** The look a creator can preset for a preview; URL params override it. */
export const THEMES = ['light', 'ash', 'dark', 'onyx'] as const;
export type PreviewTheme = (typeof THEMES)[number];

export interface PreviewOptions {
  /** Shows buttons and selects enabled (display only: interacting does nothing). */
  interactive: boolean;
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

export const DEMO_PREVIEW_ID = 'demo';
