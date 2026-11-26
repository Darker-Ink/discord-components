import { useMemo } from 'react';
import {
  MediaContextProvider,
  MediaViewerProvider,
  Message,
  MessageListItem,
  type APIMessage,
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

const message: StoryGroup = {
  title: 'Message',
  stories: [
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
