import {
  EmbedMediaFlags,
  EmbedType,
  type APIEmbed,
  type APIEmbedImage,
  type APIEmbedProvider,
  type APIEmbedVideo,
  type EmbedMedia,
  type MessageEmbed,
} from './types';

const SKETCHFAB_PROVIDER = /sketchfab/i;
const SKETCHFAB_URL = /^https:\/\/sketchfab\.com/i;
const LEGACY_VIDEO_PROVIDERS = /youtube|steam|imgur|vimeo|sketchfab|soundcloud|streamable|twitch|vid\.me|twitter/i;
// Before this date (2017-04-01) only well-known providers' videos were trusted to embed.
const LEGACY_VIDEO_CUTOFF = 1491003030523;
const DISCORD_EPOCH = 1420070400000;

/** Embed types whose fields are rendered. */
export const EMBED_TYPES_WITH_FIELDS: ReadonlySet<string> = new Set([
  EmbedType.AutoModerationMessage,
  EmbedType.AutoModerationNotification,
  EmbedType.Rich,
  EmbedType.SafetyPolicyNotice,
  EmbedType.SafetySystemNotification,
  EmbedType.AgeVerificationSystemNotification,
  EmbedType.VoiceChannel,
  EmbedType.PollResult,
]);

/** Embed types the client renders with dedicated components rather than as an embed. */
export const NON_EMBED_TYPES: ReadonlySet<string> = new Set([
  EmbedType.AutoModerationMessage,
  EmbedType.AutoModerationNotification,
  EmbedType.AgeVerificationSystemNotification,
  EmbedType.ApplicationNews,
  EmbedType.PostPreview,
  EmbedType.SafetyPolicyNotice,
  EmbedType.SafetySystemNotification,
  EmbedType.VoiceChannel,
  EmbedType.PollResult,
]);

/** Embed types whose description is never shown. */
export const MEDIA_EMBED_TYPES: ReadonlySet<string> = new Set([EmbedType.Image, EmbedType.Video, EmbedType.GIFV]);

const hasSize = <T extends { width?: number; height?: number }>(
  media: T,
): media is T & { width: number; height: number } => (media.width ?? 0) > 0 && (media.height ?? 0) > 0;

const snowflakeTimestamp = (id: string) => {
  try {
    return Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
  } catch {
    return NaN;
  }
};

const toEmbedMedia = (media: APIEmbedImage | APIEmbedVideo): EmbedMedia => ({
  url: media.url as string,
  proxyURL: media.proxy_url,
  width: media.width as number,
  height: media.height as number,
  placeholder: media.placeholder,
  placeholderVersion: media.placeholder_version,
  description: media.description,
  srcIsAnimated: ((media.flags ?? 0) & EmbedMediaFlags.IsAnimated) !== 0,
  flags: media.flags ?? 0,
  contentType: media.content_type ?? undefined,
});

const withSearchParams = (url: string, params: Record<string, string>) => {
  const result = new URL(url);
  for (const [key, value] of Object.entries(params)) result.searchParams.set(key, value);
  return result.toString();
};

const canEmbedVideo = (
  channelId: string | null | undefined,
  provider: APIEmbedProvider | undefined,
  video: APIEmbedVideo,
) => {
  if ((provider != null && SKETCHFAB_PROVIDER.test(provider.name ?? '')) || SKETCHFAB_URL.test(video.url ?? '')) {
    return false;
  }
  let allowed = video.proxy_url != null || /^https:/i.test(video.url ?? '');
  if (channelId != null && snowflakeTimestamp(channelId) < LEGACY_VIDEO_CUTOFF) {
    allowed = allowed && provider != null && LEGACY_VIDEO_PROVIDERS.test(provider.name ?? '');
  }
  return allowed;
};

let embedCount = 0;

/**
 * Converts an API embed into the client's embed record, exactly as the client does when a message
 * arrives (`channelId` is the message's channel and only matters for very old videos).
 */
