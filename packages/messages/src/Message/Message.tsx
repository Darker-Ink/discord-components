import { useEffect, useMemo, type MouseEventHandler, type ReactNode } from 'react';
import clsx from 'clsx';
import { FocusRing } from '@discord-components/components';
import { MessageAttachments } from '../attachments/MessageAttachments';
import { MessageEmbeds, type RenderEmbedMarkdown } from '../Embed/MessageEmbeds';
import type { APIEmbed } from '../Embed/types';
import type { OnMessageComponentInteraction } from '../MessageComponents/ComponentState';
import { MessageComponents } from '../MessageComponents/MessageComponents';
import {
  DEFAULT_MESSAGE_ACTIONS,
  MessageActionsContext,
  useMessageActions,
  type MessageActions,
} from '../MessageComponents/MessageActions';
import {
  createResolver,
  MessageResolversContext,
  useMessageResolvers,
  type MessageResolvers,
} from '../MessageComponents/resolvers';
import { MessageMarkdownRendererContext, type RenderMessageMarkdown } from './markdown';
import {
  EDITED_LOCATION,
  EphemeralMessageFooter,
  MessageContent,
  MessageEditedTag,
  useMessageRenderedContent,
} from './MessageContent';
import {
  getMessageAccessoriesId,
  getMessageAuthor,
  getMessageContentId,
  getMessageReactionsId,
  getMessageReplyContextId,
  getMessageTimestampId,
  getMessageUsernameId,
  hasFlag,
  isSystemMessage,
  MessageHeader,
} from './MessageHeader';
import { useMessageI18n } from './messageI18n';
import { ExecutedCommand, RepliedMessage } from './RepliedMessage';
import { ForwardedMessage, isForwardedMessage } from './ForwardedMessage';
import { Reactions, type ReactionsProps } from './Reactions';
import { MessageFlags, MessageType, type APIMessage } from './types';
import accessoriesStyles from './MessageAccessories.module.css';
import listItemStyles from './MessageListItem.module.css';
import styles from './Message.module.css';

// Screen-reader separators the client puts in the document once and references from every message's labels.
const ARIA_LABELS = { comma: 'uid_message_comma', commaTimestamp: 'uid_message_comma_timestamp' } as const;
const REACTIONS_LABEL_ID = 'uid_message_reactions';

const useAriaLabels = (reactionsLabel: string) => {
  useEffect(() => {
    for (const [id, text] of [
      [ARIA_LABELS.comma, ','],
      [ARIA_LABELS.commaTimestamp, ','],
      [REACTIONS_LABEL_ID, reactionsLabel],
    ]) {
      if (document.getElementById(id) != null) continue;
      const element = document.createElement('div');
      element.setAttribute('id', id);
      element.innerText = text;
      element.style.display = 'none';
      document.body.appendChild(element);
    }
  }, [reactionsLabel]);
};

/** The ids a message's article is labelled by: author (or reply context), content, accessories and time. */
export const getMessageLabelledBy = (message: APIMessage) => {
  const isReply = message.type === MessageType.Reply && message.message_reference != null;
  const embeds = message.embeds ?? [];
  const hasAccessories =
    embeds.length > 0 ||
    (message.attachments?.length ?? 0) > 0 ||
    (message.sticker_items?.length ?? 0) > 0 ||
    hasFlag(message.flags, MessageFlags.HasThread) ||
    (message.components?.length ?? 0) > 0 ||
    message.poll != null ||
    message.type === MessageType.ThreadCreated;
  const onlyGif = embeds.length > 0 && message.content === embeds[0].url && embeds[0].type === 'gifv';
  const hasContent = message.type !== MessageType.Default || (!onlyGif && message.content !== '');
  const system = isSystemMessage(message);
  let label = system
    ? ''
    : `${isReply ? getMessageReplyContextId(message) : getMessageUsernameId(message)} ${ARIA_LABELS.comma}`;
  if (hasContent) label += ` ${getMessageContentId(message)}`;
  if (hasAccessories) label += ` ${getMessageAccessoriesId(message)}`;
  if (!system) label += ` ${ARIA_LABELS.commaTimestamp} ${getMessageTimestampId(message)}`;
  return label.trim();
};

export const getMessageDescribedBy = (message: APIMessage) =>
  (message.reactions?.length ?? 0) === 0 ? undefined : `${REACTIONS_LABEL_ID} ${getMessageReactionsId(message)}`;

