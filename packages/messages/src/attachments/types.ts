// Attachment types as the REST API and gateway send them (discord-api-types naming).

export const AttachmentFlags = {
  IsClip: 1 << 0,
  IsThumbnail: 1 << 1,
  IsRemix: 1 << 2,
  IsSpoiler: 1 << 3,
  ContainsExplicitMedia: 1 << 4,
  IsAnimated: 1 << 5,
} as const;

export type AttachmentFlags = (typeof AttachmentFlags)[keyof typeof AttachmentFlags];

export interface APIAttachment {
  id: string;
  filename: string;
  /** Display title; the client shows it with the file's extension. */
  title?: string;
  /** Alt text. */
  description?: string;
  content_type?: string;
  original_content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null;
  width?: number | null;
  ephemeral?: boolean;
  duration_secs?: number;
  waveform?: string;
  flags?: number;
  /** ThumbHash shown while the image loads. */
  placeholder?: string;
  placeholder_version?: number;
  content_scan_version?: number;
}

/** The parts of a message the attachment renderers read. */
export interface APIMessageAttachmentContext {
  id?: string;
  channel_id?: string;
  content?: string;
  flags?: number;
  author?: { id: string; bot?: boolean };
}

export const hasFlag = (flags: number | null | undefined, flag: number) => ((flags ?? 0) & flag) === flag;
