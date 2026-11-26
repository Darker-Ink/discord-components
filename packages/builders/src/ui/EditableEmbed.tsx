import { Fragment, useContext, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Button,
  CustomColorPicker,
  textVariantClassNames as textVariants,
  useManaContext,
} from '@discord-mana/components';
import {
  ClockIcon,
  EyeDropperIcon,
  ImageIcon,
  ImagePlusIcon,
  LinkIcon,
  PlusSmallIcon,
  ArrowsLeftRightIcon,
} from '@discord-mana/icons';
import {
  createEmbed,
  embedStyles as styles,
  formatCalendarTimestamp,
  getAttachmentSrc,
  getEmbedColor,
  getMaxMediaSize,
  GifFavoriteButtonContext,
  isAnimatedImage,
  fit,
  markupStyles,
  MediaInteractionContext,
  renderEmbedImage,
  renderEmbedLink,
  useEmbedI18n,
  useMediaContext,
  type EmbedMessage,
  type EmbedSourceMetadata,
  type MessageEmbed,
} from '@discord-mana/messages';
import { getAncestors, nodeToJSON, useBuilderNode, type EmbedNode } from '../core';
import { BuilderPlainTextField, BuilderTextField } from './BuilderTextField';
import { FrameChrome, useNodeFrame } from './NodeFrame';
import { NodeToolbarButton, NodeToolbarPopoutButton } from './NodeToolbar';
import { NodeTextInput, PopoutPanel, RemoveButton, SlotPopout } from './popouts';
import { prepareEmbed, useMediaSizes } from './mediaSize';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUI, useBuilderUIStore } from './uiStore';
import ui from './EditableEmbed.module.css';

const SUGGESTED_COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#f0b232', '#00a8fc', '#ffffff'];

// The client loads author and footer icons as still images unless GIFs autoplay.
const toStaticImage = (url: string) => {
  try {
    const result = new URL(url);
    result.searchParams.set('format', 'png');
    return result.toString();
  } catch {
    return url;
  }
};

/** Whether the node, or something inside it, is selected (its empty parts show while it is). */
export const useIsActive = (uid: string) => {
  const { store } = useBuilderContext();
  return useBuilderUI(
    (state) =>
      state.selectedId != null &&
      (state.selectedId === uid || getAncestors(store.getState().doc, state.selectedId).includes(uid)),
  );
};

export const EmbedColorPopout = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode(uid) as EmbedNode | null;
  return (
    <CustomColorPicker
      value={node?.color ?? 0x5865f2}
      eagerUpdate
      onChange={(color) => actions.update(uid, { color }, { coalesce: `${uid}:color` })}
      onClose={() => actions.checkpoint()}
      suggestedColors={SUGGESTED_COLORS}
      showEyeDropper
      footer={
        node?.color != null ? (
          <Button
            variant="secondary"
            size="sm"
            text="No colour"
            fullWidth
            onClick={() => actions.update(uid, { color: undefined })}
          />
        ) : null
      }
    />
  );
};

EmbedColorPopout.displayName = 'EmbedColorPopout';