export interface MessageProps {
  /** The message, as the REST API or gateway sends it. */
  message: APIMessage;
  /** Markdown renderer for the content and Text Displays; without one the raw text shows. */
  renderMarkdown?: RenderMessageMarkdown;
  /** Markdown renderer for rich embeds' titles, descriptions and field values. */
  renderEmbedMarkdown?: RenderEmbedMarkdown;
  /** Called when a button is clicked or a select changes; see `OnMessageComponentInteraction`. */
  onInteraction?: OnMessageComponentInteraction<APIMessage>;
  /** Users, roles, channels, emoji and avatar URLs the client would read from its stores. */
  resolvers?: MessageResolvers;
  /** Link buttons, premium buttons and "Dismiss message". */
  actions?: Partial<MessageActions>;
  /** Shows the remove-embeds button (the author's own message, or with Manage Messages). */
  onSuppressEmbeds?: MouseEventHandler<HTMLElement>;
  /** Clicking a reaction (the client adds or removes the viewer's reaction). */
  onReactionClick?: ReactionsProps['onReactionClick'];
  /** Clicking the reply bar (the client jumps to the replied message). */
  onClickReply?: MouseEventHandler<HTMLElement>;
  /** The viewer's id: highlights the message when it mentions them. */
  currentUserId?: string;
  /** Starts a group (avatar and header); set false for follow-up messages from the same author. */
  isGroupStart?: boolean;
  /** Disables buttons and selects, as in message previews. */
  shouldDisableInteractiveComponents?: boolean;
  /** "Now" for the timestamps' "Today" and the interaction timeout (defaults to the current time). */
  now?: Date;
  className?: string;
  /** Replaces the content (e.g. an inline editor). */
  children?: ReactNode;
}

const isMentioned = (message: APIMessage, currentUserId: string | undefined) =>
  currentUserId != null &&
  (message.mention_everyone === true || (message.mentions ?? []).some((user) => user.id === currentUserId));

type AccessoriesProps = Pick<
  MessageProps,
  | 'message'
  | 'renderEmbedMarkdown'
  | 'onInteraction'
  | 'onSuppressEmbeds'
  | 'shouldDisableInteractiveComponents'
  | 'onReactionClick'
> & { isMessageSnapshot?: boolean };

const MessageAccessories = (props: AccessoriesProps) => {
  const {
    message,
    renderEmbedMarkdown,
    onInteraction,
    onSuppressEmbeds,
    shouldDisableInteractiveComponents,
    onReactionClick,
  } = props;
  const actions = useMessageActions();
  const isComponentsV2 = hasFlag(message.flags, MessageFlags.IsComponentsV2);
  const attachments = message.attachments ?? [];
  const embeds: APIEmbed[] = message.embeds ?? [];
  const components = message.components ?? [];
  // The API drops embeds of messages with SUPPRESS_EMBEDS; system messages never show theirs.
  const renderEmbeds = !isSystemMessage(message) && !hasFlag(message.flags, MessageFlags.SuppressEmbeds);
  const isEphemeral = hasFlag(message.flags, MessageFlags.Ephemeral);
  return (
    <div id={getMessageAccessoriesId(message)} className={accessoriesStyles.container}>
      {isForwardedMessage(message) ? (
        <ForwardedMessage
          message={message}
          renderAccessories={(snapshot) => <MessageAccessories {...props} message={snapshot} isMessageSnapshot />}
        />
      ) : null}
      {attachments.length > 0 && message.poll == null && !isComponentsV2 ? (
        <MessageAttachments attachments={attachments} message={message} />
      ) : null}
      {embeds.length > 0 && renderEmbeds ? (
        <MessageEmbeds
          embeds={embeds}
          message={message}
          renderMarkdown={renderEmbedMarkdown}
          onSuppressEmbeds={isEphemeral ? undefined : onSuppressEmbeds}
        />
      ) : null}
      {components.length > 0 ? (
        <MessageComponents
          components={components}
          message={message}
          onInteraction={onInteraction}
          shouldDisableInteractiveComponents={shouldDisableInteractiveComponents}
        />
      ) : null}
      <MessageEditedTag message={message} location={EDITED_LOCATION.AFTER_ACCESSORIES} />
      {(message.reactions?.length ?? 0) > 0 ? <Reactions message={message} onReactionClick={onReactionClick} /> : null}
      {isEphemeral ? <EphemeralMessageFooter onDismiss={actions.onDismissMessage} /> : null}
    </div>
  );
};

MessageAccessories.displayName = 'MessageAccessories';

