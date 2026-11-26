import { Component, Fragment, useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Message,
  MessageListItem,
  MessageType,
  isSystemMessage,
  sanitizeUrl,
  type APIMessage,
  type APIResolvedUser,
  type MessageActions,
  type MessageResolvers,
} from '@discord-mana/messages';
import dividerStyles from './Divider.module.css';
import styles from './Viewer.module.css';

// Discord starts a new group when the author changes, after 7 minutes, on a new day, and for replies,
// commands and system messages.
const GROUP_WINDOW_MS = 7 * 60 * 1000;

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const startsGroup = (previous: APIMessage | undefined, message: APIMessage) => {
  if (previous == null) return true;
  if (message.type === MessageType.Reply || message.interaction_metadata != null || message.interaction != null) {
    return true;
  }
  if (isSystemMessage(message) || isSystemMessage(previous)) return true;
  if (previous.author.id !== message.author.id || previous.author.username !== message.author.username) return true;
  const gap = Date.parse(message.timestamp) - Date.parse(previous.timestamp);
  return !(gap >= 0 && gap < GROUP_WINDOW_MS);
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

const DateDivider = ({ date }: { date: Date }) => {
  const label = dateFormat.format(date);
  return (
    <div
      role="separator"
      aria-label={label}
      className={clsx(dividerStyles.divider, dividerStyles.hasContent, styles.dateDivider)}
    >
      <span className={dividerStyles.content}>{label}</span>
    </div>
  );
};

DateDivider.displayName = 'DateDivider';

class MessageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  static displayName = 'MessageBoundary';
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <div className={styles.brokenMessage}>This message could not be displayed.</div>
    ) : (
      this.props.children
    );
  }
}

// Display only: nothing a viewer does reaches a bot or any server.
const noop = () => {};

const ACTIONS: Partial<MessageActions> = {
  openLink: (url) => {
    const safe = sanitizeUrl(url);
    if (safe != null) window.open(safe, '_blank', 'noopener,noreferrer');
  },
  onDismissMessage: noop,
};

const useResolvers = (messages: APIMessage[]): MessageResolvers =>
  useMemo(() => {
    const users = new Map<string, APIResolvedUser>();
    for (const message of messages) {
      users.set(message.author.id, message.author);
      for (const user of message.mentions ?? []) if (!users.has(user.id)) users.set(user.id, user);
    }
    return {
      resolveUser: (id) => users.get(id),
      // Only the creator's own https avatar URLs; anything else falls back to Discord's default avatars.
      getAvatarURL: (user) => (user.avatar_url != null ? sanitizeUrl(user.avatar_url) : null),
    };
  }, [messages]);

export interface MessageListProps {
  messages: APIMessage[];
  interactive: boolean;
  showDates: boolean;
}

export const MessageList = ({ messages, interactive, showDates }: MessageListProps) => {
  const resolvers = useResolvers(messages);
  return (
    <ol className={styles.list} aria-label="Messages">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const date = new Date(message.timestamp);
        const newDay = previous == null || dayKey(new Date(previous.timestamp)) !== dayKey(date);
        return (
          <Fragment key={`${message.id}-${index}`}>
            {showDates && newDay && !Number.isNaN(date.getTime()) ? <DateDivider date={date} /> : null}
            <MessageListItem message={message}>
              <MessageBoundary>
                <Message
                  message={message}
                  resolvers={resolvers}
                  actions={ACTIONS}
                  isGroupStart={newDay || startsGroup(previous, message)}
                  shouldDisableInteractiveComponents={!interactive}
                  onInteraction={noop}
                />
              </MessageBoundary>
            </MessageListItem>
          </Fragment>
        );
      })}
    </ol>
  );
};

MessageList.displayName = 'MessageList';
