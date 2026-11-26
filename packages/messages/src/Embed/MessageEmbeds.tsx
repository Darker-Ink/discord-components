import { useMemo, type MouseEventHandler, type ReactNode } from 'react';
import { MaskedLink } from '../MaskedLink';
import type { ObscureReason } from '../media/constants';
import { useMediaContext } from '../media/MediaContext';
import { MediaPlayer, MediaPlayerTypes } from '../media/MediaPlayer/MediaPlayer';
import { MediaImage, MediaVideoWithAltText, type MediaImageProps } from '../media/MediaRenderers/MediaRenderers';
import { ObscuredContent } from '../media/ObscuredContent/ObscuredContent';
import { createEmbeds, NON_EMBED_TYPES } from './createEmbed';
import { Embed, type EmbedProps } from './Embed';
import type {
  EmbedAudioComponentProps,
  EmbedImageComponentProps,
  EmbedVideoComponentProps,
  LinkComponentProps,
  RenderImageComponent,
  RenderVideoComponent,
} from './renderProps';
import type { ObscuredEmbedProps } from './Embed';
import { EmbedType, type APIEmbed, type EmbedMessage, type MessageEmbed } from './types';

const DISCORD_URL = '^https?://(?:canary\\.|ptb\\.|www\\.)?discord(?:app)?\\.com';
const GUILD_SHOP_URL = new RegExp(`${DISCORD_URL}/channels/([0-9]+)/shop$`);
const GUILD_SHOP_PRODUCT_URL = new RegExp(`${DISCORD_URL}/channels/([0-9]+)/shop/([0-9]+)$`);
const SHOP_URL = /^https:\/\/(?:(?:canary\.|ptb\.)?discord(?:app)?.com|staging\.discord\.co)\/shop/;
const GAME_SHOP_CHANNEL_URL = new RegExp(`${DISCORD_URL}/channels/([0-9]+)/game-shop/([0-9]+)/([0-9]+)`);
const GAME_SHOP_URL = new RegExp(`${DISCORD_URL}/game-shop/([0-9]+)/([0-9]+)`);
const GAME_SHOP_SKUS_URL = new RegExp(`${DISCORD_URL}/game-shop/[0-9]+/?\\?(?=.*skuIds=)`);
const GAME_SHOP_TAB_URL = new RegExp(
  `${DISCORD_URL}/shop\\?(?=.*tab=game-shops)(?=.*applicationId=[0-9]+)(?=.*skuId=[0-9]+)`,
);
const GAME_URL = new RegExp(`${DISCORD_URL}/games/[0-9]+(?:/[A-Za-z0-9-]*)?/?$`);

// Links to Discord's own shops and game pages render as dedicated cards instead of embeds.
const isDiscordCardEmbed = ({ type, url }: MessageEmbed) =>
  type === EmbedType.Article &&
  url != null &&
  [
    GUILD_SHOP_URL,
    GUILD_SHOP_PRODUCT_URL,
    SHOP_URL,
    GAME_SHOP_CHANNEL_URL,
    GAME_SHOP_URL,
    GAME_SHOP_SKUS_URL,
    GAME_SHOP_TAB_URL,
    GAME_URL,
  ].some((pattern) => pattern.test(url));

/** Embeds the client draws as an embed (others are app cards, gifts or Components v2 embeds). */
export const isRenderableEmbed = (embed: MessageEmbed) =>
  !(embed.type != null && NON_EMBED_TYPES.has(embed.type)) &&
  !isDiscordCardEmbed(embed) &&
  embed.type !== EmbedType.Gift &&
  embed.type !== EmbedType.Components;

export interface EmbedMarkdownContext {
  embed: MessageEmbed;
  /** `title` covers embed titles and field names (the client parses both the same way). */
  kind: 'title' | 'description' | 'field-value';
}

export type RenderEmbedMarkdown = (text: string, context: EmbedMarkdownContext) => ReactNode;

export interface MessageEmbedsProps extends Partial<
  Pick<
    EmbedProps,
    'renderAudioComponent' | 'renderGifFavoriteButton' | 'renderObscured' | 'shouldAgeVerify' | 'allowFullScreen'
  >
