import { useEffect, useState } from 'react';
import { Button, closeModal } from '@discord-mana/components';
import {
  MediaContextProvider,
  MediaViewerProvider,
  Message,
  MessageFlags,
  MessageListItem,
  openInteractionModal,
  type APIMessage,
  type APIMessageComponentInteractionData,
  type APIMessageTopLevelComponent,
  type APIModalSubmission,
  type APIResolvedUser,
  type MessageResolvers,
  type APIModalInteractionResponseCallbackData,
  type InteractionModalApplication,
} from '@discord-mana/messages';
import { renderEmbedMarkdown, renderMessageMarkdown } from '@discord-mana/markdown';
import type { StoryGroup } from '../../types';
import { BASE_MESSAGE, ChatList, InteractionLog } from './message';

interface ModalFixtureData {
  modal: APIModalInteractionResponseCallbackData;
  application?: InteractionModalApplication;
}

const modalFixtureFiles = import.meta.glob<{ story: string; data: ModalFixtureData }>(
  '../../../../../scripts/fixtures/modal/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const modalFixtures = Object.fromEntries(
  Object.entries(modalFixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `modal/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

const DEFAULT_APPLICATION: InteractionModalApplication = { id: '1000000000000000002', name: 'Helper', icon: null };

/** Opens the fixture's modal like the reference renderer does (scripts/fixtures/modal/reference.js). */
const InteractionModalFixture = ({ fixture }: { fixture: string }) => {
  const data = modalFixtures[fixture];
  useEffect(() => {
    if (data == null) return;
    const key = openInteractionModal({ modal: data.modal, application: data.application ?? DEFAULT_APPLICATION });
    return () => {
      closeModal(key);
    };
  }, [data]);
  return (
    <MediaContextProvider isWindowFocused={false}>
      <div />
    </MediaContextProvider>
  );
};

InteractionModalFixture.displayName = 'InteractionModalFixture';

const APP: APIResolvedUser = {
  id: '1000000000000000002',
  username: 'helper',
  avatar: null,
  discriminator: '0',
  bot: true,
};

const USERS: APIResolvedUser[] = [
  { id: '1000000000000000001', username: 'wumpus', global_name: 'Wumpus', avatar: null, discriminator: '0' },
  { id: '1000000000000000003', username: 'clyde', global_name: 'Clyde', avatar: null, discriminator: '0' },
  { id: '1000000000000000004', username: 'nelly', global_name: 'Nelly', avatar: null, discriminator: '0' },
];

const RESOLVERS: MessageResolvers = {
  resolveUser: (id) => USERS.find((user) => user.id === id),
  searchUsers: (query) => USERS.filter((user) => user.username.includes(query.toLowerCase())),
  resolveRole: (id) => ROLES.find((role) => role.id === id),
  searchRoles: (query) => ROLES.filter((role) => role.name.toLowerCase().includes(query.toLowerCase())),
  resolveChannel: (id) => CHANNELS.find((channel) => channel.id === id),
  searchChannels: (query, types) =>
    CHANNELS.filter(
      (channel) => (types == null || types.includes(channel.type)) && channel.name.includes(query.toLowerCase()),
    ),
};

const ROLES = [
  { id: '1100000000000000010', name: 'Moderators', color: 0x3498db, position: 2 },
  { id: '1100000000000000011', name: 'Members', color: 0, position: 1 },
];

const CHANNELS = [
  { id: '1200000000000000000', name: 'general', type: 0 },
  { id: '1200000000000000001', name: 'Lounge', type: 2 },
  { id: '1200000000000000002', name: 'announcements', type: 5 },
];

/** An app's message with the given components; interactions show up under it. */
const ComponentsMessage = ({ components, v2 = false }: { components: APIMessageTopLevelComponent[]; v2?: boolean }) => {
  const [interaction, setInteraction] = useState<APIMessageComponentInteractionData | null>(null);
  const message: APIMessage = {
    ...BASE_MESSAGE,
    author: APP,
    content: v2 ? '' : 'Here are some components',
    timestamp: new Date().toISOString(),
    flags: v2 ? MessageFlags.IsComponentsV2 : 0,
    components,
  };
  return (
    <MediaViewerProvider>
      <div style={{ width: 640 }}>
        <ChatList>
          <MessageListItem message={message}>
            <Message
              message={message}
              resolvers={RESOLVERS}
              renderMarkdown={renderMessageMarkdown}
              renderEmbedMarkdown={renderEmbedMarkdown}
              onInteraction={({ data }) => {
                setInteraction(data);
                return new Promise((resolve) => setTimeout(resolve, 800));
              }}
            />
          </MessageListItem>
        </ChatList>
        <InteractionLog data={interaction} />
      </div>
    </MediaViewerProvider>
  );
};

ComponentsMessage.displayName = 'ComponentsMessage';

const STYLE_OPTIONS = [
  { label: 'Primary', value: 1 },
  { label: 'Secondary', value: 2 },
  { label: 'Success', value: 3 },
  { label: 'Danger', value: 4 },
  { label: 'Link', value: 5 },
];

const ButtonsStory = ({
  label,
  style,
  disabled,
  emoji,
}: {
  label: string;
  style: number;
  disabled: boolean;
  emoji: boolean;
}) => (
  <ComponentsMessage
    components={[
      {
        type: 1,
        components: [
          style === 5
            ? {
                type: 2,
                style: 5,
                label,
                url: 'https://discord.com',
                disabled,
                emoji: emoji ? { name: '🔗' } : undefined,
              }
            : {
                type: 2,
                style: style as 1,
                label,
                custom_id: 'button',
                disabled,
                emoji: emoji ? { name: '🔥' } : undefined,
              },
        ],
      },
      {
        type: 1,
        components: [
          { type: 2, style: 1, label: 'Primary', custom_id: 'primary' },
          { type: 2, style: 2, label: 'Secondary', custom_id: 'secondary' },
          { type: 2, style: 3, label: 'Success', custom_id: 'success' },
          { type: 2, style: 4, label: 'Danger', custom_id: 'danger' },
          { type: 2, style: 5, label: 'Link', url: 'https://discord.com' },
        ],
      },
    ]}
  />
);

ButtonsStory.displayName = 'ButtonsStory';

const OPTIONS = [
  { label: 'Rock', value: 'rock', description: 'Crushes scissors', emoji: { name: '🪨' } },
  { label: 'Paper', value: 'paper', description: 'Covers rock', emoji: { name: '📄' } },
  { label: 'Scissors', value: 'scissors', description: 'Cut paper', emoji: { name: '✂️' } },
];

const SelectsStory = ({
  maxValues,
  placeholder,
  disabled,
}: {
  maxValues: number;
  placeholder: string;
  disabled: boolean;
}) => (
  <ComponentsMessage
    components={[
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: 'string',
            placeholder,
            options: OPTIONS,
            min_values: 1,
            max_values: maxValues,
            disabled,
          },
        ],
      },
      {
        type: 1,
        components: [{ type: 5, custom_id: 'users', placeholder: 'Pick users', max_values: maxValues, disabled }],
      },
      {
        type: 1,
        components: [{ type: 6, custom_id: 'roles', placeholder: 'Pick roles', max_values: maxValues, disabled }],
      },
      { type: 1, components: [{ type: 7, custom_id: 'mentionables', max_values: maxValues, disabled }] },
      {
        type: 1,
        components: [
          { type: 8, custom_id: 'channels', placeholder: 'Pick a channel', channel_types: [0, 5], disabled },
        ],
      },
    ]}
  />
);

SelectsStory.displayName = 'SelectsStory';

const MEDIA = `${ASSETS}/attachments`;

const ComponentsV2Story = ({
  accentColor,
  spoiler,
  divider,
  spacing,
}: {
  accentColor: string;
  spoiler: boolean;
  divider: boolean;
  spacing: number;
}) => (
  <ComponentsMessage
    v2
    components={[
      { type: 10, content: '# Release notes\nComponents v2 lays messages out with containers, sections and media.' },
      {
        type: 17,
        accent_color: accentColor === '' ? null : parseInt(accentColor.replace('#', ''), 16),
        spoiler,
        components: [
          {
            type: 9,
            components: [
              { type: 10, content: '**Version 2.0** is out' },
              { type: 10, content: 'With a thumbnail next to the text.' },
            ],
            accessory: {
              type: 11,
              media: {
                url: `${ASSETS}/square.png`,
                width: 512,
                height: 512,
                content_type: 'image/png',
                loading_state: 2,
              },
              description: 'A square',
            },
          },
          { type: 14, divider, spacing: spacing as 1 },
          {
            type: 9,
            components: [{ type: 10, content: 'Sections can end with a button instead.' }],
            accessory: { type: 2, style: 2, label: 'Changelog', custom_id: 'changelog' },
          },
          {
            type: 12,
            items: [
              {
                media: {
                  url: `${MEDIA}/photo-1.jpg`,
                  width: 1600,
                  height: 900,
                  content_type: 'image/jpeg',
                  loading_state: 2,
                },
              },
              {
                media: {
                  url: `${MEDIA}/photo-2.jpg`,
                  width: 900,
                  height: 1200,
                  content_type: 'image/jpeg',
                  loading_state: 2,
                },
              },
              {
                media: {
                  url: `${MEDIA}/photo-3.jpg`,
                  width: 1200,
                  height: 800,
                  content_type: 'image/jpeg',
                  loading_state: 2,
                },
              },
            ],
          },
          { type: 13, file: { url: `${ASSETS}/audio.mp3` }, name: 'release-notes.txt', size: 12345 },
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: 'Upgrade', custom_id: 'upgrade' },
              { type: 2, style: 5, label: 'Docs', url: 'https://discord.com' },
            ],
          },
        ],
      },
    ]}
  />
);

ComponentsV2Story.displayName = 'ComponentsV2Story';

const DEMO_MODAL = {
  title: 'Bug report',
  custom_id: 'bug-report',
  components: [
    { type: 10 as const, content: 'Tell us what went wrong.' },
    {
      type: 18 as const,
      label: 'Title',
      component: {
        type: 4 as const,
        custom_id: 'title',
        style: 1 as const,
        placeholder: 'Short summary',
        min_length: 5,
        max_length: 100,
        required: true,
      },
    },
    {
      type: 18 as const,
      label: 'Details',
      description: 'Steps to reproduce',
      component: { type: 4 as const, custom_id: 'details', style: 2 as const, required: false },
    },
    {
      type: 18 as const,
      label: 'Area',
      component: { type: 3 as const, custom_id: 'area', options: OPTIONS, required: true },
    },
    {
      type: 18 as const,
      label: 'Severity',
      component: {
        type: 21 as const,
        custom_id: 'severity',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high', description: 'Blocks me' },
        ],
        required: false,
      },
    },
    {
      type: 18 as const,
      label: 'Notify me about updates',
      component: { type: 23 as const, custom_id: 'notify', default: true },
    },
    {
      type: 18 as const,
      label: 'Screenshots',
      component: {
        type: 19 as const,
        custom_id: 'screenshots',
        min_values: 0,
        max_values: 3,
        required: false,
        file_types: ['image'],
      },
    },
  ],
};

const InteractionModalStory = ({ title }: { title: string }) => {
  const [submission, setSubmission] = useState<APIModalSubmission | null>(null);
  return (
    <div>
      <Button
        text="Open modal"
        onClick={() =>
          openInteractionModal({
            modal: { ...DEMO_MODAL, title },
            application: { id: APP.id, name: 'Helper', icon: null },
            resolvers: RESOLVERS,
            onSubmit: (data) => {
              setSubmission(data);
              return new Promise((resolve) => setTimeout(resolve, 600));
            },
          })
        }
      />
      {submission != null && (
        <pre style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({ ...submission, attachments: submission.attachments?.map((file) => file.name) }, null, 2)}
        </pre>
      )}
    </div>
  );
};

InteractionModalStory.displayName = 'InteractionModalStory';

const components: StoryGroup = {
  title: 'Components',
  stories: [
    {
      name: 'Buttons',
      id: 'component-buttons',
      component: ButtonsStory,
      docs: 'Message buttons are the legacy small button; link buttons open their URL, the others call onInteraction.',
      controls: {
        label: { label: 'Label', type: 'text', defaultValue: 'Click me' },
        style: { label: 'Style', type: 'select', defaultValue: 1, options: STYLE_OPTIONS },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
        emoji: { label: 'Emoji', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Selects',
      id: 'component-selects',
      component: SelectsStory,
      docs: 'String, user, role, mentionable and channel selects. User, role and channel options come from the resolvers.',
      controls: {
        maxValues: { label: 'Max values', type: 'slider', defaultValue: 1, minValue: 1, maxValue: 3 },
        placeholder: { label: 'Placeholder', type: 'text', defaultValue: 'Make your move' },
        disabled: { label: 'Disabled', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Components v2',
      id: 'components-v2',
      component: ComponentsV2Story,
      docs: 'A Components v2 message: Text Display, Container, Section with thumbnail or button, Separator, Media Gallery, File and an action row.',
      controls: {
        accentColor: { label: 'Accent color', type: 'color', defaultValue: '#5865f2' },
        spoiler: { label: 'Spoiler container', type: 'boolean', defaultValue: false },
        divider: { label: 'Separator divider', type: 'boolean', defaultValue: true },
        spacing: {
          label: 'Separator spacing',
          type: 'select',
          defaultValue: 1,
          options: [
            { label: 'Small', value: 1 },
            { label: 'Large', value: 2 },
          ],
        },
      },
    },
    {
      name: 'Interaction Modal',
      id: 'interaction-modal',
      component: InteractionModalStory,
      docs: 'openInteractionModal opens an app modal on the modal stack; Submit validates and calls onSubmit with the API submit shape.',
      controls: { title: { label: 'Title', type: 'text', defaultValue: 'Bug report' } },
    },
    {
      name: 'Interaction Modal Fixtures',
      id: 'interaction-modal-fixtures',
      component: InteractionModalFixture,
      docs: 'The modal payloads scripts/compare-messages.mjs opens with Discord’s modules.',
      controls: {
        fixture: {
          label: 'Fixture',
          type: 'select',
          defaultValue: Object.keys(modalFixtures)[0],
          options: Object.keys(modalFixtures).map((name) => ({ label: name, value: name })),
        },
      },
    },
  ],
};

export default components;
