import { useMemo, useState } from 'react';
import { TextArea } from '@discord-mana/components';
import {
  MARKDOWN_PRESETS,
  MARKDOWN_RULE_NAMES,
  Markdown,
  parse,
  type MarkdownParseOptions,
  type MarkdownPreset,
  type MarkdownRuleName,
} from '@discord-mana/markdown';
import {
  MessageContent,
  MessageResolversContext,
  type APIMessage,
  type APIResolvedChannel,
  type APIResolvedCommand,
  type APIResolvedGuild,
  type APIResolvedMember,
  type APIResolvedRole,
  type APIResolvedUser,
  type MessageResolvers,
} from '@discord-mana/messages';
import type { Controls, StoryGroup } from '../../types';
import { BASE_MESSAGE } from './message';

// Fixtures shared with scripts/compare-messages.mjs (group "markdown") and scripts/compare-markdown-ast.mjs.
export interface MarkdownFixtureData {
  preset?: MarkdownPreset;
  context?: MarkdownParseOptions;
  cases: string[];
  users?: APIResolvedUser[];
  members?: Record<string, APIResolvedMember>;
  roles?: APIResolvedRole[];
  channels?: APIResolvedChannel[];
  guilds?: APIResolvedGuild[];
  commands?: APIResolvedCommand[];
  /** Image URLs for emojis, by custom emoji id or unicode emoji (both sides use them). */
  emoji_urls?: Record<string, string>;
}