const MediaPopout = ({ uid, field, title }: { uid: string; field: 'image' | 'thumbnail'; title: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode(uid) as EmbedNode | null;
  return (
    <PopoutPanel
      title={title}
      footer={
        node?.[field] != null ? (
          <RemoveButton label="Remove" onClick={() => actions.update(uid, { [field]: undefined })} />
        ) : null
      }
    >
      <NodeTextInput
        uid={uid}
        field={`${field}.url`}
        label="URL"
        placeholder="https://… or attachment://name.png"
        autoFocus
      />
    </PopoutPanel>
  );
};

const LinksPopout = ({ uid }: { uid: string }) => (
  <PopoutPanel title="Links and icons">
    <NodeTextInput uid={uid} field="url" label="Title link" placeholder="https://…" autoFocus />
    <NodeTextInput uid={uid} field="author.url" label="Author link" placeholder="https://…" />
    <NodeTextInput uid={uid} field="author.icon_url" label="Author icon" placeholder="https://…" />
    <NodeTextInput uid={uid} field="footer.icon_url" label="Footer icon" placeholder="https://…" />
  </PopoutPanel>
);

const toLocalInput = (iso: string | undefined) => {
  if (iso == null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const TimestampPopout = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode(uid) as EmbedNode | null;
  return (
    <PopoutPanel
      title="Timestamp"
      footer={
        <>
          {node?.timestamp != null ? (
            <RemoveButton label="Remove" onClick={() => actions.update(uid, { timestamp: undefined })} />
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            text="Now"
            onClick={() => actions.update(uid, { timestamp: new Date().toISOString() })}
          />
        </>
      }
    >
      <NodeTextInput
        uid={uid}
        field="timestamp"
        label="Shown in the footer, in each reader’s time zone"
        type="datetime-local"
        format={(value) => toLocalInput(typeof value === 'string' ? value : undefined)}
        parse={(text) => (text === '' ? undefined : new Date(text).toISOString())}
      />
    </PopoutPanel>
  );
};

/** An empty part of an embed, shown while it is selected: what you'd click to add it. */
const Ghost = ({
  children,
  className,
  icon,
  ...props
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  onClick?: () => void;
  'aria-expanded'?: boolean;
  ref?: (element: HTMLElement | null) => void;
}) => (
  <button type="button" data-builder-ui data-builder-nodrag className={clsx(ui.ghost, className)} {...props}>
    {icon}
    {children}
  </button>
);

/** The embed's toolbar: colour, images, links and the timestamp. */
const EmbedTools = ({ uid }: { uid: string }) => {
  const node = useBuilderNode(uid) as EmbedNode | null;
  const color = node?.color;
  return (
    <>
      <NodeToolbarPopoutButton icon={EyeDropperIcon} label="Colour" renderPopout={() => <EmbedColorPopout uid={uid} />}>
        <span
          className={ui.swatch}
          style={{ background: color != null ? `#${color.toString(16).padStart(6, '0')}` : undefined }}
        />
      </NodeToolbarPopoutButton>
      <NodeToolbarPopoutButton
        icon={ImageIcon}
        label="Image"
        active={node?.image != null}
        renderPopout={() => <MediaPopout uid={uid} field="image" title="Image" />}
      />
      <NodeToolbarPopoutButton
        icon={ImagePlusIcon}
        label="Thumbnail"
        active={node?.thumbnail != null}
        renderPopout={() => <MediaPopout uid={uid} field="thumbnail" title="Thumbnail" />}
      />
      <NodeToolbarPopoutButton icon={LinkIcon} label="Links and icons" renderPopout={() => <LinksPopout uid={uid} />} />
      <NodeToolbarPopoutButton
        icon={ClockIcon}
        label="Timestamp"
        active={node?.timestamp != null}
        renderPopout={() => <TimestampPopout uid={uid} />}
      />
    </>
  );
};

export interface EditableEmbedProps {
  uid: string;
  /** Its position among the message's embeds (the media viewer uses it). */
  embedIndex?: number;
  message?: EmbedMessage;
  className?: string;
}

/**
 * A rich embed, drawn with the client's embed markup and styles, whose every part is edited in place: text where
 * it renders, the colour bar opens a colour picker, and empty parts (author, title, fields, images, footer,
 * timestamp) appear as faint placeholders while the embed is selected. Unselected, it is identical to
 * `<MessageEmbeds>`' rendering of the same JSON.
 */
export const EditableEmbed = ({ uid, embedIndex = 0, message, className }: EditableEmbedProps) => {
  const node = useBuilderNode(uid) as EmbedNode | null;
  const { readOnly, renderEmbedMarkdown, channelId } = useBuilderRender();
  const { actions } = useBuilderContext();
  const uiStore = useBuilderUIStore();
  const sizes = useMediaSizes();
  const i18n = useEmbedI18n();
  const media = useMediaContext();
  const { locale } = useManaContext();
  const { disableAnimations } = useContext(MediaInteractionContext);
  const renderImageAccessory = useContext(GifFavoriteButtonContext);
  const { ref: frameRef, frameProps, selected, nodeIssues } = useNodeFrame({ uid, kind: 'embed', disabled: readOnly });
  const active = useIsActive(uid) && !readOnly;
  const embed: MessageEmbed | null = useMemo(
    () => (node != null ? createEmbed(channelId, message?.id, prepareEmbed(nodeToJSON(node, 'embed'))) : null),
    // `sizes` changes when an image's size becomes known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node, sizes, channelId, message?.id],
  );
  const sourceMetadata = useMemo<EmbedSourceMetadata>(
    () => ({ message, identifier: { type: 'embed', embedIndex } }),
    [message, embedIndex],
  );
  if (node == null || embed == null) return null;

  const autoPlayGif = media.gifAutoPlay;
  const { maxMediaWidth, maxMediaHeight } = getMaxMediaSize(embed);
  const title = (text: string) => renderEmbedMarkdown(text, { embed, kind: 'title', channelId });
  const description = (text: string, isField: boolean) =>
    renderEmbedMarkdown(text, { embed, kind: isField ? 'field-value' : 'description', channelId });

  const author =
    embed.author != null || active ? (
      <div className={clsx(styles.embedAuthor, styles.embedMargin, { [ui.ghostRow]: embed.author == null })}>
        {embed.author?.iconProxyURL != null ? (
          <img
            alt=""
            className={styles.embedAuthorIcon}
            src={
              autoPlayGif && !disableAnimations ? embed.author.iconProxyURL : toStaticImage(embed.author.iconProxyURL)
            }
          />
        ) : null}
        {embed.author?.url != null ? (
          renderEmbedLink({
            className: clsx(styles.embedAuthorNameLink, styles.embedLink, styles.embedAuthorName),
            href: embed.author.url,
            tabIndex: -1,
            children: (
              <BuilderPlainTextField
                uid={uid}
                kind="embed"
                field="author.name"
                placeholder="Author"
                aria-label="Author name"
                disabled={readOnly}
              />
            ),
            target: '_blank',
            rel: 'noreferrer noopener',
            messageId: message?.id,
            channelId: message?.channel_id,
          })
        ) : (
          <BuilderPlainTextField
            uid={uid}
            kind="embed"
            field="author.name"
            placeholder="Author"
            className={styles.embedAuthorName}
            aria-label="Author name"
            disabled={readOnly}
          />
        )}
      </div>
    ) : null;

  const titleText = (
    <BuilderTextField
      uid={uid}
      kind="embed"
      field="title"
      rules="EMBED_TITLE_RULES"
      placeholder="Title"
      renderPreview={title}
      aria-label="Embed title"
      isFirstField
      disabled={readOnly}
    />
  );
  const titleSection =
    embed.rawTitle != null || active ? (
      <div className={clsx(styles.embedTitle, styles.embedMargin)}>
        {embed.url != null && embed.rawTitle != null
          ? renderEmbedLink({
              className: clsx(styles.embedTitleLink, styles.embedLink, styles.embedTitle),
              href: embed.url,
              tabIndex: -1,
              children: titleText,
              target: '_blank',
              rel: 'noreferrer noopener',
              messageId: message?.id,
              channelId: message?.channel_id,
            })
          : titleText}
      </div>
    ) : null;

  const descriptionSection =
    embed.rawDescription != null || active ? (
      <div className={clsx(styles.embedDescription, textVariants['body-sm/normal'], styles.embedMargin)}>
        <BuilderTextField
          uid={uid}
          kind="embed"
          field="description"
          multiline
          placeholder="Description"
          renderPreview={(text) => description(text, false)}
          aria-label="Embed description"
          disabled={readOnly}
        />
      </div>
    ) : null;

  const fields = (() => {
    if (node.fields.length === 0) return null;
    // Up to three consecutive inline fields share a row; a non-inline field always gets its own.
    const rows: (typeof node.fields)[] = [];
    let row: typeof node.fields | null = null;
    for (const field of node.fields) {
      if (field.inline !== true && row != null) {
        rows.push(row);
        row = null;
      }
      row ??= [];
      row.push(field);
      if (row.length === 3 || field.inline !== true) {
        rows.push(row);
        row = null;
      }
    }
    if (row != null) rows.push(row);
    return (
      <div className={styles.embedFields}>
        {rows.map((fieldRow) => {
          const span = 12 / fieldRow.length;
          return fieldRow.map((field, index) => {
            const start = index * span;
            return (
              <EditableEmbedField
                key={field.uid}
                uid={field.uid}
                gridColumn={`${start + 1} / ${start + span + 1}`}
                renderName={title}
                renderValue={(text) => description(text, true)}
              />
            );
          });
        })}
      </div>
    );
  })();

  const addField = active ? (
    <Ghost
      className={clsx(styles.embedMargin, ui.ghostWide)}
      icon={<PlusSmallIcon size="xs" color="currentColor" />}
      onClick={() => {
        const field = actions.insert(uid, 'fields', -1, 'field');
        if (field != null) uiStore.set({ selectedId: field, pendingFocus: { uid: field } });
      }}
    >
      Add field
    </Ghost>
  ) : null;

  const image = (() => {
    if (embed.image == null) {
      if (!active) return null;
      return (
        <SlotPopout renderPopout={() => <MediaPopout uid={uid} field="image" title="Image" />}>
          {(props) => (
            <Ghost
              {...props}
              className={clsx(styles.embedMargin, ui.ghostImage)}
              icon={<ImageIcon size="sm" color="currentColor" />}
            >
              {node.image?.url != null && node.image.url !== '' ? 'Loading image…' : 'Add image'}
            </Ghost>
          )}
        </SlotPopout>
      );
    }
    const item = embed.image;
    const src = getAttachmentSrc(item);
    const animated = isAnimatedImage({ src, original: item.url, animated: false, srcIsAnimated: item.srcIsAnimated });
    const hasAlt = item.description != null && item.description !== '';
    return (
      <Fragment key={item.url}>
        {renderEmbedImage({
          containerClassName: clsx(styles.embedMedia, styles.embedImage),
          src,
          alt: hasAlt ? item.description : (embed.rawTitle ?? media.i18n.IMAGE),
          responsive: true,
          limitResponsiveWidth: true,
          width: item.width,
          height: item.height,
          maxWidth: maxMediaWidth,
          maxHeight: maxMediaHeight,
          original: item.url,
          shouldLink: true,
          disableAltTextDisplay: !hasAlt,
          hiddenSpoilers: false,
          placeholder: item.placeholder,
          placeholderVersion: item.placeholderVersion,
          srcIsAnimated: item.srcIsAnimated,
          mosaicStyleAlt: true,
          autoPlay: autoPlayGif && !disableAnimations,
          renderAccessory: animated ? renderImageAccessory : null,
          sourceMetadata,
          analyticsSource: 'Embed',
        })}
      </Fragment>
    );
  })();

  const thumbnail = (() => {
    if (embed.thumbnail == null) {
      if (!active) return null;
      return (
        <SlotPopout renderPopout={() => <MediaPopout uid={uid} field="thumbnail" title="Thumbnail" />} align="right">
          {(props) => (
            <Ghost
              {...props}
              className={clsx(styles.embedThumbnail, ui.ghostThumbnail)}
              icon={<ImagePlusIcon size="sm" color="currentColor" />}
            >
              Thumbnail
            </Ghost>
          )}
        </SlotPopout>
      );
    }
    const item = embed.thumbnail;
    const hasAlt = item.description != null && item.description !== '';
    return renderEmbedImage({
      containerClassName: styles.embedThumbnail,
      src: getAttachmentSrc(item),
      original: item.url,
      width: item.width,
      height: item.height,
      maxWidth: 80,
      maxHeight: 80,
      shouldLink: true,
      autoPlay: autoPlayGif && !disableAnimations,
      srcIsAnimated: item.srcIsAnimated,
      placeholder: item.placeholder,
      placeholderVersion: item.placeholderVersion,
      alt: hasAlt ? item.description : media.i18n.IMAGE,
      disableAltTextDisplay: !hasAlt,
      mosaicStyleAlt: true,
      sourceMetadata,
      analyticsSource: 'Embed',
    });
  })();

  const footer = (() => {
    const formatted = embed.timestamp != null ? formatCalendarTimestamp(embed.timestamp, i18n, locale) : null;
    const timestamp =
      formatted != null ? (
        <SlotPopout renderPopout={() => <TimestampPopout uid={uid} />} position="top">
          {(props) =>
            active ? (
              <button type="button" data-builder-ui data-builder-nodrag className={ui.inlineButton} {...props}>
                {formatted}
              </button>
            ) : (
              <>{formatted}</>
            )
          }
        </SlotPopout>
      ) : active ? (
        <SlotPopout renderPopout={() => <TimestampPopout uid={uid} />} position="top">
          {(props) => (
            <button
              type="button"
              data-builder-ui
              data-builder-nodrag
              className={clsx(ui.inlineButton, ui.ghostText)}
              {...props}
            >
              <ClockIcon size="xxs" color="currentColor" /> Timestamp
            </button>
          )}
        </SlotPopout>
      ) : null;
    const hasText = embed.footer?.text != null;
    if (!hasText && formatted == null && !active) return null;
    const iconUrl = embed.footer?.iconProxyURL;
    return (
      <div className={clsx(styles.embedFooter, styles.embedMargin)}>
        {iconUrl != null && iconUrl !== '' ? (
          <img
            alt=""
            className={styles.embedFooterIcon}
            src={autoPlayGif && !disableAnimations ? iconUrl : toStaticImage(iconUrl)}
          />
        ) : null}
        <span className={clsx(styles.embedFooterText, textVariants['body-xs/medium'])}>
          {hasText || active ? (
            <BuilderPlainTextField
              uid={uid}
              kind="embed"
              field="footer.text"
              placeholder="Footer"
              aria-label="Footer text"
              disabled={readOnly}
            />
          ) : null}
          {(hasText || active) && (formatted != null || active) ? (
            <span className={styles.embedFooterSeparator}>•</span>
          ) : null}
          {timestamp}
        </span>
      </div>
    );
  })();

  const getMaxWidth = () => {
    const item = embed.image;
    if (item == null) return undefined;
    const { width } = fit({
      width: item.width,
      height: item.height,
      maxWidth: maxMediaWidth,
      maxHeight: maxMediaHeight,
    });
    return width >= 300 ? width + 32 : undefined;
  };

  const color = embed.color == null || embed.color === 0xffffff ? undefined : getEmbedColor(embed.color);
  const hasThumbnail = thumbnail != null;
  return (
    <article
      ref={frameRef}
      {...frameProps}
      className={clsx(className, styles.embedFull, styles.embed, markupStyles.markup, {
        [styles.justifyAuto]: embed.image != null,
      })}
      style={{ borderLeftColor: color, maxWidth: getMaxWidth() }}
    >
      {!readOnly ? (
        <SlotPopout renderPopout={() => <EmbedColorPopout uid={uid} />} position="right" align="top">
          {(props) => (
            <button
              type="button"
              data-builder-ui
              data-builder-nodrag
              className={ui.colorBar}
              aria-label="Embed colour"
              {...props}
            />
          )}
        </SlotPopout>
      ) : null}
      <div className={styles.gridContainer}>
        <div className={clsx({ [styles.grid]: true, [styles.hasThumbnail]: hasThumbnail })}>
          {author}
          {titleSection}
          {descriptionSection}
          {fields}
          {addField}
          {image}
          {thumbnail}
          {footer}
        </div>
      </div>
      {!readOnly ? (
        <FrameChrome uid={uid} kind="embed" selected={selected} tools={<EmbedTools uid={uid} />} issues={nodeIssues} />
      ) : null}
    </article>
  );
};

EditableEmbed.displayName = 'EditableEmbed';

const FieldTools = ({ uid }: { uid: string }) => {
  const { actions } = useBuilderContext();
  const node = useBuilderNode(uid) as { inline?: boolean } | null;
  return (
    <NodeToolbarButton
      icon={ArrowsLeftRightIcon}
      label={node?.inline === true ? 'Inline (shares a row)' : 'Full width'}
      active={node?.inline === true}
      onClick={() => actions.update(uid, { inline: node?.inline === true ? undefined : true })}
    />
  );
};

/** One embed field: name and value edited in place, inline toggled from its toolbar. */
export const EditableEmbedField = ({
  uid,
  gridColumn,
  renderName,
  renderValue,
}: {
  uid: string;
  gridColumn: string;
  renderName: (text: string) => ReactNode;
  renderValue: (text: string) => ReactNode;
}) => {
  const { readOnly } = useBuilderRender();
  const {
    ref: frameRef,
    frameProps,
    selected,
    nodeIssues,
  } = useNodeFrame({ uid, kind: 'embedField', disabled: readOnly });
  return (
    <div
      ref={frameRef}
      {...frameProps}
      className={clsx(styles.embedField, textVariants['body-sm/normal'], ui.field)}
      style={{ gridColumn }}
    >
      <div className={clsx(styles.embedFieldName, textVariants['body-sm/semibold'])}>
        <BuilderTextField
          uid={uid}
          kind="embedField"
          field="name"
          rules="EMBED_TITLE_RULES"
          placeholder="Name"
          renderPreview={renderName}
          aria-label="Field name"
          isFirstField
          disabled={readOnly}
        />
      </div>
      <div className={clsx(styles.embedFieldValue, textVariants['body-sm/normal'])}>
        <BuilderTextField
          uid={uid}
          kind="embedField"
          field="value"
          multiline
          placeholder="Value"
          renderPreview={renderValue}
          aria-label="Field value"
          disabled={readOnly}
        />
      </div>
      {!readOnly ? (
        <FrameChrome
          uid={uid}
          kind="embedField"
          selected={selected}
          tools={<FieldTools uid={uid} />}
          issues={nodeIssues}
        />
      ) : null}
    </div>
  );
};

EditableEmbedField.displayName = 'EditableEmbedField';