export const createEmbed = (
  channelId: string | null | undefined,
  _messageId: string | null | undefined,
  embed: APIEmbed,
): MessageEmbed => {
  const record: MessageEmbed = {
    id: `embed_${++embedCount}`,
    url: embed.url,
    // Discord stores embeds sent without a type (as bots and webhooks usually send them) as rich embeds.
    type: embed.type ?? EmbedType.Rich,
    rawTitle: embed.title,
    rawDescription: embed.description,
    referenceId: embed.reference_id,
    flags: embed.flags,
    contentScanVersion: embed.content_scan_version,
    fields: [],
  };
  if (embed.footer != null) {
    record.footer = {
      text: embed.footer.text,
      iconURL: embed.footer.icon_url,
      iconProxyURL: embed.footer.proxy_icon_url,
    };
  }
  if (embed.author?.name != null) {
    record.author = {
      name: embed.author.name,
      url: embed.author.url,
      iconURL: embed.author.icon_url,
      iconProxyURL: embed.author.proxy_icon_url,
    };
  }
  if (embed.provider?.name != null) record.provider = { name: embed.provider.name, url: embed.provider.url };
  if (embed.timestamp != null) record.timestamp = new Date(embed.timestamp);
  if (embed.color != null) record.color = embed.color;
  if (embed.thumbnail != null && hasSize(embed.thumbnail)) {
    // Articles and images show their thumbnail as the main image.
    if (record.type === EmbedType.Article || record.type === EmbedType.Image) {
      record.image = toEmbedMedia(embed.thumbnail);
    } else {
      record.thumbnail = toEmbedMedia(embed.thumbnail);
    }
  }
  if (embed.image != null && hasSize(embed.image)) record.image = toEmbedMedia(embed.image);
  if (embed.video != null) {
    const { video } = embed;
    if (record.thumbnail == null && video.proxy_url != null && hasSize(video)) {
      record.thumbnail = {
        width: video.width,
        height: video.height,
        url: withSearchParams(video.proxy_url, { format: 'webp' }),
      };
    }
    if (record.thumbnail != null && hasSize(video) && canEmbedVideo(channelId, embed.provider, video)) {
      record.video = toEmbedMedia(video);
    }
  }
  if (embed.audio?.proxy_url != null) {
    record.audio = {
      url: embed.audio.url,
      proxyURL: embed.audio.proxy_url,
      contentType: embed.audio.content_type ?? undefined,
      description: embed.audio.description,
    };
  }
  record.fields =
    record.type != null && EMBED_TYPES_WITH_FIELDS.has(record.type)
      ? (embed.fields ?? []).map(({ name, value, inline }) => ({ rawName: name, rawValue: value, inline }))
      : [];
  return record;
};

/**
 * Embeds that share a url are merged into the first one, whose `images` then holds every image
 * (that's how several images posted together end up in one gallery embed).
 */
export const mergeEmbedsByUrl = (embeds: MessageEmbed[]) => {
  const byUrl = new Map<string, MessageEmbed>();
  const result: MessageEmbed[] = [];
  for (const embed of embeds) {
    if (embed.url == null) {
      result.push(embed);
      continue;
    }
    const first = byUrl.get(embed.url);
    if (first == null) {
      result.push(embed);
      byUrl.set(embed.url, embed);
      continue;
    }
    if (embed.image != null) {
      if (first.images == null) {
        first.images = [];
        if (first.image != null) first.images.push(first.image);
      }
      first.images.push(embed.image);
    }
  }
  return result;
};

/** Converts a message's API embeds the way the client does: normalise each, then merge by url. */
export const createEmbeds = (
  embeds: readonly APIEmbed[] | null | undefined,
  channelId?: string | null,
  messageId?: string | null,
) => (embeds == null ? [] : mergeEmbedsByUrl(embeds.map((embed) => createEmbed(channelId, messageId, embed))));

/** Image, gifv and untitled media embeds render as bare media, without the embed box. */
export const isInlineMediaEmbed = ({ image, video, type, author, rawTitle }: MessageEmbed) =>
  (image != null || video != null) &&
  (type === EmbedType.GIFV || (type !== EmbedType.Rich && author == null && rawTitle == null));

export type VideoProvider = 'YouTube' | 'TikTok' | (string & {});

export const getVideoProvider = (providerName: string | undefined, videoUrl: string | undefined) => {
  if (providerName === 'YouTube' || providerName === 'TikTok') return providerName;
  if (videoUrl != null) {
    try {
      const { hostname } = new URL(videoUrl);
      if (hostname === 'www.youtube.com') return 'YouTube';
      if (hostname === 'www.tiktok.com') return 'TikTok';
    } catch {
      // Not a url: fall back to the provider name.
    }
  }
  return providerName;
};

export const getMaxMediaSize = (embed: MessageEmbed, maxMediaWidth?: number, maxMediaHeight?: number) => {
  if (maxMediaWidth != null && maxMediaHeight != null) return { maxMediaWidth, maxMediaHeight };
  const isTall =
    embed.provider?.name === 'TikTok' ||
    (embed.video != null &&
      embed.video.height > embed.video.width &&
      getVideoProvider(embed.provider?.name, embed.video.url) === 'YouTube');
  return isTall ? { maxMediaWidth: 400, maxMediaHeight: 450 } : { maxMediaWidth: 400, maxMediaHeight: 300 };
};
