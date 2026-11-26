import { createContext, useCallback, useContext, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '@discord-components/components';
import { getEmbedColor } from '../Embed/Embed';
import { useRenderMarkdown } from '../Message/markdown';
import { useMessageI18n } from '../Message/messageI18n';
import { MediaGallery, UnfurledMediaPlaceholder } from '../MediaGallery/MediaGallery';
import { FileAttachment } from '../attachments/FileAttachment';
import { MediaMosaicHoverButtons } from '../MediaMosaic/MediaMosaicItem';
import { getUnfurledMediaMosaicType } from '../MediaGallery/MediaGallery';
import { ObscureReason } from '../media/constants';
import { useMediaContext } from '../media/MediaContext';
import { MediaImage } from '../media/MediaRenderers/MediaRenderers';
import { MediaLayoutType } from '../media/constants';
import { ObscuredContent, ObscuredContentTypes } from '../media/ObscuredContent/ObscuredContent';
import { AutoMeasuredNestedContainer, useIsWidthLimited, useMeasuredWidth } from './ComponentLayout';
import { ComponentError } from './ComponentStatus';
import { useComponentContext } from './ComponentState';
import { UnfurledMediaItemFlags } from '../MediaGallery/MediaGallery';
import {
  ComponentType,
  SeparatorSpacingSize,
  type ActionRowComponent,
  type ContainerComponent,
  type FileComponent,
  type MediaGalleryComponent,
  type MessageComponent,
  type SectionComponent,
  type SeparatorComponent,
  type TextDisplayComponent,
  type ThumbnailComponent,
} from './types';
import actionRowStyles from './ActionRow.module.css';
import containerStyles from './Container.module.css';
import fileStyles from './FileComponent.module.css';
import sectionStyles from './Section.module.css';
import separatorStyles from './Separator.module.css';
import textStyles from './TextDisplay.module.css';
import markdownStyles from './TextDisplayMarkdown.module.css';
import thumbnailStyles from './Thumbnail.module.css';
import unknownStyles from './UnknownComponent.module.css';
import markupStyles from '../markup/markup.module.css';

export type RenderComponents = (components: readonly MessageComponent[]) => ReactNode;

export const ActionRow = ({
  renderComponents,
  ...component
}: ActionRowComponent & { renderComponents: RenderComponents }) => {
  const context = useComponentContext();
  if (component.components.length === 0) return null;
  return (
    <div className={actionRowStyles.container}>
      <div className={actionRowStyles.children}>{renderComponents(component.components)}</div>
      {context?.message != null ? <ComponentError className={actionRowStyles.error} component={component} /> : null}
    </div>
  );
};

ActionRow.displayName = 'ActionRow';

// Text Displays inside containers render smaller (the client's TextDisplayStyleContext).
type TextSize = 'default' | 'reduced';
type TextColor = 'default' | 'muted';
type TextWeight = 'default' | 'reduced';

interface TextDisplayStyle {
  className?: string;
  size: TextSize;
  color: TextColor;
  weight: TextWeight;
}

const TEXT_CLASSES = {
  size: { default: undefined, reduced: textStyles.sizeReduced },
  color: { default: undefined, muted: textStyles.colorMuted },
  weight: { default: undefined, reduced: textStyles.weightReduced },
};

const TextDisplayStyleContext = createContext<TextDisplayStyle>({
  className: undefined,
  size: 'default',
  color: 'default',
  weight: 'default',
});

TextDisplayStyleContext.displayName = 'TextDisplayStyleContext';

export const TextDisplayStyleProvider = ({
  children,
  size,
  color,
  weight,
}: {
  children: ReactNode;
  size?: TextSize;
  color?: TextColor;
  weight?: TextWeight;
}) => {
  const parent = useContext(TextDisplayStyleContext);
  const value = useMemo(() => {
    const next: TextDisplayStyle = {
      className: undefined,
      size: size ?? parent.size,
      color: color ?? parent.color,
      weight: weight ?? parent.weight,
    };
    const classes = clsx(
      TEXT_CLASSES.size[next.size],
      TEXT_CLASSES.color[next.color],
      TEXT_CLASSES.weight[next.weight],
    );
    if (classes !== '') next.className = clsx(textStyles.root, classes);
    return next;
  }, [size, color, weight, parent]);
  return <TextDisplayStyleContext.Provider value={value}>{children}</TextDisplayStyleContext.Provider>;
};

TextDisplayStyleProvider.displayName = 'TextDisplayStyleProvider';

export const TextDisplay = ({ content, className }: TextDisplayComponent & { className?: string }) => {
  const context = useComponentContext();
  const renderMarkdown = useRenderMarkdown();
  const style = useContext(TextDisplayStyleContext);
  const message = context?.message as { id?: string; channel_id?: string } | undefined;
  return (
    <div className={clsx(className, markupStyles.markup, markdownStyles.markdownContainer, style.className)}>
      {context == null
        ? null
        : renderMarkdown(content, {
            kind: 'text-display',
            messageId: message?.id,
            channelId: message?.channel_id ?? context.channelId,
          })}
    </div>
  );
};

TextDisplay.displayName = 'TextDisplay';

export const Separator = ({ divider, spacing }: SeparatorComponent) => (
  <div
    className={clsx({
      [separatorStyles.spacingLarge]: spacing === SeparatorSpacingSize.Large,
      [separatorStyles.divider]: divider,
    })}
  />
);

Separator.displayName = 'Separator';

/** Components keep their own reveal state but reset it when the spoiler flag changes (like the client). */
const useSpoilerState = (spoiler: boolean | undefined) => {
  const [previous, setPrevious] = useState(spoiler);
  const [obscured, setObscured] = useState(spoiler);
  if (spoiler !== previous) {
    setPrevious(spoiler);
    setObscured(spoiler);
  }
  return [obscured ?? false, () => setObscured((value) => !value)] as const;
};

export const Thumbnail = ({ media, spoiler, description }: ThumbnailComponent) => {
  const type = getUnfurledMediaMosaicType(media);
  const animated = (media.flags & UnfurledMediaItemFlags.IsAnimated) === UnfurledMediaItemFlags.IsAnimated;
  const { gifAutoPlay } = useMediaContext();
  const [obscured, toggle] = useSpoilerState(spoiler);
  const render = (hidden: boolean) =>
    type !== 'IMAGE' ? (
      <UnfurledMediaPlaceholder
        className={thumbnailStyles.imgContainer}
        media={media}
        placeholderWidth={85}
        placeholderHeight={85}
        maxWidth={85}
        maxHeight={85}
        hiddenSpoilers={hidden}
      />
    ) : (
      <MediaImage
        containerClassName={clsx(thumbnailStyles.imgContainer, { [thumbnailStyles.hiddenSpoiler]: hidden })}
        imageClassName={thumbnailStyles.img}
        src={media.proxyUrl}
        alt={description ?? undefined}
        original={media.url}
        placeholder={media.placeholder}
        placeholderVersion={media.placeholderVersion}
        width={media.width ?? 0}
        height={media.height ?? 0}
        hiddenSpoilers={hidden}
        maxWidth={170}
        maxHeight={170}
        minWidth={85}
        minHeight={85}
        autoPlay={gifAutoPlay && !hidden}
        mediaLayoutType={MediaLayoutType.MOSAIC}
        reducedSizeAltTextButton
        srcIsAnimated={animated}
      />
    );
  return spoiler ? (
    <ObscuredContent
      type={ObscuredContentTypes.ATTACHMENT}
      reason={ObscureReason.SPOILER}
      obscured={obscured}
      onToggleObscurity={toggle}
    >
      {(hidden) => render(hidden)}
    </ObscuredContent>
  ) : (
    render(false)
  );
};

Thumbnail.displayName = 'Thumbnail';

export const ComponentMediaGallery = ({ items }: MediaGalleryComponent) => {
  const context = useComponentContext();
  if (context?.message == null) return null;
  return <MediaGallery items={items} message={context.message} />;
};

ComponentMediaGallery.displayName = 'ComponentMediaGallery';

export const File = ({ file, name, size, spoiler }: FileComponent) => {
  const i18n = useMessageI18n();
  const mimeType = useMemo(
    () =>
      file.contentType != null && file.contentType.includes('/') ? file.contentType.split('/') : ['unknown', 'unknown'],
    [file.contentType],
  );
  const [obscured, toggle] = useSpoilerState(spoiler);
  const renderAdjacentContent = useCallback(
    () => <MediaMosaicHoverButtons mimeType={mimeType} downloadURL={file.url} showDownload isVisualMediaType={false} />,
    [file.url, mimeType],
  );
  const render = (hidden: boolean) => (
    <FileAttachment
      className={clsx({ [fileStyles.fileHidden]: hidden })}
      url={file.url}
      fileName={name ?? i18n.UNKNOWN}
      fileSize={size ?? 0}
      renderAdjacentContent={renderAdjacentContent}
    />
  );
  return (
    <div className={fileStyles.fileDisplayContainer}>
      {spoiler ? (
        <ObscuredContent
          type={ObscuredContentTypes.ATTACHMENT}
          reason={ObscureReason.SPOILER}
          obscured={obscured}
          onToggleObscurity={toggle}
        >
          {(hidden) => render(hidden)}
        </ObscuredContent>
      ) : (
        render(false)
      )}
    </div>
  );
};

File.displayName = 'File';

export const Section = ({
  renderComponents,
  renderAccessory,
  ...component
}: SectionComponent & {
  renderComponents: RenderComponents;
  renderAccessory: (accessory: MessageComponent) => ReactNode;
}) => {
  const { components, accessory } = component;
  const context = useComponentContext();
  const [ref, outerWidth] = useMeasuredWidth();
  const restrictWidth = useIsWidthLimited(outerWidth);
  const centered = accessory.type === ComponentType.Button;
  return (
    <div className={sectionStyles.section} ref={ref}>
      <div className={sectionStyles.children}>
        <div className={clsx(sectionStyles.textChildren, { [sectionStyles.verticallyCenterAlign]: centered })}>
          {renderComponents(components)}
        </div>
        <div className={clsx(sectionStyles.accessory, { [sectionStyles.restrictWidth]: restrictWidth })}>
          {renderAccessory(accessory)}
        </div>
      </div>
      {context?.message != null ? <ComponentError component={component} /> : null}
    </div>
  );
};

Section.displayName = 'Section';

export const Container = ({
  renderComponents,
  ...component
}: ContainerComponent & { renderComponents: RenderComponents }) => {
  const { components, accentColor, spoiler } = component;
  const [obscured, toggle] = useSpoilerState(spoiler);
  const render = (hidden: boolean) => (
    <AutoMeasuredNestedContainer>
      {(ref) => (
        <div
          ref={ref}
          className={clsx(containerStyles.container, {
            [containerStyles.isHidden]: hidden,
            [containerStyles.withAccentColor]: accentColor != null,
          })}
          style={{ '--__accent-color': accentColor != null ? getEmbedColor(accentColor) : undefined } as CSSProperties}
        >
          <TextDisplayStyleProvider size="reduced">{renderComponents(components)}</TextDisplayStyleProvider>
        </div>
      )}
    </AutoMeasuredNestedContainer>
  );
  if (components.length === 0) return null;
  return spoiler ? (
    <ObscuredContent
      type={ObscuredContentTypes.ATTACHMENT}
      reason={ObscureReason.SPOILER}
      obscured={obscured}
      onToggleObscurity={toggle}
    >
      {(hidden) => render(hidden)}
    </ObscuredContent>
  ) : (
    render(false)
  );
};

Container.displayName = 'Container';

/** A component type this client version doesn't know. */
export const UnknownComponent = () => {
  const i18n = useMessageI18n();
  return (
    <div className={unknownStyles.container}>
      <Text variant="body-sm/medium" color="text-subtle">
        {i18n.UPDATE_TO_VIEW}
      </Text>
    </div>
  );
};

UnknownComponent.displayName = 'UnknownComponent';
