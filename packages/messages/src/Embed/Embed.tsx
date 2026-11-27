import {
  Fragment,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Clickable, useManaContext } from '@discord-mana/components';
import { XSmallIcon } from '@discord-mana/icons';
import { textVariantClassNames as textVariants } from '@discord-mana/components';
import { formatCalendarTimestamp } from '../formatTimestamp';
import { useEmbedI18n } from './embedI18n';
import { useMediaContext } from '../media/MediaContext';
import markupStyles from '../markup/markup.module.css';
import { ImageReadyState, MediaLayoutType, ObscureReason, SENSITIVE_OBSCURE_REASONS } from '../media/constants';
import { Image } from '../media/Image/Image';
import { MediaPlayer, MediaPlayerTypes } from '../media/MediaPlayer/MediaPlayer';
import { ObscuredContent, ObscuredContentTypes } from '../media/ObscuredContent/ObscuredContent';
import { MaskedLink } from '../MaskedLink';
import { PlaceholderBlob } from '../MessagePlaceholder/PlaceholderBlob';
import { MediaInteractionContext } from '../media/MediaInteractionContext';
import { getMaxMediaSize, getVideoProvider, isInlineMediaEmbed, MEDIA_EMBED_TYPES } from './createEmbed';
import { EmbedGIFV, EmbedVideo } from './EmbedVideo';
import { fit } from '../media/sizing';
import { getAttachmentSrc, isAnimatedImage } from '../media/mediaUrl';
import { GifFavoriteButtonContext } from '../MediaMosaic/MediaMosaicItem';
import { EmbedGallery } from './EmbedGallery';
import {
  AmazonMusicEmbed,
  AppleMusicEmbed,
  isAppleMusicEmbed,
  isSpotifyEmbed,
  PlayStationEmbed,
  SpotifyEmbed,
} from './MusicEmbeds';
import type {
  EmbedSourceMetadata,
  RenderImageComponent,
  RenderLinkComponent,
  RenderVideoComponent,
} from './renderProps';
import { EmbedType, type EmbedMedia, type EmbedMessage, type MessageEmbed } from './types';
import styles from './Embed.module.css';

const renderMaskedLink = (props: Record<string, unknown>) => <MaskedLink {...props} />;

const PLAYSTATION_PROVIDERS = ['PlayStation'];

const toStaticImage = (url: string) => {
  try {
    const result = new URL(url);
    result.searchParams.set('format', 'png');
    return result.toString();
  } catch {
    return url;
  }
};

/** The client's embed color: a saturation-aware hsla, or nothing for white (#ffffff) and hidden embeds. */
export const getEmbedColor = (color: number) => {
  let r = (color >> 16) & 255;
  let g = (color >> 8) & 255;
  let b = color & 255;
  r /= 255;
  g /= 255;
  b /= 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = Math.round(60 * hue);
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = +(delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))).toFixed(3);
  return `hsla(${hue}, calc(var(--saturation-factor, 1) * ${+(100 * saturation).toFixed(1)}%), ${+(100 * +lightness.toFixed(3)).toFixed(1)}%, 1)`;
};

// The user's font scale in percent, which the client applies as the root font size.
const getFontScale = () =>
  typeof document === 'undefined' ? 100 : (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16) * 100;

// Grapheme count, so emoji and combined characters count once.
const graphemeLength = (text: string) => {
  if (typeof Intl.Segmenter === 'undefined') return text.length;
  let count = 0;
  for (const _ of new Intl.Segmenter().segment(text)) count++;
  return count;
};

export type RenderEmbedTitle = (embed: MessageEmbed, title: string) => ReactNode;
export type RenderEmbedDescription = (embed: MessageEmbed, description: string, isField: boolean) => ReactNode;