const fixtureFiles = import.meta.glob<{ story: string; data: MarkdownFixtureData }>(
  '../../../../../scripts/fixtures/markdown/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `markdown/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

export const createFixtureResolvers = (data: Omit<MarkdownFixtureData, 'cases'>): MessageResolvers => ({
  resolveUser: (id) => data.users?.find((user) => user.id === id),
  resolveMember: (id) => data.members?.[id],
  resolveRole: (id) => data.roles?.find((role) => role.id === id),
  resolveChannel: (id) => data.channels?.find((channel) => channel.id === id),
  resolveGuild: (id) => data.guilds?.find((guild) => guild.id === id),
  resolveCommand: (id) => data.commands?.find((command) => command.id === id),
  getEmojiURL: ({ id, name }) => {
    const key = id ?? name;
    return key != null ? (data.emoji_urls?.[key] ?? null) : null;
  },
});

const messageFor = (content: string, index: number): APIMessage => ({
  ...BASE_MESSAGE,
  id: String(BigInt(BASE_MESSAGE.id) + BigInt(index)),
  content,
});

/** Each case in the container its context renders in (message content's `.markup` div). */
const MarkdownCases = ({ data }: { data: MarkdownFixtureData }) => {
  const resolvers = useMemo(() => createFixtureResolvers(data), [data]);
  return (
    <MessageResolversContext.Provider value={resolvers}>
      <div>
        {data.cases.map((content, index) => {
          const message = messageFor(content, index);
          return (
            <div key={index} data-case={index} style={{ marginBottom: 8 }}>
              <MessageContent
                message={message}
                content={
                  <Markdown
                    content={content}
                    preset={data.preset}
                    context={{ channelId: message.channel_id, messageId: message.id, ...data.context }}
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </MessageResolversContext.Provider>
  );
};

MarkdownCases.displayName = 'MarkdownCases';

// scripts/compare-markdown-ast.mjs parses the fixture cases with this, next to Discord's parser.
declare global {
  interface Window {
    __markdownTest?: {
      fixtures: typeof fixtures;
      parse: (fixture: string, index: number) => unknown;
    };
  }
}

window.__markdownTest = {
  fixtures,
  parse: (fixture, index) => {
    const data = fixtures[fixture];
    const message = messageFor(data.cases[index], index);
    return parse(data.cases[index], {
      preset: data.preset,
      context: { channelId: message.channel_id, messageId: message.id, ...data.context },
      resolvers: createFixtureResolvers(data),
    });
  },
};

const MarkdownFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  return data == null ? null : <MarkdownCases data={data} />;
};

MarkdownFixture.displayName = 'MarkdownFixture';

// Sample server data for the editor and gallery.
const SAMPLE: Omit<MarkdownFixtureData, 'cases'> = {
  users: [
    { id: '1000000000000000001', username: 'wumpus', global_name: 'Wumpus', avatar: null, discriminator: '0' },
    { id: '1000000000000000002', username: 'nelly', global_name: null, avatar: null, discriminator: '0' },
  ],
  members: { '1000000000000000002': { nick: 'Nelly the Mod' } },
  roles: [
    { id: '1100000000000000010', name: 'Moderators', color: 0x3498db },
    { id: '1100000000000000011', name: 'Members', color: 0 },
  ],
  channels: [
    { id: '1200000000000000000', name: 'general', type: 0, guild_id: '1100000000000000000' },
    { id: '1200000000000000001', name: 'Stage', type: 13, guild_id: '1100000000000000000' },
    { id: '1200000000000000002', name: 'announcements', type: 5, guild_id: '1100000000000000000' },
    { id: '1200000000000000003', name: 'help-forum', type: 15, guild_id: '1100000000000000000' },
    { id: '1200000000000000004', name: 'staff', type: 0, guild_id: '1100000000000000000', can_view: false },
    { id: '1200000000000000005', name: 'off-topic', type: 0, guild_id: '1100000000000000099' },
  ],
  guilds: [
    { id: '1100000000000000000', name: 'Wumpus World' },
    { id: '1100000000000000099', name: 'Another Server', icon: null },
  ],
  commands: [{ id: '1300000000000000077', name: 'ping', description: 'Pong!' }],
};

const GALLERY: [title: string, source: string][] = [
  [
    'Text styles',
    '*italics* _italics_ **bold** __underline__ ~~strikethrough~~ ***bold italics*** __*underline italics*__',
  ],
  ['Spoilers', 'Shh... ||this is a spoiler|| and ||**bold** spoiler||'],
  ['Inline code', 'Use `inline code` or ``code with ` backticks``'],
  ['Code blocks', '```js\nconst answer = 42;\nconsole.log(`answer: ${answer}`);\n```\n```\nplain code block\n```'],
  ['ANSI', '```ansi\n\u001b[1;31mred bold\u001b[0m and \u001b[4;34mblue underline\u001b[0m\n```'],
  ['Headings', '# Heading 1\n## Heading 2\n### Heading 3'],
  ['Subtext', '-# This is subtext'],
  ['Lists', '- one\n- two\n  - nested\n1. first\n2. second'],
  ['Block quotes', '> single line quote\ntext after\n>>> multi\nline\nquote'],
  ['Links', 'https://discord.com <https://example.com> [masked link](https://example.com "with a title")'],
  [
    'Mentions',
    '<@1000000000000000001> <@1000000000000000002> <@1000000000000000999> <@&1100000000000000010> <@&1100000000000000011> @everyone @here',
  ],
  [
    'Channels',
    '<#1200000000000000000> <#1200000000000000001> <#1200000000000000004> <#1200000000000000005> <#1299999999999999999>',
  ],
  ['Channel links', 'https://discord.com/channels/1100000000000000000/1200000000000000000/1300000000000000001'],
  ['Slash commands', '</ping:1300000000000000077> </unknown command:1300000000000000078>'],
  ['Emoji', ':smile: :thumbsup::skin-tone-3: \u{1F389} <:custom:1000000000000000099> \xaf\\_(\u30c4)_/\xaf'],
  ['Emoji only (jumbo)', '\u{1F389}\u{1F389} :smile:'],
  [
    'Timestamps',
    '<t:1764158400:t> <t:1764158400:T> <t:1764158400:d> <t:1764158400:D> <t:1764158400> <t:1764158400:F> <t:1764158400:R>',
  ],
  ['Server navigation', '<id:home> <id:browse> <id:customize> <id:guide> <id:linked-roles>'],
  ['Silent prefix', '@silent sending quietly'],
  ['Escapes', '\\*not italics\\* \\`not code\\` \\||not a spoiler\\||'],
];

const Gallery = () => {
  const resolvers = useMemo(() => createFixtureResolvers(SAMPLE), []);
  return (
    <MessageResolversContext.Provider value={resolvers}>
      <div style={{ display: 'grid', gap: 16 }}>
        {GALLERY.map(([title, source], index) => {
          const message = messageFor(source, index);
          return (
            <section key={title}>
              <h3
                style={{
                  color: 'var(--text-strong)',
                  font: 'var(--font-weight-semibold) 14px var(--font-primary)',
                  margin: '0 0 4px',
                }}
              >
                {title}
              </h3>
              <pre style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 4px', whiteSpace: 'pre-wrap' }}>
                {source}
              </pre>
              <MessageContent
                message={message}
                content={
                  <Markdown content={source} context={{ channelId: message.channel_id, messageId: message.id }} />
                }
              />
            </section>
          );
        })}
      </div>
    </MessageResolversContext.Provider>
  );
};

Gallery.displayName = 'Gallery';

const DEFAULT_SOURCE = [
  '# Discord markdown',
  'Hey <@1000000000000000001>, **bold**, *italics*, __underline__, ~~strike~~ and ||spoilers||.',
  '> Quotes, `inline code` and <t:1764158400:R> timestamps',
  '- lists',
  '- with <#1200000000000000000> mentions :tada:',
  '```py',
  'print("syntax highlighting")',
  '```',
  '-# subtext',
].join('\n');

type EditorProps = { preset: MarkdownPreset } & Partial<Record<`rule_${MarkdownRuleName}`, boolean>>;

const Editor = ({ preset, ...ruleProps }: EditorProps) => {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const resolvers = useMemo(() => createFixtureResolvers(SAMPLE), []);
  const toggles: Partial<Record<MarkdownRuleName, boolean>> = {};
  for (const name of MARKDOWN_RULE_NAMES) if (ruleProps[`rule_${name}`] === false) toggles[name] = false;
  const message = messageFor(source, 0);
  return (
    <MessageResolversContext.Provider value={resolvers}>
      <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
        <TextArea value={source} onChange={setSource} rows={10} />
        <MessageContent
          message={message}
          content={
            <Markdown
              content={source}
              preset={preset}
              rules={toggles}
              context={{ channelId: message.channel_id, messageId: message.id }}
            />
          }
        />
      </div>
    </MessageResolversContext.Provider>
  );
};

Editor.displayName = 'Editor';

const ruleControls: Controls = Object.fromEntries(
  MARKDOWN_RULE_NAMES.filter((name) => name !== 'text').map((name) => [
    `rule_${name}`,
    { label: name, type: 'boolean', defaultValue: true },
  ]),
);

const markdown: StoryGroup = {
  title: 'Markdown',
  stories: [
    {
      name: 'Editor',
      id: 'markdown-editor',
      component: Editor,
      docs: 'Type markdown and see it rendered like Discord; turn rules off on the right.',
      controls: {
        preset: {
          label: 'Context',
          type: 'select',
          defaultValue: 'message',
          options: Object.keys(MARKDOWN_PRESETS).map((value) => ({ label: value, value })),
        },
        ...ruleControls,
      },
    },
    { name: 'Gallery', id: 'markdown-gallery', component: Gallery },
    {
      name: 'Fixtures',
      id: 'markdown-fixtures',
      component: MarkdownFixture,
      docs: 'The cases scripts/compare-messages.mjs and scripts/compare-markdown-ast.mjs render with Discord’s parser.',
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

export default markdown;
