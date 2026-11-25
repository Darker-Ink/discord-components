// Embed types as the REST API and gateway send them (discord-api-types naming).

export const EmbedType = {
  Image: 'image',
  Video: 'video',
  Link: 'link',
  Article: 'article',
  Tweet: 'tweet',
  Rich: 'rich',
  GIFV: 'gifv',
  ApplicationNews: 'application_news',
  AutoModerationMessage: 'auto_moderation_message',
  AutoModerationNotification: 'auto_moderation_notification',
  Text: 'text',
  PostPreview: 'post_preview',
  Gift: 'gift',
  SafetyPolicyNotice: 'safety_policy_notice',
  SafetySystemNotification: 'safety_system_notification',
  AgeVerificationSystemNotification: 'age_verification_system_notification',
  VoiceChannel: 'voice_channel',
  GamingProfile: 'gaming_profile',
  PollResult: 'poll_result',
  Components: 'components',
  Audio: 'audio',
} as const;

export type EmbedType = (typeof EmbedType)[keyof typeof EmbedType];

export const EmbedFlags = {
  IsContentInventoryEntry: 1 << 5,
} as const;

export const EmbedMediaFlags = {
  IsAnimated: 1 << 5,
} as const;

export interface APIEmbedFooter {
  text: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface APIEmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface APIEmbedProvider {
  name?: string;
  url?: string;
}

export interface APIEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface APIEmbedMediaBase {
  url: string;
  proxy_url?: string;
  width?: number;
  height?: number;
  /** ThumbHash of the media, shown while it loads. */
  placeholder?: string;
  placeholder_version?: number;
  /** Alt text. */
  description?: string;
  content_type?: string;
  flags?: number;
}

export type APIEmbedImage = APIEmbedMediaBase;
export type APIEmbedThumbnail = APIEmbedMediaBase;
export type APIEmbedVideo = Omit<APIEmbedMediaBase, 'url'> & { url?: string };

export interface APIEmbedAudio {
  url: string;
  proxy_url?: string;
  content_type?: string;
  description?: string;
}

export interface APIEmbed {
  title?: string;
  type?: EmbedType;
  description?: string;
  url?: string;
  /** ISO 8601 timestamp. */
  timestamp?: string;
  color?: number;
  footer?: APIEmbedFooter;
  image?: APIEmbedImage;
  thumbnail?: APIEmbedThumbnail;
  video?: APIEmbedVideo;
  audio?: APIEmbedAudio;
  provider?: APIEmbedProvider;
  author?: APIEmbedAuthor;
  fields?: APIEmbedField[];
  reference_id?: string;
  flags?: number;
  content_scan_version?: number;
}

// The client's embed record, built from an APIEmbed by `createEmbed`.

export interface EmbedMedia {
  url: string;
  proxyURL?: string;
  width: number;
  height: number;
  placeholder?: string;
  placeholderVersion?: number;
  description?: string;
  srcIsAnimated: boolean;
  flags: number;
  contentType?: string;
}

export interface EmbedThumbnailFromVideo {
  url: string;
  width: number;
  height: number;
  proxyURL?: undefined;
  placeholder?: undefined;
  placeholderVersion?: undefined;
  description?: undefined;
  srcIsAnimated?: undefined;
}

export interface EmbedAudio {
  url: string;
  proxyURL: string;
  contentType?: string;
  description?: string;
}

export interface EmbedFooter {
  text: string;
  iconURL?: string;
  iconProxyURL?: string;
}

export interface EmbedAuthor {
  name: string;
  url?: string;
  iconURL?: string;
  iconProxyURL?: string;
}

export interface EmbedProvider {
  name: string;
  url?: string;
}

export interface EmbedField {
  rawName: string;
  rawValue: string;
  inline?: boolean;
}

export interface MessageEmbed {
  id: string;
  url?: string;
  type?: EmbedType;
  rawTitle?: string;
  rawDescription?: string;
  referenceId?: string;
  flags?: number;
  contentScanVersion?: number;
  footer?: EmbedFooter;
  author?: EmbedAuthor;
  provider?: EmbedProvider;
  timestamp?: Date;
  color?: number;
  image?: EmbedMedia;
  /** Set when several embeds share a url: the client merges their images into one gallery embed. */
  images?: EmbedMedia[];
  thumbnail?: EmbedMedia | EmbedThumbnailFromVideo;
  video?: EmbedMedia;
  audio?: EmbedAudio;
  fields: EmbedField[];
}

/** The message an embed belongs to, as far as embeds need it. */
export interface EmbedMessage {
  id: string;
  channel_id: string;
}
