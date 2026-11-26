import { useMemo, useState } from 'react';
import {
  MediaContextProvider,
  MediaViewerProvider,
  Message,
  MessageListItem,
  MessageFlags,
  MessageType,
  type APIMessage,
  type APIMessageComponentInteractionData,
  type APIUser,
  type MessageResolvers,
} from '@discord-components/messages';
import type { StoryGroup } from '../../types';

interface MessageFixtureData {
  message: Partial<APIMessage> & Pick<APIMessage, 'author'>;
  /** Users the client would have in its user store (resolved for selects' default values). */
  users?: APIUser[];
  /** Image URLs for emojis, by custom emoji id or unicode emoji (both sides use them). */
  emoji_urls?: Record<string, string>;
  /** Shortcodes of unicode emojis (the client's emoji database), for reaction labels. */
  emoji_names?: Record<string, string>;
  props?: { isInteracting?: boolean };
}

const fixtureFiles = import.meta.glob<{ story: string; data: MessageFixtureData }>(
  '../../../../../scripts/fixtures/message/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

export const BASE_MESSAGE: APIMessage = {
  id: '1300000000000000000',
  channel_id: '1200000000000000000',
  type: 0,
  content: '',
  timestamp: '2026-11-26T12:00:00.000Z',
  edited_timestamp: null,
  flags: 0,
  attachments: [],
  embeds: [],
  components: [],
  mentions: [],
  mention_roles: [],
  pinned: false,
  mention_everyone: false,
  tts: false,
  author: { id: '1000000000000000001', username: 'wumpus', global_name: 'Wumpus', avatar: null, discriminator: '0' },
};

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `message/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

/** Renders like the chat: the message's `li` inside a list without bullets. */
export const ChatList = ({ children }: { children: React.ReactNode }) => (
  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ol>
);

const MessageFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  const message = useMemo(() => (data == null ? null : { ...BASE_MESSAGE, ...data.message }), [data]);
  const resolvers = useMemo<MessageResolvers>(
    () => ({
      getEmojiURL: ({ id, name }) => {
        const key = id ?? name;
        return key != null ? (data?.emoji_urls?.[key] ?? null) : null;
      },
      resolveUser: (id) => data?.users?.find((user) => user.id === id),
      searchUsers: (query) =>
        (data?.users ?? []).filter((user) => user.id !== data?.message.author.id && user.username.includes(query)),
      getEmojiName: ({ name }) => (name != null ? (data?.emoji_names?.[name] ?? name) : null),
    }),
    [data],
  );
  if (message == null) return null;
  return (
    // The reference renderer has no window store, so the client considers its window unfocused.
    <MediaContextProvider isWindowFocused={false}>
      <MediaViewerProvider>
        <ChatList>
          <MessageListItem message={message}>
            <Message message={message} resolvers={resolvers} />
          </MessageListItem>
        </ChatList>
      </MediaViewerProvider>
    </MediaContextProvider>
  );
};

MessageFixture.displayName = 'MessageFixture';

const AUTHOR = {
  id: '1000000000000000001',
  username: 'wumpus',
  global_name: 'Wumpus',
  avatar: null,
  discriminator: '0',
};
const APP = {
  id: '1000000000000000002',
  username: 'helper',
  global_name: null,
  avatar: null,
  discriminator: '0',
  bot: true,
};

/** The last interaction the message sent, shown under it (what your bot would receive). */
export const InteractionLog = ({ data }: { data: APIMessageComponentInteractionData | null }) =>
  data == null ? null : (
    <pre style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );

InteractionLog.displayName = 'InteractionLog';

interface MessageStoryProps {
  content: string;
  bot: boolean;
  edited: boolean;
  ephemeral: boolean;
  loading: boolean;
  silent: boolean;
  withButtons: boolean;
  reply: boolean;
  reactions: boolean;
}

const MessageStory = ({
  content,
  bot,
  edited,
  ephemeral,
  loading,
  silent,
  withButtons,
  reply,
  reactions,
}: MessageStoryProps) => {
  const [interaction, setInteraction] = useState<APIMessageComponentInteractionData | null>(null);
  // A recent id, so the "thinking" message hasn't timed out yet.
  const [now] = useState(() => Date.now());
  const message: APIMessage = {
    ...BASE_MESSAGE,
    id: loading ? `${(BigInt(now - 1420070400000) << 22n).toString()}` : BASE_MESSAGE.id,
    type: reply ? MessageType.Reply : loading ? MessageType.ChatInputCommand : MessageType.Default,
    content: loading ? '' : content,
    timestamp: new Date(now).toISOString(),
    edited_timestamp: edited ? new Date(now).toISOString() : null,
    author: bot || loading ? APP : AUTHOR,
    flags:
      (ephemeral ? MessageFlags.Ephemeral : 0) |
      (loading ? MessageFlags.Loading : 0) |
      (silent ? MessageFlags.SuppressNotifications : 0),
    interaction: loading || ephemeral ? { id: '1', type: 2, name: 'ping', user: AUTHOR } : undefined,
    message_reference: reply ? { message_id: '1299999999999999999', channel_id: BASE_MESSAGE.channel_id } : undefined,
    referenced_message: reply
      ? { ...BASE_MESSAGE, id: '1299999999999999999', content: 'The message being replied to', author: APP }
      : undefined,
    reactions: reactions
      ? [
          { emoji: { id: null, name: '👍' }, count: 3, count_details: { burst: 0, normal: 3 }, me: true },
          { emoji: { id: null, name: '🎉' }, count: 1, count_details: { burst: 0, normal: 1 }, me: false },
        ]
      : [],
    components: withButtons
      ? [
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: 'Accept', custom_id: 'accept' },
              { type: 2, style: 2, label: 'Later', custom_id: 'later' },
              { type: 2, style: 5, label: 'Docs', url: 'https://discord.com/developers/docs' },
            ],
          },
        ]
      : [],
  };
  return (
    <div style={{ width: 640 }}>
      <ChatList>
        <MessageListItem message={message}>
          <Message
            message={message}
            onInteraction={({ data }) => {
              setInteraction(data);
              return new Promise((resolve) => setTimeout(resolve, 1000));
            }}
          />
        </MessageListItem>
      </ChatList>
      <InteractionLog data={interaction} />
    </div>
  );
};

MessageStory.displayName = 'MessageStory';

const message: StoryGroup = {
  title: 'Message',
  stories: [
    {
      name: 'Message',
      id: 'message',
      component: MessageStory,
      docs: 'A message from its API object. Clicking a button calls onInteraction; returning a promise shows the loading state until it settles.',
      controls: {
        content: { label: 'Content', type: 'text', defaultValue: 'Hello from the message renderer!' },
        bot: { label: 'Sent by an app', type: 'boolean', defaultValue: true },
        edited: { label: 'Edited', type: 'boolean', defaultValue: false },
        reply: { label: 'Reply', type: 'boolean', defaultValue: false },
        withButtons: { label: 'Buttons', type: 'boolean', defaultValue: true },
        reactions: { label: 'Reactions', type: 'boolean', defaultValue: false },
        ephemeral: { label: 'Ephemeral', type: 'boolean', defaultValue: false },
        loading: { label: 'Loading (thinking)', type: 'boolean', defaultValue: false },
        silent: { label: 'Silent (@silent)', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Fixtures',
      id: 'message-fixtures',
      component: MessageFixture,
      docs: 'The payloads scripts/compare-messages.mjs renders with Discord’s modules.',
      controls: {
        fixture: {
          label: 'Fixture',
          type: 'select',
          defaultValue: Object.keys(fixtures)[0],
          options: Object.keys(fixtures).map((name) => ({ label: name, value: name })),
        },
      },
    },
  ],
};

export default message;
