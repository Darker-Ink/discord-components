import { Component, Fragment, memo, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  type OnMessageComponentInteraction,
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

interface Row {
  message: APIMessage;
  index: number;
  groupStart: boolean;
  /** The date divider shown above the row, if it starts a new day. */
  day: Date | null;
}

// Grouping and dividers are decided over the whole transcript up front, so windowing never changes them.
const toRows = (messages: APIMessage[]): Row[] =>
  messages.map((message, index) => {
    const previous = messages[index - 1];
    const date = new Date(message.timestamp);
    const valid = !Number.isNaN(date.getTime());
    const newDay = valid && (previous == null || dayKey(new Date(previous.timestamp)) !== dayKey(date));
    return { message, index, groupStart: newDay || startsGroup(previous, message), day: newDay ? date : null };
  });

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

interface RowsProps {
  rows: Row[];
  resolvers: MessageResolvers;
  interactive: boolean;
  showDates: boolean;
  onInteraction?: OnMessageComponentInteraction<APIMessage>;
}

const Rows = memo(({ rows, resolvers, interactive, showDates, onInteraction = noop }: RowsProps) =>
  rows.map(({ message, index, groupStart, day }) => (
    <Fragment key={`${message.id}-${index}`}>
      {showDates && day != null ? <DateDivider date={day} /> : null}
      <MessageListItem message={message}>
        <MessageBoundary>
          <Message
            message={message}
            resolvers={resolvers}
            actions={ACTIONS}
            isGroupStart={groupStart}
            shouldDisableInteractiveComponents={!interactive}
            onInteraction={onInteraction}
          />
        </MessageBoundary>
      </MessageListItem>
    </Fragment>
  )),
);

Rows.displayName = 'Rows';

// Transcripts up to this size render at once; longer ones render in chunks near the viewport.
const RENDER_ALL_BELOW = 300;
const CHUNK_SIZE = 50;

/** A rough height for a chunk nobody has seen yet, corrected once it renders. */
const estimateHeight = (rows: Row[]) =>
  rows.reduce((total, { message, groupStart, day }) => {
    const lines = Math.ceil((message.content?.length ?? 0) / 90) || 1;
    let height = (groupStart ? 26 : 4) + lines * 22 + (day != null ? 40 : 0);
    height += (message.attachments?.length ?? 0) * 320 + (message.embeds?.length ?? 0) * 140;
    height += (message.components?.length ?? 0) * 80 + ((message.reactions?.length ?? 0) > 0 ? 34 : 0);
    return total + height;
  }, 0);

/**
 * Windowed rendering that works with the page's own scrolling and with auto-height iframes (where the scrolling
 * happens in the parent page): chunks of messages render while they are on screen, or next to a chunk that is,
 * and are otherwise replaced by a spacer of their measured (or estimated) height.
 */
const WindowedRows = ({ rows, ...props }: RowsProps) => {
  const chunks = useMemo(() => {
    const out: Row[][] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) out.push(rows.slice(i, i + CHUNK_SIZE));
    return out;
  }, [rows]);
  const [onScreen, setOnScreen] = useState<ReadonlySet<number>>(() => new Set([0]));
  // Measured heights, written by the observer and read when a chunk turns back into a spacer.
  const [heights] = useState(() => new Map<number, number>());
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (container == null) return;
    // The implicit root is the top-level viewport, which also covers iframes scrolled by their parent.
    const intersection = new IntersectionObserver(
      (entries) =>
        setOnScreen((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.chunk);
            if (entry.isIntersecting) next.add(index);
            else next.delete(index);
          }
          return next;
        }),
      { rootMargin: '600px 0px' },
    );
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (element.dataset.rendered === '1') heights.set(Number(element.dataset.chunk), entry.contentRect.height);
      }
    });
    for (const element of container.querySelectorAll<HTMLElement>(':scope > [data-chunk]')) {
      intersection.observe(element);
      resize.observe(element);
    }
    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, [chunks, container, heights]);

  const rendered = (index: number) => onScreen.has(index) || onScreen.has(index - 1) || onScreen.has(index + 1);

  return (
    <div ref={setContainer} className={styles.chunks}>
      {chunks.map((chunk, index) => {
        const show = rendered(index);
        return (
          <div
            key={index}
            data-chunk={index}
            data-rendered={show ? '1' : '0'}
            className={styles.chunk}
            style={show ? undefined : { height: heights.get(index) ?? estimateHeight(chunk) }}
          >
            {show ? <Rows rows={chunk} {...props} /> : null}
          </div>
        );
      })}
    </div>
  );
};

WindowedRows.displayName = 'WindowedRows';

export interface MessageListProps {
  messages: APIMessage[];
  interactive: boolean;
  showDates: boolean;
  /** Handles interactions; without it they do nothing. */
  onInteraction?: OnMessageComponentInteraction<APIMessage>;
}

export const MessageList = ({ messages, interactive, showDates, onInteraction }: MessageListProps) => {
  const resolvers = useResolvers(messages);
  const rows = useMemo(() => toRows(messages), [messages]);
  const props = { rows, resolvers, interactive, showDates, onInteraction };
  return (
    <ol className={styles.list} aria-label="Messages" data-count={messages.length}>
      {rows.length < RENDER_ALL_BELOW ? <Rows {...props} /> : <WindowedRows {...props} />}
    </ol>
  );
};

MessageList.displayName = 'MessageList';
