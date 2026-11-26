import { Fragment, useContext, useMemo, useState, type ReactNode } from 'react';
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
import {
  getAncestors,
  isEmbedPartAllowed,
  useBuilderRestrictions,
  type EmbedPart,
  nodeToJSON,
  useBuilderNode,
  type EmbedNode,
} from '../core';
import { BuilderPlainTextField, BuilderTextField } from './BuilderTextField';
import { FrameChrome, useNodeFrame } from './NodeFrame';
import { NodeToolbarButton, NodeToolbarPopoutButton } from './NodeToolbar';
import { NodeTextInput, PopoutPanel, RemoveButton, SlotPopout } from './popouts';
import { prepareEmbed, useMediaSizes } from './mediaSize';
import { useAttachmentResolver } from './files';
import { AttachmentChooser } from './EditableAttachments';
import { useBuilderRender } from './renderContext';
import { useBuilderContext } from './useBuilderContext';
import { useBuilderUI, useBuilderUIStore } from './uiStore';
import ui from './EditableEmbed.module.css';

const NOTHING_REVEALED: ReadonlySet<string> = new Set();
const BLANK_REVEALED: ReadonlySet<string> = new Set(['title', 'description']);

const SUGGESTED_COLORS = [
  '#5865f2',
  '#57f287',
  '#fee75c',
  '#eb459e',
  '#ed4245',
  '#f0b232',
  '#00a8fc',
  '#9b59b6',
  '#1abc9c',
  '#ffffff',
];

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
      <AttachmentChooser uid={uid} field={`${field}.url`} accept="image" />
    </PopoutPanel>
  );
};

const LinksPopout = ({ uid }: { uid: string }) => {
  const allows = useEmbedParts();
  return (
    <PopoutPanel title="Links and icons">
      {allows('url') ? <NodeTextInput uid={uid} field="url" label="Title link" placeholder="https://…" /> : null}
      {allows('author') ? (
        <>
          <NodeTextInput uid={uid} field="author.url" label="Author link" placeholder="https://…" />
          <NodeTextInput uid={uid} field="author.icon_url" label="Author icon" placeholder="https://…" />
          <AttachmentChooser uid={uid} field="author.icon_url" accept="image" />
        </>
      ) : null}
      {allows('footer') ? (
        <>
          <NodeTextInput uid={uid} field="footer.icon_url" label="Footer icon" placeholder="https://…" />
          <AttachmentChooser uid={uid} field="footer.icon_url" accept="image" />
        </>
      ) : null}
    </PopoutPanel>
  );
};

