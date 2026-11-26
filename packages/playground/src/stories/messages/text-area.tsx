import { useMemo, useState } from 'react';
import { Text } from '@discord-mana/components';
import { ChannelTextArea, ChatInputTypes, type ChatInputTypeName } from '@discord-mana/slate';
import type { Controls, StoryGroup } from '../../types';
import { SAMPLE_EDITOR_DATA, createEditorResolvers } from './text-area-data';

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
  ],
};

export default group;
