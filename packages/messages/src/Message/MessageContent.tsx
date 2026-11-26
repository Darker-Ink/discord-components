import { memo, type ReactNode } from 'react';
import clsx from 'clsx';
import { Anchor } from '@discord-mana/components';
import { EyeIcon } from '@discord-mana/icons';
import { createEmbeds, isInlineMediaEmbed } from '../Embed/createEmbed';
import { EmbedType } from '../Embed/types';
import { ComponentStatusLine, errorStatus, loadingStatus } from '../MessageComponents/ComponentStatus';
import { useRenderMarkdown } from './markdown';
import { getMessageContentId, hasFlag } from './MessageHeader';
import { useMessageI18n } from './messageI18n';
import { MessageTimestamp } from './MessageTimestamp';
import { MessageFlags, MessageType, type APIMessage } from './types';
import markupStyles from '../markup/markup.module.css';
import ephemeralStyles from './EphemeralMessage.module.css';
import styles from './Message.module.css';

/** Interactions time out 15 minutes after the response was created. */
const INTERACTION_TIMEOUT = 15 * 60 * 1000;
const DISCORD_EPOCH = 1420070400000n;

export const getSnowflakeTimestamp = (id: string) => {
  try {
    return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
  } catch {
    return Date.now();
  }
};

export const isCommandMessage = (message: Pick<APIMessage, 'type'>) =>
  message.type === MessageType.ChatInputCommand || message.type === MessageType.ContextMenuCommand;

/** "<app> is thinking…" or "The application did not respond", from the message alone (the client's status). */
export const MessageInteractionStatus = ({ message, now }: { message: APIMessage; now?: number }) => {
  const i18n = useMessageI18n();
  // eslint-disable-next-line react-hooks/purity -- the client checks the timeout against the clock on render too
  const timedOut = getSnowflakeTimestamp(message.id) + INTERACTION_TIMEOUT < (now ?? Date.now());
  const loading = hasFlag(message.flags, MessageFlags.Loading);
  const hasInteraction = message.interaction != null || message.interaction_metadata != null;
  let status = null;
  if (loading && !timedOut) status = loadingStatus(i18n.APP_IS_THINKING(message.author.username));
  else if (hasInteraction && loading && timedOut) status = errorStatus(i18n.APP_DID_NOT_RESPOND);
  if (status == null) return null;
  return <ComponentStatusLine {...status} />;
};

MessageInteractionStatus.displayName = 'MessageInteractionStatus';

/** Whether the client replaces the content with its own (thinking/failed state). */
export const hasCustomContent = (message: APIMessage) =>
  (isCommandMessage(message) && message.content.length === 0) || hasFlag(message.flags, MessageFlags.Loading);

/** Messages that are only a link to an image or GIF show just the embed (the client's `hideSimpleEmbedContent`). */
export const isOnlyEmbedLink = (message: APIMessage) => {
  if ((message.embeds?.length ?? 0) !== 1) return false;
  const embeds = createEmbeds(message.embeds ?? [], message.channel_id, message.id);
  if (embeds.length !== 1) return false;
  const [embed] = embeds;
  const simple = (embed.type === EmbedType.Image || embed.type === EmbedType.GIFV) && isInlineMediaEmbed(embed);
  return simple && /^\s*<?https?:\/\/\S+>?\s*$/.test(message.content);
};

/** What the content div shows: the client's status line, nothing for a lone embed link, or the (markdown) text. */
export const useMessageRenderedContent = (message: APIMessage, now?: Date): ReactNode => {
  const renderMarkdown = useRenderMarkdown();
  if (hasCustomContent(message)) return <MessageInteractionStatus message={message} now={now?.getTime()} />;
  if (isOnlyEmbedLink(message)) return '';
  return renderMarkdown(message.content, { kind: 'content', messageId: message.id, channelId: message.channel_id });
};

export const EDITED_LOCATION = { WITH_CONTENT: 0, AFTER_ACCESSORIES: 1 } as const;

/** " (edited)" with the edit time in a tooltip; after the content, or after the accessories if there's none. */
export const MessageEditedTag = ({
  message,
  compact = false,
  location,
}: {
  message: APIMessage;
  compact?: boolean;
  location: (typeof EDITED_LOCATION)[keyof typeof EDITED_LOCATION];
}) => {
  const i18n = useMessageI18n();
  if (message.edited_timestamp == null) return null;
  const expected =
    compact || (message.content != null && message.content.length !== 0)
      ? EDITED_LOCATION.WITH_CONTENT
      : EDITED_LOCATION.AFTER_ACCESSORIES;
  if (location !== expected) return null;
  return (
    <>
      {' '}
      <MessageTimestamp timestamp={message.edited_timestamp} isEdited isInline={false}>
        <span className={styles.edited}>({i18n.EDITED})</span>
      </MessageTimestamp>
    </>
  );
};

MessageEditedTag.displayName = 'MessageEditedTag';

export interface MessageContentProps {
  message: APIMessage;
  content: ReactNode;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
}

/** The message text in the markup container, followed by the edited tag. */
export const MessageContent = memo(
  ({ className, message, children, content, compact = false }: MessageContentProps) => (
    <div
      id={getMessageContentId(message)}
      className={clsx(className, markupStyles.markup, {
        [styles.messageContent]: true,
        [styles.markupRtl]: /^[֑-߿יִ-﷽ﹰ-ﻼ]/.test(message.content ?? ''),
      })}
    >
      {children ?? content}
      <MessageEditedTag message={message} compact={compact} location={EDITED_LOCATION.WITH_CONTENT} />
    </div>
  ),
);

MessageContent.displayName = 'MessageContent';

/** "Only you can see this • Dismiss message" under an ephemeral message. */
export const EphemeralMessageFooter = ({ onDismiss }: { onDismiss?: () => void }) => {
  const i18n = useMessageI18n();
  return (
    <div className={ephemeralStyles.ephemeralMessage} onClick={(event) => event.stopPropagation()}>
      <EyeIcon size="xs" color="currentColor" className={ephemeralStyles.icon} />
      {i18n.ONLY_YOU_CAN_SEE_THIS} • <Anchor onClick={() => onDismiss?.()}>{i18n.DISMISS_MESSAGE}</Anchor>
    </div>
  );
};

EphemeralMessageFooter.displayName = 'EphemeralMessageFooter';
