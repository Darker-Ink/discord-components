import { useCallback, useMemo, useRef, useState } from 'react';
import { Text } from '@discord-mana/components';
import { renderEmbedMarkdown } from '@discord-mana/markdown';
import {
  MessageEmbeds,
  MessageResolversContext,
  type APIEmbed,
  type EmbedMarkdownContext,
} from '@discord-mana/messages';
import { EditorResolversContext, InlineEditor, type InlineEditorRuleSet } from '@discord-mana/slate';
import type { Controls, StoryGroup } from '../../types';
import { SAMPLE_EDITOR_DATA, createEditorResolvers } from './text-area-data';

// An embed whose title, description and fields are edited where they render: the embed's own elements hold
// an InlineEditor each, so the text keeps the embed's typography and saves without a confirm button.

const INITIAL_EMBED: APIEmbed = {
  type: 'rich',
  title: 'Weekly **update**',
  description:
    'Hey <@1000000000000000001>! Here is what changed this week in <#1200000000000000001>.\n\n> Highlights below :tada:',
  color: 0x5865f2,
  fields: [
    { name: 'New', value: 'Inline editing for `embeds`', inline: true },
    { name: 'Fixed', value: '~~Bugs~~ features', inline: true },
    { name: 'Coming up', value: '||A surprise||', inline: false },
  ],
  footer: { text: 'Edited in place' },
};

// Embed titles and field names don't take mentions or code blocks; descriptions and values take everything.
const RULES_BY_KIND: Record<EmbedMarkdownContext['kind'], InlineEditorRuleSet> = {
  title: 'EMBED_TITLE_RULES',
  description: 'RULES',
  'field-value': 'RULES',
};

const controls: Controls = {
  previewMarkdown: { type: 'boolean', label: 'Style markdown while typing', defaultValue: true },
  showPreview: { type: 'boolean', label: 'Show rendered markdown until focused', defaultValue: true },
  saveDelay: { type: 'number', label: 'Save after (ms) of no typing', defaultValue: 500 },
};

interface InlineEmbedEditorProps {
  previewMarkdown: boolean;
  showPreview: boolean;
  saveDelay: number;
}

interface Target {
  key: 'title' | 'description' | 'name' | 'value';
  index: number;
}

const InlineEmbedEditor = ({ previewMarkdown, showPreview, saveDelay }: InlineEmbedEditorProps) => {
  const resolvers = useMemo(() => createEditorResolvers(SAMPLE_EDITOR_DATA), []);
  const context = useMemo(
    () => ({ guildId: SAMPLE_EDITOR_DATA.guild_id, channelId: SAMPLE_EDITOR_DATA.channel_id, resolvers }),
    [resolvers],
  );
  const [embed, setEmbed] = useState(INITIAL_EMBED);
  // Edits collect here and reach the rendered embed on blur: re-rendering MessageEmbeds remounts the embed (the
  // client gives each converted embed a new id), which would end the edit in progress.
  const draft = useRef(INITIAL_EMBED);
  const embeds = useMemo(() => [embed], [embed]);
  const [saves, setSaves] = useState<string[]>([]);

  const update = useCallback((target: Target, text: string) => {
    const current = draft.current;
    if (target.key === 'title' || target.key === 'description') draft.current = { ...current, [target.key]: text };
    else {
      const fields = [...(current.fields ?? [])];
      fields[target.index] = { ...fields[target.index], [target.key]: text };
      draft.current = { ...current, fields };
    }
  }, []);

  // MessageEmbeds asks for each text by kind; find which part of the embed it is.
  const renderMarkdown = (text: string, markdownContext: EmbedMarkdownContext) => {
    const fields = embed.fields ?? [];
    let target: Target;
    if (markdownContext.kind === 'description') target = { key: 'description', index: -1 };
    else if (markdownContext.kind === 'field-value')
      target = { key: 'value', index: fields.findIndex((f) => f.value === text) };
    else if (text === embed.title) target = { key: 'title', index: -1 };
    else target = { key: 'name', index: fields.findIndex((f) => f.name === text) };
    const label =
      target.key === 'name' || target.key === 'value' ? `field ${target.index + 1} ${target.key}` : target.key;
    return (
      <InlineEditor
        key={label}
        as="span"
        value={text}
        multiline={markdownContext.kind !== 'title'}
        rules={RULES_BY_KIND[markdownContext.kind]}
        placeholder={`Add a ${label}`}
        previewMarkdown={previewMarkdown}
        saveDelay={saveDelay}
        renderPreview={showPreview ? (value) => renderEmbedMarkdown(value, markdownContext) : undefined}
        onChange={(value) => update(target, value)}
        onBlur={() => setEmbed(draft.current)}
        onSave={(value) => setSaves((previous) => [...previous.slice(-4), `${label}: ${JSON.stringify(value)}`])}
        aria-label={`Embed ${label}`}
      />
    );
  };

  return (
    <EditorResolversContext.Provider value={context}>
      <MessageResolversContext.Provider value={resolvers}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 520 }}>
          <MessageEmbeds embeds={embeds} renderMarkdown={renderMarkdown} />
          <Text variant="body-sm/semibold" color="text-muted">
            Saved
          </Text>
          {saves.map((save, index) => (
            <Text key={index} variant="mono-md/normal" color="text-muted">
              {save}
            </Text>
          ))}
        </div>
      </MessageResolversContext.Provider>
    </EditorResolversContext.Provider>
  );
};

InlineEmbedEditor.displayName = 'InlineEmbedEditor';

const fieldControls: Controls = {
  multiline: { type: 'boolean', label: 'Multi-line', defaultValue: false },
  placeholder: { type: 'text', label: 'Placeholder', defaultValue: 'Click to add a title' },
  maxLength: { type: 'number', label: 'Max length', defaultValue: 256 },
};

const InlineFieldStory = ({
  multiline,
  placeholder,
  maxLength,
}: {
  multiline: boolean;
  placeholder: string;
  maxLength: number;
}) => {
  const resolvers = useMemo(() => createEditorResolvers(SAMPLE_EDITOR_DATA), []);
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 480 }}>
      <Text variant="heading-xl/semibold" tag="div">
        <InlineEditor
          value={value}
          onChange={setValue}
          onSave={setSaved}
          multiline={multiline}
          placeholder={placeholder}
          maxLength={maxLength}
          resolvers={resolvers}
          guildId={SAMPLE_EDITOR_DATA.guild_id}
        />
      </Text>
      <Text variant="mono-md/normal" color="text-muted">
        value: {JSON.stringify(value)}
      </Text>
      <Text variant="mono-md/normal" color="text-muted">
        saved: {JSON.stringify(saved)}
      </Text>
    </div>
  );
};

InlineFieldStory.displayName = 'InlineFieldStory';

const group: StoryGroup = {
  title: 'Inline Editor',
  stories: [
    {
      name: 'Embed Edited In Place',
      id: 'inline-editor-embed',
      component: InlineEmbedEditor,
      controls,
      docs: 'Click the title, description or a field: it becomes editable where it is, in the embed’s own typography, and saves on its own (after a pause and on blur; Enter saves single-line titles).',
    },
    {
      name: 'Inline Field',
      id: 'inline-editor-field',
      component: InlineFieldStory,
      controls: fieldControls,
      docs: 'An InlineEditor inside a heading: no border, background or buttons; the text takes the heading’s style.',
    },
  ],
};

export default group;