const MessageBody = ({
  message,
  renderEmbedMarkdown,
  onInteraction,
  onSuppressEmbeds,
  currentUserId,
  onClickReply,
  onReactionClick,
  isGroupStart = true,
  shouldDisableInteractiveComponents,
  now,
  className,
  children,
}: Omit<MessageProps, 'renderMarkdown' | 'resolvers' | 'actions'>) => {
  const i18n = useMessageI18n();
  useAriaLabels(i18n.REACTIONS);
  const resolver = createResolver(useMessageResolvers(), message.resolved);
  const author = useMemo(
    () => getMessageAuthor(resolver.user(message.author.id) ?? message.author, resolver, message.member),
    [resolver, message.author, message.member],
  );
  const content = useMessageRenderedContent(message, now);
  const isReply = message.type === MessageType.Reply;
  return (
    <FocusRing offset={{ left: 4, right: 4 }}>
      <div
        className={clsx(
          className,
          listItemStyles.message,
          listItemStyles.cozyMessage,
          {
            [listItemStyles.mentioned]: isMentioned(message, currentUserId),
            [listItemStyles.ephemeral]: hasFlag(message.flags, MessageFlags.Ephemeral),
            [listItemStyles.groupStart]: isGroupStart || isReply,
          },
          { [styles.wrapper]: true, [styles.cozy]: true, [styles.zalgo]: true, [styles.hasReply]: isReply },
        )}
        aria-setsize={-1}
        aria-roledescription={i18n.MESSAGE}
        aria-labelledby={getMessageLabelledBy(message)}
        aria-describedby={getMessageDescribedBy(message)}
        role="article"
      >
        {isReply && message.message_reference != null ? (
          <RepliedMessage
            message={message}
            referencedMessage={message.referenced_message}
            onClickReply={onClickReply}
          />
        ) : null}
        <ExecutedCommand message={message} />
        <div className={styles.contents}>
          {isGroupStart || isReply ? (
            <MessageHeader
              message={message}
              author={author}
              ariaDescribedBy={
                isReply && message.referenced_message != null ? getMessageReplyContextId(message) : undefined
              }
            />
          ) : null}
          <MessageContent message={message} content={content}>
            {children}
          </MessageContent>
        </div>
        <MessageAccessories
          message={message}
          renderEmbedMarkdown={renderEmbedMarkdown}
          onInteraction={onInteraction}
          onSuppressEmbeds={onSuppressEmbeds}
          shouldDisableInteractiveComponents={shouldDisableInteractiveComponents}
          onReactionClick={onReactionClick}
        />
      </div>
    </FocusRing>
  );
};

MessageBody.displayName = 'MessageBody';

/**
 * A chat message drawn like the client's cozy message: avatar, header (name, app tag, time), content, then the
 * accessories (attachments, embeds, components, edited tag, ephemeral notice). Wrap it in `MessageListItem`
 * inside a list to get the chat's `li`.
 */
export const Message = ({ renderMarkdown, resolvers, actions, ...props }: MessageProps) => {
  const parentResolvers = useMessageResolvers();
  const parentActions = useMessageActions();
  const mergedResolvers = useMemo(
    () => (resolvers != null ? { ...parentResolvers, ...resolvers } : parentResolvers),
    [parentResolvers, resolvers],
  );
  const mergedActions = useMemo(
    () => (actions != null ? { ...DEFAULT_MESSAGE_ACTIONS, ...parentActions, ...actions } : parentActions),
    [parentActions, actions],
  );
  const body = (
    <MessageResolversContext.Provider value={mergedResolvers}>
      <MessageActionsContext.Provider value={mergedActions}>
        <MessageBody {...props} />
      </MessageActionsContext.Provider>
    </MessageResolversContext.Provider>
  );
  return renderMarkdown != null ? (
    <MessageMarkdownRendererContext.Provider value={renderMarkdown}>{body}</MessageMarkdownRendererContext.Provider>
  ) : (
    body
  );
};

Message.displayName = 'Message';

/** The chat list's `li` around a message (put it in a list with `list-style: none`, like the chat's `ol`). */
export const MessageListItem = ({
  message,
  children,
}: {
  message: Pick<APIMessage, 'id' | 'channel_id'>;
  children: ReactNode;
}) => (
  <FocusRing offset={{ left: 4, right: 4 }}>
    <li
      id={`chat-messages-${message.channel_id}-${message.id}`}
      className={listItemStyles.messageListItem}
      aria-setsize={-1}
    >
      {children}
    </li>
  </FocusRing>
);

MessageListItem.displayName = 'MessageListItem';
