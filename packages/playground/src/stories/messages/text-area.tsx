import { useMemo, useState } from 'react';
import { Text } from '@discord-mana/components';
import { ChannelTextArea, ChatInputTypes, type ChatInputTypeName } from '@discord-mana/slate';
import type { Controls, StoryGroup } from '../../types';
import { SAMPLE_EDITOR_DATA, createEditorResolvers, type EditorFixtureData } from './text-area-data';

// Fixtures shared with scripts/compare-slate.mjs: the same data renders Discord's chat input there.
interface SlateFixture {
  sample?: boolean;
  data: EditorFixtureData & {
    type?: ChatInputTypeName;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    maxCharacterCount?: number;
  };
}

const fixtureFiles = import.meta.glob<SlateFixture>('../../../../../scripts/fixtures/slate/*.json', {
  eager: true,
  import: 'default',
});

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));
const fileName = (file: string) =>
  file
    .split('/')
    .pop()!
    .replace(/\.json$/, '');
const sample = Object.entries(fixtureFiles).find(([file]) => fileName(file) === '_sample')?.[1] as unknown as
  EditorFixtureData | undefined;

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles)
    .filter(([file]) => !fileName(file).startsWith('_'))
    .map(
      ([file, fixture]) =>
        [`slate/${fileName(file)}`, withAssets({ ...(fixture.sample ? sample : null), ...fixture.data })] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b)),
) as Record<string, SlateFixture['data']>;

declare global {
  interface Window {
    __slateValue?: string;
  }
}

const TextAreaFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  const resolvers = useMemo(() => createEditorResolvers(data ?? {}), [data]);
  if (data == null) return null;
  window.__slateValue ??= data.value ?? '';
  return (
    <div style={{ width: 640 }}>
      <ChannelTextArea
        type={data.type ?? 'NORMAL'}
        defaultValue={data.value ?? ''}
        onChange={(value) => {
          window.__slateValue = value;
        }}
        onSubmit={() => ({ shouldClear: true, shouldRefocus: true })}
        guildId={data.guild_id}
        channelId={data.channel_id}
        resolvers={resolvers}
        placeholder={data.placeholder ?? 'Message #general'}
        accessibilityLabel={data.placeholder ?? 'Message #general'}
        disabled={data.disabled ?? false}
        maxCharacterCount={data.maxCharacterCount}
      />
    </div>
  );
};

TextAreaFixture.displayName = 'TextAreaFixture';

const TYPE_OPTIONS = (Object.keys(ChatInputTypes) as ChatInputTypeName[]).map((name) => ({ label: name, value: name }));

const controls: Controls = {
  type: { type: 'select', label: 'Input type', defaultValue: 'NORMAL', options: TYPE_OPTIONS },
  placeholder: { type: 'text', label: 'Placeholder', defaultValue: 'Message #general' },
  value: { type: 'text', label: 'Initial value', defaultValue: '' },
  disabled: { type: 'boolean', label: 'Disabled', defaultValue: false },
  previewMarkdown: { type: 'boolean', label: 'Preview markdown while typing', defaultValue: true },
  maxCharacterCount: { type: 'number', label: 'Max length', defaultValue: 2000 },
  highlighted: { type: 'boolean', label: 'Highlighted', defaultValue: false },
};

interface ChatInputStoryProps {
  type: ChatInputTypeName;
  placeholder: string;
  value: string;
  disabled: boolean;
  previewMarkdown: boolean;
  maxCharacterCount: number;
  highlighted: boolean;
}

const ChatInputStory = ({
  type,
  placeholder,
  value,
  disabled,
  previewMarkdown,
  maxCharacterCount,
  highlighted,
}: ChatInputStoryProps) => {
  const resolvers = useMemo(() => createEditorResolvers(SAMPLE_EDITOR_DATA), []);
  const [text, setText] = useState(value);
  const [sent, setSent] = useState<string[]>([]);
  return (
    <div style={{ width: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChannelTextArea
        key={value}
        type={type}
        defaultValue={value}
        onChange={setText}
        onSubmit={(message) => setSent((previous) => [...previous, message])}
        guildId={SAMPLE_EDITOR_DATA.guild_id}
        channelId={SAMPLE_EDITOR_DATA.channel_id}
        resolvers={resolvers}
        placeholder={placeholder}
        disabled={disabled}
        previewMarkdown={previewMarkdown}
        maxCharacterCount={maxCharacterCount}
        highlighted={highlighted}
      />
      <Text variant="mono-md/normal" color="text-muted">
        {JSON.stringify(text)}
      </Text>
      {sent.map((message, index) => (
        <Text key={index} variant="mono-md/normal">
          sent: {JSON.stringify(message)}
        </Text>
      ))}
    </div>
  );
};

ChatInputStory.displayName = 'ChatInputStory';

const group: StoryGroup = {
  title: 'Text Area',
  stories: [
    {
      name: 'Chat Input',
      id: 'chat-input',
      component: ChatInputStory,
      controls,
      docs: 'The chat bar: type markdown, @mentions, #channels and :emoji:. The value is message text (`<@id>`, `<:name:id>`).',
    },
    {
      name: 'Chat Input Fixtures',
      id: 'text-area-fixtures',
      component: TextAreaFixture,
      controls: {
        fixture: {
          type: 'select',
          label: 'Fixture',
          defaultValue: Object.keys(fixtures)[0],
          options: Object.keys(fixtures).map((name) => ({ label: name, value: name })),
        },
      },
      docs: "The fixtures scripts/compare-slate.mjs types into, next to Discord's chat input.",
    },
  ],
};

export default group;
