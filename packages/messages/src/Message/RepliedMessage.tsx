import { useState, type MouseEventHandler, type ReactNode } from 'react';
import clsx from 'clsx';
import { Clickable } from '@discord-components/components';
import {
  AppsIcon,
  ChatIcon,
  ImageIcon,
  MicrophoneIcon,
  SlashBoxIcon,
  StickerSmallIcon,
} from '@discord-components/icons';
import { createResolver, useMessageResolvers } from '../MessageComponents/resolvers';
import { useRenderMarkdown } from './markdown';
import { BotTag } from './BotTag';
import { MessageContent } from './MessageContent';
import { getBotTagType, getMessageAuthor, getMessageReplyContextId, hasFlag, MessageUsername } from './MessageHeader';
import { useMessageI18n } from './messageI18n';
import { MessageFlags, MessageType, type APIMessage, type APIUser } from './types';
import markupStyles from '../markup/markup.module.css';
import styles from './Message.module.css';

/** The curved arrow the client draws when the replied message's avatar can't be shown. */
const ReplyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width={12} height={8} viewBox="0 0 12 8">
    <path
      d="M0.809739 3.59646L5.12565 0.468433C5.17446 0.431163 5.23323 0.408043 5.2951 0.401763C5.35698 0.395482 5.41943 0.406298 5.4752 0.432954C5.53096 0.45961 5.57776 0.50101 5.61013 0.552343C5.64251 0.603676 5.65914 0.662833 5.6581 0.722939V2.3707C10.3624 2.3707 11.2539 5.52482 11.3991 7.21174C11.4028 7.27916 11.3848 7.34603 11.3474 7.40312C11.3101 7.46021 11.2554 7.50471 11.1908 7.53049C11.1262 7.55626 11.0549 7.56204 10.9868 7.54703C10.9187 7.53201 10.857 7.49695 10.8104 7.44666C8.72224 5.08977 5.6581 5.63359 5.6581 5.63359V7.28135C5.65831 7.34051 5.64141 7.39856 5.60931 7.44894C5.5772 7.49932 5.53117 7.54004 5.4764 7.5665C5.42163 7.59296 5.3603 7.60411 5.29932 7.59869C5.23834 7.59328 5.18014 7.57151 5.13128 7.53585L0.809739 4.40892C0.744492 4.3616 0.691538 4.30026 0.655067 4.22975C0.618596 4.15925 0.599609 4.08151 0.599609 4.00269C0.599609 3.92386 0.618596 3.84612 0.655067 3.77562C0.691538 3.70511 0.744492 3.64377 0.809739 3.59646Z"
      fill="currentColor"
    />
  </svg>
);

ReplyIcon.displayName = 'ReplyIcon';

const ICON_SIZE = 20;