export interface EmbedProps {
  embed: MessageEmbed;
  className?: string;
  message?: EmbedMessage;
  embedIndex?: number;
  /** Why the embed is hidden (spoiler, explicit content…), as computed by the app. */
  obscureReason?: ObscureReason;
  /** Age-gated content renders as gray placeholders. */
  shouldAgeVerify?: boolean;
  autoPlayGif?: boolean;
  /** The "show embeds and preview website links" setting turned off: no images, videos or thumbnails. */
  hideMedia?: boolean;
  allowFullScreen?: boolean;
  maxThumbnailWidth?: number;
  maxThumbnailHeight?: number;
  /** Shows the "remove all embeds" button. */
  onSuppressEmbed?: MouseEventHandler<HTMLElement>;
  renderTitle: RenderEmbedTitle;
  renderDescription: RenderEmbedDescription;
  renderImageComponent: RenderImageComponent;
  renderVideoComponent: RenderVideoComponent;
  renderLinkComponent: RenderLinkComponent;
  /** The GIF favorite star for a gallery image (needs the app's favorites). */
  renderGifFavoriteButton?: (image: EmbedMedia) => () => ReactNode;
  onImageHover?: () => void;
}

/** A message embed, as the client renders it: rich embeds, link previews, images, videos and gifs. */
export const Embed = (props: EmbedProps) => {
  const {
    embed,
    className,
    message,
    embedIndex = 0,
    obscureReason,
    shouldAgeVerify = false,
    autoPlayGif,
    hideMedia = false,
    allowFullScreen = true,
    maxThumbnailWidth = 80,
    maxThumbnailHeight = 80,
    onSuppressEmbed,
    renderTitle,
    renderDescription,
    renderImageComponent,
    renderVideoComponent,
    renderLinkComponent,
    renderGifFavoriteButton,
    onImageHover,
  } = props;
  const i18n = useEmbedI18n();
  const mediaI18n = useMediaContext().i18n;
  const { locale } = useManaContext();
  const { disableAnimations } = useContext(MediaInteractionContext);
  const renderImageAccessory = useContext(GifFavoriteButtonContext);
  const [isVisible, setIsVisible] = useState(obscureReason == null);
  const [videoControlsShown, setVideoControlsShown] = useState(false);
  const sourceMetadata = useMemo<EmbedSourceMetadata>(
    () => ({ message, identifier: { type: 'embed', embedIndex } }),
    // The client keeps the metadata it was mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [{ maxMediaWidth, maxMediaHeight }] = useState(() => getMaxMediaSize(embed));

  const shouldObscure = obscureReason != null && SENSITIVE_OBSCURE_REASONS.has(obscureReason);
  const shouldShowStaticPlaceholder = shouldObscure && shouldAgeVerify;

  const contentPlaceholder = (width: number, height: number) => (
    <PlaceholderBlob className={styles.contentPlaceholder} width={width} height={height} opacity={0.3} />
  );

  const renderProvider = (linkable = true) => {
    const { provider } = embed;
    if (provider == null) return null;
    const className = clsx(styles.embedProvider, textVariants['body-xs/normal'], styles.embedMargin);
    if (shouldShowStaticPlaceholder) return <div className={className}>{contentPlaceholder(80, 18)}</div>;
    return (
      <div className={className}>
        {provider.url != null ? (
          renderLinkComponent({
            className: styles.embedLink,
            href: provider.url,
            tabIndex: linkable ? 0 : -1,
            children: provider.name,
            target: '_blank',
            rel: 'noreferrer noopener',
            messageId: message?.id,
            channelId: message?.channel_id,
          })
        ) : (
          <span>{provider.name}</span>
        )}
      </div>
    );
  };

  const renderAuthor = (linkable = true) => {
    const { author } = embed;
    if (author == null) return null;
    if (shouldShowStaticPlaceholder) {
      return <div className={clsx(styles.embedAuthor, styles.embedMargin)}>{contentPlaceholder(150, 18)}</div>;
    }
    return (
      <div className={clsx(styles.embedAuthor, styles.embedMargin)}>
        {author.iconProxyURL != null ? (
          <img
            alt=""
            className={styles.embedAuthorIcon}
            src={autoPlayGif && !disableAnimations ? author.iconProxyURL : toStaticImage(author.iconProxyURL)}
          />
        ) : null}
        {author.url != null ? (
          renderLinkComponent({
            className: clsx(styles.embedAuthorNameLink, styles.embedLink, styles.embedAuthorName),
            href: author.url,
            tabIndex: linkable ? 0 : -1,
            children: author.name,
            target: '_blank',
            rel: 'noreferrer noopener',
            messageId: message?.id,
            channelId: message?.channel_id,
          })
        ) : (
          <span className={styles.embedAuthorName}>{author.name}</span>
        )}
      </div>
    );
  };

  const renderTitleSection = (linkable = true) => {
    const { rawTitle, url } = embed;
    if (rawTitle == null) return null;
    const className = clsx(styles.embedTitle, styles.embedMargin);
    if (shouldShowStaticPlaceholder) return <div className={className}>{contentPlaceholder(400, 30)}</div>;
    return (
      <div className={className}>
        {url != null
          ? renderLinkComponent({
              className: clsx(styles.embedTitleLink, styles.embedLink, styles.embedTitle),
              href: url,
              tabIndex: linkable ? 0 : -1,
              children: renderTitle(embed, rawTitle),
              target: '_blank',
              rel: 'noreferrer noopener',
              messageId: message?.id,
              channelId: message?.channel_id,
            })
          : renderTitle(embed, rawTitle)}
      </div>
    );
  };

  const renderDescriptionSection = () => {
    const { rawDescription } = embed;
    if (rawDescription == null) return null;
    return (
      <div className={clsx(styles.embedDescription, textVariants['body-sm/normal'], styles.embedMargin)}>
        {shouldShowStaticPlaceholder ? contentPlaceholder(400, 50) : renderDescription(embed, rawDescription, false)}
      </div>
    );
  };

  const renderThumbnail = (linkable = true) => {
    const { thumbnail } = embed;
    if (thumbnail == null) return null;
    const hasAlt = thumbnail.description != null && thumbnail.description !== '';
    return renderImageComponent({
      containerClassName: styles.embedThumbnail,
      src: getAttachmentSrc(thumbnail),
      original: thumbnail.url,
      width: thumbnail.width,
      height: thumbnail.height,
      maxWidth: maxThumbnailWidth,
      maxHeight: maxThumbnailHeight,
      shouldLink: linkable,
      autoPlay: autoPlayGif && !disableAnimations,
      srcIsAnimated: thumbnail.srcIsAnimated,
      placeholder: thumbnail.placeholder,
      placeholderVersion: thumbnail.placeholderVersion,
      alt: hasAlt ? thumbnail.description : mediaI18n.IMAGE,
      disableAltTextDisplay: !hasAlt,
      mosaicStyleAlt: true,
      sourceMetadata,
      analyticsSource: 'Embed',
    });
  };

  const renderFields = () => {
    const { fields } = embed;
    if (fields.length === 0) return null;
    // Up to three consecutive inline fields share a row; a non-inline field always gets its own.
    const rows: [ReactNode, ReactNode][][] = [];
    let row: [ReactNode, ReactNode][] | null = null;
    for (const { rawName, rawValue, inline } of fields) {
      if (!inline && row != null) {
        rows.push(row);
        row = null;
      }
      row ??= [];
      row.push([renderTitle(embed, rawName), renderDescription(embed, rawValue, true)]);
      if (row.length === 3 || !inline) {
        rows.push(row);
        row = null;
      }
    }
    if (row != null) rows.push(row);
    return (
      <div className={styles.embedFields}>
        {rows.map((fieldRow, rowIndex) => {
          const span = 12 / fieldRow.length;
          return fieldRow.map(([name, value], index) => {
            const start = index * span;
            return (
              <div
                key={`${rowIndex}-${index}`}
                className={clsx(styles.embedField, textVariants['body-sm/normal'])}
                style={{ gridColumn: `${start + 1} / ${start + span + 1}` }}
              >
                <div className={clsx(styles.embedFieldName, textVariants['body-sm/semibold'])}>{name}</div>
                <div className={clsx(styles.embedFieldValue, textVariants['body-sm/normal'])}>{value}</div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  const renderImagesSection = (hiddenSpoiler = false, visible = true) => {
    const { images } = embed;
    if (images == null || message == null) return null;
    return (
      <EmbedGallery
        images={images}
        message={message}
        autoPlayGif={autoPlayGif}
        hiddenSpoiler={hiddenSpoiler}
        isVisible={visible}
        sourceMetadata={sourceMetadata}
        renderImageComponent={renderImageComponent}
        defaultAlt={mediaI18n.IMAGE}
        renderGifFavoriteButton={renderGifFavoriteButton}
      />
    );
  };

  const renderImage = (
    image: EmbedMedia | undefined,
    hiddenSpoiler = false,
    visible = true,
    alt: string = mediaI18n.IMAGE,
  ) => {
    if (image == null) return null;
    const src = getAttachmentSrc(image);
    const animated = isAnimatedImage({ src, original: image.url, animated: false, srcIsAnimated: image.srcIsAnimated });
    const hasAlt = image.description != null && image.description !== '';
    return (
      <Fragment key={image.url}>
        {renderImageComponent({
          containerClassName: clsx(className, styles.embedMedia, styles.embedImage),
          src,
          alt: hasAlt ? image.description : alt,
          responsive: true,
          limitResponsiveWidth: true,
          width: image.width,
          height: image.height,
          maxWidth: maxMediaWidth,
          maxHeight: maxMediaHeight,
          original: image.url,
          shouldLink: visible,
          disableAltTextDisplay: !hasAlt,
          hiddenSpoilers: hiddenSpoiler,
          placeholder: image.placeholder,
          placeholderVersion: image.placeholderVersion,
          srcIsAnimated: image.srcIsAnimated,
          mosaicStyleAlt: true,
          autoPlay: autoPlayGif && !disableAnimations && !hiddenSpoiler,
          renderAccessory: animated ? renderImageAccessory : null,
          onMouseEnter: () => onImageHover?.(),
          sourceMetadata,
          analyticsSource: 'Embed',
        })}
      </Fragment>
    );
  };

  const renderVideo = (gifv: boolean, visible: boolean, hiddenSpoiler: boolean) => {
    const { url, thumbnail, video, provider } = embed;
    if (url == null || thumbnail == null) return null;
    if (gifv) {
      if (video == null) return null;
      return (
        <EmbedGIFV
          className={styles.embedMedia}
          href={url}
          thumbnail={thumbnail}
          video={video}
          maxWidth={maxMediaWidth}
          maxHeight={maxMediaHeight}
          responsive
          autoPlay={!hiddenSpoiler && !!autoPlayGif && !disableAnimations && visible}
          renderImageComponent={renderImageComponent}
          playable={visible}
          hiddenSpoilers={hiddenSpoiler}
          disableAltTextDisplay={obscureReason != null}
          placeholder={video.placeholder}
          placeholderVersion={video.placeholderVersion}
          sourceMetadata={sourceMetadata}
          renderAccessory={renderImageAccessory}
        />
      );
    }
    return (
      <EmbedVideo
        className={styles.embedMedia}
        href={url}
        allowFullScreen={allowFullScreen}
        thumbnail={thumbnail}
        video={video}
        provider={getVideoProvider(provider?.name, video?.url)}
        maxWidth={maxMediaWidth}
        maxHeight={maxMediaHeight}
        responsive
        renderImageComponent={renderImageComponent}
        renderVideoComponent={renderVideoComponent}
        renderLinkComponent={renderLinkComponent}
        onControlsShow={() => setVideoControlsShown(true)}
        onControlsHide={() => setVideoControlsShown(false)}
        playable={visible && !hiddenSpoiler}
        placeholder={video?.placeholder}
        placeholderVersion={video?.placeholderVersion}
        sourceMetadata={sourceMetadata}
      />
    );
  };

  const renderStaticPlaceholder = () => {
    const media = embed.image ?? embed.video;
    if (media == null) return null;
    const { width, height } = fit({
      width: media.width,
      height: media.height,
      maxWidth: maxMediaWidth,
      maxHeight: maxMediaHeight,
    });
    return (
      <Image
        className={className}
        readyState={ImageReadyState.READY}
        src=""
        width={width}
        height={height}
        maxWidth={maxMediaWidth}
        maxHeight={maxMediaHeight}
        mediaLayoutType={MediaLayoutType.STATIC}
        useFullWidth={false}
        zoomable={false}
      />
    );
  };

  const renderMedia = (hiddenSpoiler = false) => {
    if (shouldShowStaticPlaceholder) return renderStaticPlaceholder();
    switch (embed.type) {
      case EmbedType.GIFV:
        return renderVideo(true, isVisible, hiddenSpoiler);
      case EmbedType.Audio:
        if (embed.audio != null) {
          return (
            <MediaPlayer
              src={embed.audio.proxyURL}
              type={MediaPlayerTypes.AUDIO}
              mimeType={embed.audio.contentType != null ? [embed.audio.contentType] : undefined}
              autoPlay={false}
              playable={isVisible && !hiddenSpoiler}
              renderLinkComponent={renderMaskedLink}
            />
          );
        }
        return renderImage(embed.image, hiddenSpoiler, isVisible, embed.rawTitle);
      default:
        if (embed.video != null) return renderVideo(false, isVisible, hiddenSpoiler);
        if (embed.images != null) return renderImagesSection(hiddenSpoiler, isVisible);
        return renderImage(embed.image, hiddenSpoiler, isVisible, embed.rawTitle);
    }
  };

  const getMaxWidth = (inline: boolean) => {
    const { image, images, video, type, thumbnail } = embed;
    const media = image ?? video;
    if (media == null) return undefined;
    const { width } = fit({
      width: media.width,
      height: media.height,
      maxWidth: maxMediaWidth,
      maxHeight: maxMediaHeight,
    });
    if (!inline && (type === EmbedType.Video || width >= 300)) return width + 32;
    if (type === EmbedType.Rich && images !== undefined) return 520;
    if (type === EmbedType.GIFV) {
      return fit({
        width: video?.width ?? thumbnail?.width ?? 0,
        height: video?.height ?? thumbnail?.height ?? 0,
        maxWidth: maxMediaWidth,
        maxHeight: maxMediaHeight,
      }).width;
    }
    return undefined;
  };

  const usesJustifiedAutoStyle = () =>
    embed.type === EmbedType.Image ||
    embed.type === EmbedType.Video ||
    embed.type === EmbedType.GIFV ||
    ((embed.type === EmbedType.Rich || embed.type === EmbedType.Article) &&
      (embed.video != null || embed.image != null));

  const getSpoilerStyles = (inline: boolean): CSSProperties => {
    const { image, images, video, type, rawDescription } = embed;
    if (!usesJustifiedAutoStyle()) return { justifySelf: 'start', alignSelf: 'start' };
    let maxWidth = inline ? undefined : getMaxWidth(false);
    if (maxWidth === undefined && images === undefined && type !== EmbedType.Rich) {
      const media = image ?? video;
      if (media !== undefined) {
        const minSize = embed.video != null ? { minWidth: 150, minHeight: 144 } : {};
        maxWidth = fit({
          width: media.width,
          height: media.height,
          maxWidth: maxMediaWidth,
          maxHeight: maxMediaHeight,
          ...minSize,
        }).width;
      }
    }
    // Long descriptions make the embed as wide as it can be.
    const longDescriptionLength = 150 / (getFontScale() / 100);
    const descriptionLength = rawDescription != null ? graphemeLength(rawDescription) : 0;
    const manyLines = (rawDescription?.split('\n').length ?? 0) >= 5;
    return {
      maxWidth:
        maxWidth === undefined || descriptionLength >= longDescriptionLength || manyLines ? 'max-content' : maxWidth,
      justifySelf: 'auto',
    };
  };

  const renderInlineMediaEmbed = (hidden = false) => (
    <div
      aria-hidden={hidden}
      className={clsx(styles.inlineMediaEmbed, styles.embed, className, {
        [clsx(styles.spoilerAttachment, styles.hiddenAttachment)]: obscureReason === ObscureReason.SPOILER,
        [clsx(styles.hiddenExplicitAttachment, styles.hiddenAttachment)]: shouldObscure,
        [styles.isHidden]: hidden,
        [styles.justifyAuto]: usesJustifiedAutoStyle(),
      })}
      style={{ maxWidth: getMaxWidth(true) }}
    >
      {renderMedia(hidden)}
    </div>
  );

  const renderEmbedContent = (hidden = false) => {
    const provider = renderProvider(isVisible);
    const author = renderAuthor(isVisible);
    const title = renderTitleSection(isVisible);
    const description = embed.type != null && MEDIA_EMBED_TYPES.has(embed.type) ? null : renderDescriptionSection();
    const fields = renderFields();
    const media = hideMedia ? undefined : renderMedia(!isVisible);
    const footer = renderFooter();
    let showThumbnail = media == null;
    if (embed.type === EmbedType.Rich || embed.type === EmbedType.Audio) showThumbnail = embed.video == null;
    const thumbnail = !hideMedia && showThumbnail ? renderThumbnail(isVisible) : null;
    const color = embed.color == null || embed.color === 0xffffff || hidden ? undefined : getEmbedColor(embed.color);
    return (
      <article
        className={clsx(className, styles.embedFull, styles.embed, markupStyles.markup, {
          [styles.isHidden]: hidden,
          [clsx(styles.spoilerEmbed, styles.hiddenEmbed)]: obscureReason === ObscureReason.SPOILER,
          [clsx(styles.hiddenExplicitEmbed, styles.hiddenEmbed)]: shouldObscure,
          [styles.justifyAuto]: usesJustifiedAutoStyle(),
        })}
        aria-hidden={hidden}
        style={{ borderLeftColor: color, maxWidth: getMaxWidth(false) }}
      >
        <div className={styles.gridContainer}>
          <div className={clsx({ [styles.grid]: true, [styles.hasThumbnail]: thumbnail != null })}>
            {onSuppressEmbed != null ? (
              <Clickable
                focusProps={{ offset: { bottom: 4 } }}
                className={styles.embedSuppressButton}
                onClick={onSuppressEmbed}
                aria-label={i18n.REMOVE_ALL_EMBEDS}
              >
                <XSmallIcon size="xs" color="currentColor" />
              </Clickable>
            ) : null}
            {provider}
            {author}
            {title}
            {description}
            {fields}
            {media}
            {thumbnail}
            {footer}
          </div>
        </div>
      </article>
    );
  };

  const renderFooter = () => {
    const { footer, timestamp } = embed;
    const formatted = timestamp != null ? formatCalendarTimestamp(timestamp, i18n, locale) : null;
    if (footer != null) {
      return (
        <div className={clsx(styles.embedFooter, styles.embedMargin)}>
          {footer.iconProxyURL != null && footer.iconProxyURL !== '' ? (
            <img
              alt=""
              className={styles.embedFooterIcon}
              src={autoPlayGif && !disableAnimations ? footer.iconProxyURL : toStaticImage(footer.iconProxyURL)}
            />
          ) : null}
          <span className={clsx(styles.embedFooterText, textVariants['body-xs/medium'])}>
            {footer.text}
            {footer.text != null && formatted != null ? <span className={styles.embedFooterSeparator}>•</span> : null}
            {formatted}
          </span>
        </div>
      );
    }
    if (formatted != null) {
      return (
        <div className={clsx(styles.embedFooter, styles.embedMargin)}>
          <span className={clsx(styles.embedFooterText, textVariants['body-xs/medium'])}>{formatted}</span>
        </div>
      );
    }
    return undefined;
  };

  if (embed.provider != null && PLAYSTATION_PROVIDERS.includes(embed.provider.name)) {
    return <PlayStationEmbed embed={embed} className={className} />;
  }
  if (isSpotifyEmbed(embed)) return <SpotifyEmbed embed={embed} className={className} />;
  if (embed.provider?.name === 'Amazon Music' && embed.type === EmbedType.Rich) {
    return <AmazonMusicEmbed embed={embed} className={className} />;
  }
  if (isAppleMusicEmbed(embed)) return <AppleMusicEmbed embed={embed} className={className} />;

  const onReveal = () => setIsVisible(true);
  const onToggleObscurity = () => setIsVisible((visible) => !visible);

  if (!hideMedia && isInlineMediaEmbed(embed)) {
    if (obscureReason != null) {
      return (
        <ObscuredContent
          type={ObscuredContentTypes.ATTACHMENT}
          reason={obscureReason}
          onReveal={onReveal}
          onToggleObscurity={onToggleObscurity}
          isSingleMosaicItem
          containerStyles={getSpoilerStyles(true)}
          obscurityControlClassName={clsx({ [styles.obscureVideoSpacing]: isVisible && videoControlsShown })}
        >
          {renderInlineMediaEmbed}
        </ObscuredContent>
      );
    }
    return renderInlineMediaEmbed();
  }
  if (obscureReason != null) {
    return (
      <ObscuredContent
        type={ObscuredContentTypes.EMBED}
        onReveal={onReveal}
        onToggleObscurity={onToggleObscurity}
        reason={obscureReason}
        isSingleMosaicItem
        containerStyles={getSpoilerStyles(false)}
      >
        {renderEmbedContent}
      </ObscuredContent>
    );
  }
  return renderEmbedContent();
};

Embed.displayName = 'Embed';
