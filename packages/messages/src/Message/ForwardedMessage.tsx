import type { ReactNode } from 'react';
import { Clickable, Text, tokens, useManaContext } from '@discord-mana/components';
import { ArrowAngleRightUpIcon, ChevronSmallRightIcon } from '@discord-mana/icons';
import { formatCalendarTimestamp } from '../formatTimestamp';
import { createResolver, useMessageResolvers } from '../MessageComponents/resolvers';
import { getSnowflakeTimestamp, MessageContent, useMessageRenderedContent } from './MessageContent';
import { useMessageI18n } from './messageI18n';
import type { APIMessage, APIMessageSnapshot } from './types';
import styles from './ForwardedMessage.module.css';

/** The forwarded message as a message: the snapshot's content on the forwarding message (the client's merge). */
export const getSnapshotMessage = (message: APIMessage, snapshot: APIMessageSnapshot): APIMessage => ({
  ...message,
  content: snapshot.message.content,
  attachments: snapshot.message.attachments,
  embeds: snapshot.message.embeds,
  flags: snapshot.message.flags,
  components: snapshot.message.components,
  edited_timestamp: null,
  timestamp: snapshot.message.timestamp,
  reactions: [],
  message_snapshots: [],
  sticker_items: snapshot.message.sticker_items,
});

export const isForwardedMessage = (message: APIMessage) => (message.message_snapshots?.length ?? 0) > 0;

const ForwardedHeader = () => {
  const i18n = useMessageI18n();
  return (
    <div className={styles.headerContainer}>
      <ArrowAngleRightUpIcon size="xs" className={styles.headerIcon} color={tokens.colors.TEXT_MUTED} />
      <Text className={styles.headerText} variant="body-sm/semibold" color="text-muted">
        {i18n.FORWARDED}
      </Text>
    </div>
  );
};

ForwardedHeader.displayName = 'ForwardedHeader';

/**
 * Where the forwarded message came from: its channel when the resolvers know it (same server), else its server.
 * Without either the client shows no footer.
 */
const ForwardFooter = ({
  message,
  snapshot,
  onClick,
}: {
  message: APIMessage;
  snapshot: APIMessageSnapshot;
  onClick?: () => void;
}) => {
  const i18n = useMessageI18n();
  const resolvers = useMessageResolvers();
  const resolver = createResolver(resolvers, message.resolved);
  const { locale } = useManaContext();
  const reference = message.message_reference;
  const referencedId = reference?.message_id;
  const date =
    referencedId != null ? new Date(getSnowflakeTimestamp(referencedId)) : new Date(snapshot.message.timestamp);
  const timestampLabel = formatCalendarTimestamp(date, i18n, locale);
  let origin: { label: string; iconUrl?: string } | null = null;
  const channel = reference?.channel_id != null ? resolver.channel(reference.channel_id) : null;
  if (channel?.name != null) origin = { label: `#${channel.name}` };
  else if (reference?.guild_id != null) {
    const guild = resolvers.resolveGuild?.(reference.guild_id);
    if (guild != null)
      origin = {
        label: guild.name,
        iconUrl:
          guild.icon != null ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=16` : undefined,
      };
  }
  if (origin == null) return null;
  return (
    <Clickable
      className={styles.footerContainer}
      onClick={onClick}
      aria-label={i18n.FORWARDED_FROM(origin.label, timestampLabel)}
    >
      {origin.iconUrl != null ? <img className={styles.originIcon} src={origin.iconUrl} alt="" /> : null}
      <Text className={styles.footerText} variant="body-sm/medium" color="none">
        {`${origin.label}  •  ${timestampLabel}`}
      </Text>
      <ChevronSmallRightIcon size="xxs" color={tokens.colors.TEXT_MUTED} />
    </Clickable>
  );
};

ForwardFooter.displayName = 'ForwardFooter';

const ForwardedSnapshot = ({
  message,
  snapshot,
  renderAccessories,
  onClickForward,
}: {
  message: APIMessage;
  snapshot: APIMessageSnapshot;
  renderAccessories: (message: APIMessage) => ReactNode;
  onClickForward?: () => void;
}) => {
  const snapshotMessage = getSnapshotMessage(message, snapshot);
  const content = useMessageRenderedContent(snapshotMessage);
  return (
    <div className={styles.container}>
      <div className={styles.quote} />
      <div className={styles.content}>
        <ForwardedHeader />
        <MessageContent message={snapshotMessage} content={content} />
        {renderAccessories(snapshotMessage)}
        <ForwardFooter message={message} snapshot={snapshot} onClick={onClickForward} />
      </div>
    </div>
  );
};

ForwardedSnapshot.displayName = 'ForwardedSnapshot';

/** A forwarded message: its snapshots quoted with a "Forwarded" header and their own accessories. */
export const ForwardedMessage = ({
  message,
  renderAccessories,
  onClickForward,
}: {
  message: APIMessage;
  renderAccessories: (message: APIMessage) => ReactNode;
  onClickForward?: () => void;
}) =>
  (message.message_snapshots ?? []).map((snapshot, index) => (
    <ForwardedSnapshot
      key={index}
      message={message}
      snapshot={snapshot}
      renderAccessories={renderAccessories}
      onClickForward={onClickForward}
    />
  ));

ForwardedMessage.displayName = 'ForwardedMessage';