/** Whether this builder lets embeds have a part (title, image, footer…). */
const useEmbedParts = () => {
  const restrictions = useBuilderRestrictions();
  return (part: EmbedPart) => isEmbedPartAllowed(restrictions, part);
};

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
        label="Date and time"
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
  const allows = useEmbedParts();
  const color = node?.color;
  return (
    <>
      {allows('color') ? (
        <NodeToolbarPopoutButton
          icon={EyeDropperIcon}
          label="Colour"
          renderPopout={() => <EmbedColorPopout uid={uid} />}
        >
          <span
            className={ui.swatch}
            style={{ background: color != null ? `#${color.toString(16).padStart(6, '0')}` : undefined }}
          />
        </NodeToolbarPopoutButton>
      ) : null}
      {allows('image') ? (
        <NodeToolbarPopoutButton
          icon={ImageIcon}
          label="Image"
          active={node?.image != null}
          renderPopout={() => <MediaPopout uid={uid} field="image" title="Image" />}
        />
      ) : null}
      {allows('thumbnail') ? (
        <NodeToolbarPopoutButton
          icon={ImagePlusIcon}
          label="Thumbnail"
          active={node?.thumbnail != null}
          renderPopout={() => <MediaPopout uid={uid} field="thumbnail" title="Thumbnail" />}
        />
      ) : null}
      {allows('url') || allows('author') || allows('footer') ? (
        <NodeToolbarPopoutButton
          icon={LinkIcon}
          label="Links and icons"
          renderPopout={() => <LinksPopout uid={uid} />}
        />
      ) : null}
      {allows('timestamp') ? (
        <NodeToolbarPopoutButton
          icon={ClockIcon}
          label="Timestamp"
          active={node?.timestamp != null}
          renderPopout={() => <TimestampPopout uid={uid} />}
        />
      ) : null}
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
  const resolve = useAttachmentResolver();
  const i18n = useEmbedI18n();
  const media = useMediaContext();
  const { locale } = useManaContext();
  const { disableAnimations } = useContext(MediaInteractionContext);
  const renderImageAccessory = useContext(GifFavoriteButtonContext);
  const { ref: frameRef, frameProps, selected, nodeIssues } = useNodeFrame({ uid, kind: 'embed', disabled: readOnly });
  const active = useIsActive(uid) && !readOnly;
  const allows = useEmbedParts();
  // Empty parts the user asked to add (from the "add" row) show while the embed is selected; a blank embed
  // opens with its title and description ready to type in.
  const blank =
    node != null &&
    !node.title &&
    !node.description &&
    node.fields.length === 0 &&
    node.author == null &&
    node.footer == null &&
    node.image == null &&
    node.thumbnail == null &&
    node.timestamp == null;
  const startRevealed = active && blank ? BLANK_REVEALED : NOTHING_REVEALED;
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(startRevealed);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    setRevealed(startRevealed);
  }
  const embed: MessageEmbed | null = useMemo(
    () => (node != null ? createEmbed(channelId, message?.id, prepareEmbed(nodeToJSON(node, 'embed'), resolve)) : null),
    // `sizes` changes when an image's size becomes known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node, sizes, resolve, channelId, message?.id],
  );
  const sourceMetadata = useMemo<EmbedSourceMetadata>(
    () => ({ message, identifier: { type: 'embed', embedIndex } }),
    [message, embedIndex],
  );
  if (node == null || embed == null) return null;

  // A part shows when it has content, when it was just added, or (title and description) on a blank embed.
  const shows = (slot: 'author' | 'title' | 'description' | 'footer', hasContent: boolean) =>
    hasContent || (active && revealed.has(slot));
  const reveal = (slot: string, field: string) => {
    setRevealed(new Set([...revealed, slot]));
    uiStore.set({ pendingFocus: { uid, field } });
  };

  const autoPlayGif = media.gifAutoPlay;
  const { maxMediaWidth, maxMediaHeight } = getMaxMediaSize(embed);
  const title = (text: string) => renderEmbedMarkdown(text, { embed, kind: 'title', channelId });
  const description = (text: string, isField: boolean) =>
    renderEmbedMarkdown(text, { embed, kind: isField ? 'field-value' : 'description', channelId });

  const author = shows('author', embed.author != null) ? (
    <div className={clsx(styles.embedAuthor, styles.embedMargin, { [ui.ghostRow]: embed.author == null })}>
      {embed.author?.iconProxyURL != null ? (
        <img
          alt=""
          className={styles.embedAuthorIcon}
          src={autoPlayGif && !disableAnimations ? embed.author.iconProxyURL : toStaticImage(embed.author.iconProxyURL)}
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
  const titleSection = shows('title', embed.rawTitle != null) ? (
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

  const descriptionSection = shows('description', embed.rawDescription != null) ? (
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

  // What's missing, in one row at the bottom: adding a part never moves what's already there.
  const addRow = active ? (
    <div className={clsx(styles.embedMargin, ui.addRow)} data-builder-ui data-builder-nodrag>
      {allows('author') && !shows('author', embed.author != null) ? (
        <Ghost icon={<PlusSmallIcon size="xs" color="currentColor" />} onClick={() => reveal('author', 'author.name')}>
          Author
        </Ghost>
      ) : null}
      {allows('title') && !shows('title', embed.rawTitle != null) ? (
        <Ghost icon={<PlusSmallIcon size="xs" color="currentColor" />} onClick={() => reveal('title', 'title')}>
          Title
        </Ghost>
      ) : null}
      {allows('description') && !shows('description', embed.rawDescription != null) ? (
        <Ghost
          icon={<PlusSmallIcon size="xs" color="currentColor" />}
          onClick={() => reveal('description', 'description')}
        >
          Description
        </Ghost>
      ) : null}
      {allows('fields') ? (
        <Ghost
          icon={<PlusSmallIcon size="xs" color="currentColor" />}
          onClick={() => {
            const field = actions.insert(uid, 'fields', -1, 'field');
            if (field != null) uiStore.set({ selectedId: field, pendingFocus: { uid: field } });
          }}
        >
          Field
        </Ghost>
      ) : null}
      {allows('image') && embed.image == null ? (
        <SlotPopout renderPopout={() => <MediaPopout uid={uid} field="image" title="Image" />}>
          {(props) => (
            <Ghost {...props} icon={<ImageIcon size="xs" color="currentColor" />}>
              {node.image?.url != null && node.image.url !== '' ? 'Image…' : 'Image'}
            </Ghost>
          )}
        </SlotPopout>
      ) : null}
      {allows('thumbnail') && embed.thumbnail == null ? (
        <SlotPopout renderPopout={() => <MediaPopout uid={uid} field="thumbnail" title="Thumbnail" />}>
          {(props) => (
            <Ghost {...props} icon={<ImagePlusIcon size="xs" color="currentColor" />}>
              Thumbnail
            </Ghost>
          )}
        </SlotPopout>
      ) : null}
      {allows('footer') && !shows('footer', embed.footer?.text != null) ? (
        <Ghost icon={<PlusSmallIcon size="xs" color="currentColor" />} onClick={() => reveal('footer', 'footer.text')}>
          Footer
        </Ghost>
      ) : null}
      {allows('timestamp') && embed.timestamp == null ? (
        <Ghost
          icon={<ClockIcon size="xs" color="currentColor" />}
          onClick={() => actions.update(uid, { timestamp: new Date().toISOString() })}
        >
          Timestamp
        </Ghost>
      ) : null}
    </div>
  ) : null;

  const image = (() => {
    if (embed.image == null) return null;
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
    if (embed.thumbnail == null) return null;
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
      ) : null;
    const hasText = shows('footer', embed.footer?.text != null);
    if (!hasText && formatted == null) return null;
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
          {hasText ? (
            <BuilderPlainTextField
              uid={uid}
              kind="embed"
              field="footer.text"
              placeholder="Footer"
              aria-label="Footer text"
              disabled={readOnly}
            />
          ) : null}
          {hasText && formatted != null ? <span className={styles.embedFooterSeparator}>•</span> : null}
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
      {!readOnly && allows('color') ? (
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
          {image}
          {thumbnail}
          {footer}
          {addRow}
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