/** The replied message's preview text, or a placeholder and icon when it has no text (the client's `getReplyContent`). */
const getReplyPreview = (message: APIMessage, content: ReactNode, i18n: ReturnType<typeof useMessageI18n>) => {
  const empty = content == null || content === '';
  const hasStickers = (message.sticker_items?.length ?? 0) > 0;
  const hasInteraction = message.interaction != null || message.interaction_metadata != null;
  const isVoice = hasFlag(message.flags, MessageFlags.IsVoiceMessage);
  let placeholder: string | undefined;
  let rendered: ReactNode;
  let trailingIcon: ReactNode;
  if (empty) {
    if (message.poll != null)
      rendered = (
        <div className={clsx(styles.repliedTextContent, markupStyles.markup)}>{message.poll.question.text}</div>
      );
    else if (hasStickers) placeholder = i18n.CLICK_TO_SEE_STICKER;
    else if (hasInteraction) placeholder = i18n.CLICK_TO_SEE_COMMAND;
    else if (isVoice) placeholder = i18n.CLICK_TO_SEE_VOICE_MESSAGE;
    else if (hasFlag(message.flags, MessageFlags.IsComponentsV2)) placeholder = i18n.CLICK_TO_SEE_MESSAGE;
    else {
      placeholder = i18n.CLICK_TO_SEE_ATTACHMENT;
      trailingIcon = (
        <ImageIcon
          size="custom"
          color="currentColor"
          className={styles.repliedTextContentTrailingIcon}
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
      );
    }
  } else
    rendered = <MessageContent message={message} content={content} className={styles.repliedTextContent} compact />;
  const iconProps = {
    size: 'custom' as const,
    color: 'currentColor',
    className: styles.repliedTextContentTrailingIcon,
    width: ICON_SIZE,
    height: ICON_SIZE,
  };
  if (hasStickers) trailingIcon = <StickerSmallIcon {...iconProps} />;
  else if (hasInteraction) trailingIcon = <SlashBoxIcon {...iconProps} />;
  else if (isVoice) trailingIcon = <MicrophoneIcon {...iconProps} width={(19 / 24) * ICON_SIZE} />;
  else if (
    ((message.attachments?.length ?? 0) > 0 || (message.embeds?.length ?? 0) > 0) &&
    message.type !== MessageType.PollResult
  )
    trailingIcon = <ImageIcon {...iconProps} />;
  return { placeholder, rendered, trailingIcon };
};

export interface RepliedMessageProps {
  /** The reply. */
  message: APIMessage;
  /**
   * The replied-to message: the reply's `referenced_message`. `null` means it was deleted, `undefined` that it
   * isn't loaded.
   */
  referencedMessage: APIMessage | null | undefined;
  onClickReply?: MouseEventHandler<HTMLElement>;
}

/** The bar above a reply: spine, the replied message's avatar, author and a one-line preview. */
export const RepliedMessage = ({ message, referencedMessage, onClickReply }: RepliedMessageProps) => {
  const i18n = useMessageI18n();
  const renderMarkdown = useRenderMarkdown();
  const resolver = createResolver(useMessageResolvers(), message.resolved);
  const [hovered, setHovered] = useState(false);
  const toggleHovered = () => setHovered((value) => !value);
  const state = referencedMessage != null ? 'loaded' : referencedMessage === null ? 'deleted' : 'not-loaded';
  const referenced = referencedMessage ?? undefined;
  const repliedUser = referenced != null ? (resolver.user(referenced.author.id) ?? referenced.author) : null;
  const repliedAuthor = repliedUser != null ? getMessageAuthor(repliedUser, resolver, referenced?.member) : null;
  const baseAuthor = getMessageAuthor(resolver.user(message.author.id) ?? message.author, resolver, message.member);
  const isContextCommand = message.type === MessageType.ContextMenuCommand;

  let avatar: ReactNode;
  if (referenced == null)
    avatar = isContextCommand ? (
      <div className={styles.replyChatIconContainer}>
        <ChatIcon size="xs" />
      </div>
    ) : (
      <div className={styles.replyBadge}>
        <ReplyIcon className={styles.replyIcon} />
      </div>
    );
  else
    avatar = (
      <img alt="" src={resolver.avatarURL(repliedUser as APIUser, 16) ?? undefined} className={styles.replyAvatar} />
    );

  let username: ReactNode = null;
  if (referenced != null && repliedAuthor != null) {
    const tagType = getBotTagType(referenced);
    const mentionsAuthor = (message.mentions ?? []).some((user) => user.id === referenced.author.id);
    username = (
      <MessageUsername
        compact
        author={mentionsAuthor ? { ...repliedAuthor, nick: `@${repliedAuthor.nick}` } : repliedAuthor}
        systemTag={
          tagType != null ? (
            <BotTag className={clsx(styles.botTagCompact, styles.botTag)} type={tagType} useRemSizes />
          ) : null
        }
      />
    );
  }

  let preview: ReactNode;
  const clickHandler = state !== 'deleted' ? onClickReply : undefined;
  if (state === 'loaded' && referenced != null) {
    const content =
      referenced.content != null && referenced.content !== ''
        ? renderMarkdown(referenced.content, {
            kind: 'reply-preview',
            messageId: referenced.id,
            channelId: referenced.channel_id,
          })
        : null;
    const { placeholder, rendered, trailingIcon } = getReplyPreview(referenced, content, i18n);
    preview = (
      <>
        <Clickable
          className={clsx(styles.repliedTextPreview, styles.clickable, {
            [styles.repliedMessageClickableSpineHovered]: hovered,
          })}
          onClick={clickHandler}
          onMouseEnter={toggleHovered}
          onMouseLeave={toggleHovered}
        >
          {rendered ?? <span className={styles.repliedTextPlaceholder}>{placeholder}</span>}
        </Clickable>
        {trailingIcon}
      </>
    );
  } else if (state === 'not-loaded')
    preview = (
      <Clickable className={clsx(styles.repliedTextPreview, styles.clickable)} onClick={clickHandler}>
        <span className={styles.repliedTextPlaceholder}>{i18n.REPLY_NOT_LOADED}</span>
      </Clickable>
    );
  else
    preview = (
      <div className={styles.repliedTextPreview}>
        <span className={styles.repliedTextPlaceholder}>{i18n.REPLY_DELETED}</span>
      </div>
    );

  return (
    <div
      id={getMessageReplyContextId(message)}
      className={clsx(styles.repliedMessage, isContextCommand ? styles.contextCommandMessage : null)}
      aria-label={repliedAuthor != null ? i18n.REPLYING_TO(baseAuthor.nick, repliedAuthor.nick) : undefined}
    >
      <Clickable
        tag="div"
        aria-label={i18n.JUMP_TO_REPLY}
        className={clsx(styles.repliedMessageClickableSpine, { [styles.repliedMessageContentHovered]: hovered })}
        onClick={onClickReply}
        onMouseEnter={toggleHovered}
        onMouseLeave={toggleHovered}
      />
      {avatar}
      {username}
      {preview}
    </div>
  );
};