> {
  /** The message's embeds, as the API sends them. */
  embeds: readonly APIEmbed[];
  /** The message they belong to (used for very old video embeds and by the media viewer). */
  message?: EmbedMessage;
  /** Markdown renderer for rich embeds' titles, descriptions and fields; without one the raw text shows. */
  renderMarkdown?: RenderEmbedMarkdown;
  /** Defaults to the media context's "automatically play GIFs" setting. */
  autoPlayGif?: boolean;
  /** Defaults to the media context's "show embeds and preview website links" setting. */
  inlineEmbedMedia?: boolean;
  /** The message content spoilers a link, so its embeds are spoilered too. */
  hasSpoilerEmbeds?: boolean;
  /** Overrides the obscure reason per embed (the client derives it from content scanning). */
  getObscureReason?: (embed: MessageEmbed, index: number) => ObscureReason | null | undefined;
  /** Shows the "remove all embeds" button and handles it. */
  onSuppressEmbeds?: MouseEventHandler<HTMLElement>;
  renderLinkComponent?: (props: LinkComponentProps) => ReactNode;
  renderImageComponent?: RenderImageComponent;
  renderVideoComponent?: RenderVideoComponent;
}

// The message accessories' renderers: masked links, the zoomable lazy image and the media player.
export const renderEmbedLink = (props: LinkComponentProps) => <MaskedLink {...props} />;

export const renderEmbedImage = (props: EmbedImageComponentProps) => (
  <MediaImage {...(props as unknown as MediaImageProps)} />
);

export const renderEmbedVideo = (props: EmbedVideoComponentProps) => (
  <MediaVideoWithAltText
    {...(props as unknown as Parameters<typeof MediaVideoWithAltText>[0])}
    renderLinkComponent={renderEmbedLink as never}
    showPlaybackSpeedControl
  />
);

export const renderEmbedAudio = ({ src, mimeType, autoPlay, playable }: EmbedAudioComponentProps) => (
  <MediaPlayer
    src={src}
    type={MediaPlayerTypes.AUDIO}
    mimeType={mimeType}
    autoPlay={autoPlay}
    playable={playable}
    renderLinkComponent={renderEmbedLink as never}
  />
);

export const renderEmbedObscured = ({ type, reason, children, ...props }: ObscuredEmbedProps) => (
  <ObscuredContent type={type} reason={reason} {...props}>
    {children}
  </ObscuredContent>
);

/** A message's embeds, converted, merged and filtered exactly like the client's message accessories. */
export const MessageEmbeds = ({
  embeds: apiEmbeds,
  message,
  renderMarkdown,
  autoPlayGif,
  inlineEmbedMedia,
  hasSpoilerEmbeds = false,
  getObscureReason,
  onSuppressEmbeds,
  renderLinkComponent = renderEmbedLink,
  renderImageComponent = renderEmbedImage,
  renderVideoComponent = renderEmbedVideo,
  renderAudioComponent = renderEmbedAudio,
  renderObscured = renderEmbedObscured,
  ...rest
}: MessageEmbedsProps) => {
  const media = useMediaContext();
  const embeds = useMemo(
    () => createEmbeds(apiEmbeds, message?.channel_id, message?.id),
    [apiEmbeds, message?.channel_id, message?.id],
  );
  // Only rich embeds go through markdown; other embeds show their text as is.
  const renderTitle = (embed: MessageEmbed, title: string) =>
    embed.type === EmbedType.Rich && renderMarkdown != null ? renderMarkdown(title, { embed, kind: 'title' }) : title;
  const renderDescription = (embed: MessageEmbed, description: string, isField: boolean) =>
    embed.type === EmbedType.Rich && renderMarkdown != null
      ? renderMarkdown(description, { embed, kind: isField ? 'field-value' : 'description' })
      : description;

  return embeds.map((embed, index) => {
    if (!isRenderableEmbed(embed)) return null;
    const obscureReason = getObscureReason?.(embed, index) ?? (hasSpoilerEmbeds ? 'spoiler' : undefined);
    return (
      <Embed
        key={embed.id}
        embed={embed}
        obscureReason={obscureReason ?? undefined}
        autoPlayGif={autoPlayGif ?? media.gifAutoPlay}
        hideMedia={!(inlineEmbedMedia ?? media.inlineEmbedMedia)}
        onSuppressEmbed={onSuppressEmbeds}
        renderTitle={renderTitle}
        renderDescription={renderDescription}
        message={message}
        embedIndex={index}
        renderLinkComponent={renderLinkComponent}
        renderImageComponent={renderImageComponent}
        renderVideoComponent={renderVideoComponent}
        renderAudioComponent={renderAudioComponent}
        renderObscured={renderObscured}
        {...rest}
      />
    );
  });
};

MessageEmbeds.displayName = 'MessageEmbeds';