RepliedMessage.displayName = 'RepliedMessage';

/** The "<user> used <command>" line above a command's response. */
export const ExecutedCommand = ({
  message,
  onClickUser,
  onClickCommand,
}: {
  message: APIMessage;
  onClickUser?: MouseEventHandler<HTMLElement>;
  onClickCommand?: MouseEventHandler<HTMLElement>;
}) => {
  const i18n = useMessageI18n();
  const resolver = createResolver(useMessageResolvers(), message.resolved);
  const interaction = message.interaction;
  if (interaction == null || interaction.name === '') return null;
  const user = resolver.user(interaction.user.id) ?? interaction.user;
  const author = getMessageAuthor(user, resolver, interaction.member);
  return (
    <div className={clsx(styles.repliedMessage, styles.messageSpine, styles.executedCommand)} aria-hidden>
      <img alt="" src={resolver.avatarURL(user, 16) ?? undefined} className={styles.executedCommandAvatar} />
      {/* The client opens profile and command popouts from these. */}
      <Clickable
        tag="span"
        aria-expanded={false}
        className={clsx(styles.username, styles.clickable)}
        onClick={onClickUser}
        data-text={author.nick}
      >
        {author.nick}
      </Clickable>
      {/* One text node: the line is a flex container, which drops whitespace-only nodes. */}
      {` ${i18n.USED_COMMAND} `}
      <Clickable tag="span" className="" aria-expanded={false} onClick={onClickCommand}>
        <div className={clsx(styles.appLauncherOnboardingCommandName, styles.clickable)}>
          <AppsIcon size="custom" color="currentColor" height={10} width={10} className={styles.appsIcon} />
          {interaction.name}
        </div>
      </Clickable>
    </div>
  );
};

ExecutedCommand.displayName = 'ExecutedCommand';
