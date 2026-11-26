import { useMemo, useState, type ReactNode } from 'react';
import {
  BuilderCanvas,
  BuilderChannel,
  BuilderHistoryButtons,
  BuilderModeSwitch,
  BuilderPanels,
  BuilderProvider,
  ComponentPalette,
  EditableEmbed,
  JsonPanel,
  MessageBuilder,
  ValidationPanel,
  WebhookPanel,
  toPreviewMessage,
  useMessageBuilder,
  prepareComponents,
  prepareEmbed,
  useMediaSizes,
  type BuilderMode,
  type WebhookMessagePayload,
} from '@discord-mana/builders';
import { renderEmbedMarkdown, renderMessageMarkdown } from '@discord-mana/markdown';
import {
  MediaViewerProvider,
  Message,
  MessageListItem,
  type APIMessage,
  type MessageResolvers,
} from '@discord-mana/messages';
import type { Controls, StoryGroup } from '../../types';

// The editable message builder (@discord-mana/builders). Unselected, the canvas renders exactly like
// <Message> renders the same JSON; the "Parity" story shows both for comparison.

const ASSETS = `${window.location.origin}/messages`;

const AUTHOR = { id: '1300000000000000001', username: 'Captain Hook', avatarUrl: `${ASSETS}/avatar.png` };

const RESOLVERS: MessageResolvers = { getAvatarURL: (user) => user.avatar_url ?? null };

export const CLASSIC_SAMPLE: WebhookMessagePayload = {
  content: 'Patch notes are out! Here’s what changed this week.',
  embeds: [
    {
      title: 'Release 2.4',
      url: 'https://discord-mana.dev',
      description: 'Inline editing for **everything**, drag and drop, and _complete_ validation.',
      color: 0x5865f2,
      author: { name: 'discord-mana', icon_url: `${ASSETS}/icon.png` },
      fields: [
        { name: 'New', value: 'The message builder', inline: true },
        { name: 'Fixed', value: '~~Bugs~~ features', inline: true },
        { name: 'Next', value: 'Polls and attachments', inline: true },
      ],
      thumbnail: { url: `${ASSETS}/thumbnail.png` },
      footer: { text: 'discord-mana builder' },
      timestamp: '2026-11-26T12:00:00.000Z',
    },
    {
      title: 'Known issues',
      description: 'None we know of. Tell us on GitHub.',
      color: 0xed4245,
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Read more', custom_id: 'read-more' },
        { type: 2, style: 5, label: 'GitHub', url: 'https://github.com/Darker-Ink/discord-components' },
      ],
    },
  ],
};

export const CV2_SAMPLE: WebhookMessagePayload = {
  flags: 1 << 15,
  components: [
    {
      type: 17,
      accent_color: 0x5865f2,
      components: [
        { type: 10, content: '# Release 2.4\nInline editing, drag and drop, and complete validation.' },
        {
          type: 9,
          components: [{ type: 10, content: '**The builder** renders every component exactly like Discord.' }],
          accessory: { type: 11, media: { url: `${ASSETS}/square.png` } },
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 12,
          items: [{ media: { url: `${ASSETS}/landscape.png` } }, { media: { url: `${ASSETS}/portrait.png` } }],
        },
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: 'Try it', custom_id: 'try' },
            { type: 2, style: 5, label: 'Docs', url: 'https://discord-mana.dev' },
          ],
        },
      ],
    },
  ],
};

const SAMPLES: Record<string, WebhookMessagePayload> = { classic: CLASSIC_SAMPLE, cv2: CV2_SAMPLE };

const sampleControl = {
  type: 'select' as const,
  label: 'Message',
  defaultValue: 'classic',
  options: [
    { label: 'Classic (embeds)', value: 'classic' },
    { label: 'Components v2', value: 'cv2' },
  ],
};

const Frame = ({ children, height = 720 }: { children: ReactNode; height?: number }) => (
  <MediaViewerProvider>
    <div style={{ height, width: '100%', display: 'flex', minWidth: 0 }}>{children}</div>
  </MediaViewerProvider>
);

const MessageBuilderStory = ({
  sample,
  readOnly,
  hidePalette,
}: {
  sample: string;
  readOnly: boolean;
  hidePalette: boolean;
}) => (
  <Frame>
    <div style={{ flex: 1, minWidth: 0 }}>
      <MessageBuilder
        key={sample}
        defaultValue={SAMPLES[sample]}
        resolvers={RESOLVERS}
        author={AUTHOR}
        readOnly={readOnly}
        hidePalette={hidePalette}
      />
    </div>
  </Frame>
);

MessageBuilderStory.displayName = 'MessageBuilderStory';

/** The pieces laid out by hand, around one builder: they wrap to the width they get. */
const ComposedStory = ({ sample }: { sample: string }) => {
  const builder = useMessageBuilder(SAMPLES[sample]);
  return (
    <MediaViewerProvider>
      <BuilderProvider builder={builder} resolvers={RESOLVERS}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, width: '100%', minWidth: 0 }}>
          <div style={{ flex: '0 1 200px', minWidth: 0 }}>
            <ComponentPalette />
          </div>
          <div style={{ flex: '1 1 520px', minWidth: 0, height: 600, display: 'grid' }}>
            <BuilderChannel
              actions={
                <>
                  <BuilderModeSwitch />
                  <BuilderHistoryButtons />
                </>
              }
            >
              <BuilderCanvas author={AUTHOR} />
            </BuilderChannel>
          </div>
          <div style={{ flex: '0 1 340px', minWidth: 280 }}>
            <BuilderPanels />
          </div>
        </div>
      </BuilderProvider>
    </MediaViewerProvider>
  );
};

ComposedStory.displayName = 'ComposedStory';

const CanvasStory = ({ sample, readOnly }: { sample: string; readOnly: boolean }) => (
  <MediaViewerProvider>
    <BuilderProvider key={sample} defaultValue={SAMPLES[sample]} resolvers={RESOLVERS} readOnly={readOnly}>
      <div style={{ width: 640 }}>
        <BuilderCanvas author={AUTHOR} timestamp="2026-11-26T12:00:00.000Z" />
      </div>
    </BuilderProvider>
  </MediaViewerProvider>
);

CanvasStory.displayName = 'CanvasStory';

const EmbedFromStore = () => {
  const builder = useMessageBuilder(CLASSIC_SAMPLE);
  return (
    <BuilderProvider builder={builder}>
      <div style={{ width: 520 }}>
        <EditableEmbed uid={builder.doc.embeds[0].uid} />
      </div>
    </BuilderProvider>
  );
};

EmbedFromStore.displayName = 'EmbedFromStore';

const PanelStory = ({ panel, sample }: { panel: string; sample: string }) => (
  <BuilderProvider key={sample} defaultValue={SAMPLES[sample]}>
    <div style={{ width: 380, height: 560, display: 'flex', flexDirection: 'column' }}>
      {panel === 'issues' ? <ValidationPanel /> : panel === 'json' ? <JsonPanel /> : <WebhookPanel />}
    </div>
  </BuilderProvider>
);

PanelStory.displayName = 'PanelStory';

const PaletteStory = ({ mode }: { mode: BuilderMode }) => (
  <BuilderProvider key={mode} defaultValue={mode === 'cv2' ? CV2_SAMPLE : CLASSIC_SAMPLE}>
    <div style={{ width: 220 }}>
      <ComponentPalette />
    </div>
  </BuilderProvider>
);

PaletteStory.displayName = 'PaletteStory';

// What Discord returns for a sent payload: sized media and proxied icons (the builder does the same to draw).
const preparePreview = (message: APIMessage): APIMessage => ({
  ...message,
  embeds: (message.embeds ?? []).map(prepareEmbed),
  components: prepareComponents(message.components ?? []),
});

/**
 * The same JSON drawn twice: by the builder (nothing selected) and by `<Message>`. They should be identical
 * (scripts/builder-e2e.mjs compares them pixel by pixel).
 */
const PARITY_VALIDATION = { applicationOwnedWebhook: true };

const parsePayload = (text: string) => {
  try {
    return JSON.parse(text) as WebhookMessagePayload;
  } catch {
    return null;
  }
};

const ParityStory = ({ sample, side, payload }: { sample: string; side: string; payload: string }) => {
  const [timestamp] = useState('2026-11-26T12:00:00.000Z');
  // Interactive buttons are fine here: the parity check is about drawing, not about the webhook's owner.
  const builder = useMessageBuilder({
    defaultValue: (payload !== '' ? parsePayload(payload) : null) ?? SAMPLES[sample],
    validation: PARITY_VALIDATION,
  });
  const sizes = useMediaSizes();
  const message = useMemo(
    () =>
      preparePreview(toPreviewMessage(builder.doc, { author: AUTHOR, timestamp, channelId: '1300000000000000003' })),
    // `sizes` changes when an image's size becomes known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builder.doc, timestamp, sizes],
  );
  return (
    <MediaViewerProvider>
      <div style={{ width: 640 }} data-parity-side={side}>
        {side === 'builder' ? (
          <BuilderProvider builder={builder} resolvers={RESOLVERS}>
            <BuilderCanvas author={AUTHOR} timestamp={timestamp} />
          </BuilderProvider>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <MessageListItem message={message}>
              <Message
                message={message}
                resolvers={RESOLVERS}
                renderMarkdown={renderMessageMarkdown}
                renderEmbedMarkdown={renderEmbedMarkdown}
              />
            </MessageListItem>
          </ol>
        )}
      </div>
    </MediaViewerProvider>
  );
};

ParityStory.displayName = 'ParityStory';

const controls: Controls = { sample: sampleControl };

const builder: StoryGroup = {
  title: 'Builder',
  stories: [
    {
      name: 'MessageBuilder',
      id: 'builder-message-builder',
      component: MessageBuilderStory,
      controls: {
        sample: sampleControl,
        readOnly: { type: 'boolean', label: 'Read only', defaultValue: false },
        hidePalette: { type: 'boolean', label: 'Hide palette', defaultValue: false },
      },
    },
    { name: 'Composed pieces', id: 'builder-composed', component: ComposedStory, controls },
    {
      name: 'BuilderCanvas',
      id: 'builder-canvas',
      component: CanvasStory,
      controls: { ...controls, readOnly: { type: 'boolean', label: 'Read only', defaultValue: false } },
    },
    { name: 'EditableEmbed', id: 'builder-editable-embed', component: EmbedFromStore },
    {
      name: 'ComponentPalette',
      id: 'builder-palette',
      component: PaletteStory,
      controls: {
        mode: {
          type: 'select',
          label: 'Mode',
          defaultValue: 'classic',
          options: [
            { label: 'Classic', value: 'classic' },
            { label: 'Components v2', value: 'cv2' },
          ],
        },
      },
    },
    {
      name: 'Panels',
      id: 'builder-panels',
      component: PanelStory,
      controls: {
        panel: {
          type: 'select',
          label: 'Panel',
          defaultValue: 'issues',
          options: [
            { label: 'ValidationPanel', value: 'issues' },
            { label: 'JsonPanel', value: 'json' },
            { label: 'WebhookPanel', value: 'send' },
          ],
        },
        sample: sampleControl,
      },
    },
    {
      name: 'Parity',
      id: 'builder-parity',
      component: ParityStory,
      controls: {
        sample: sampleControl,
        side: {
          type: 'select',
          label: 'Rendered by',
          defaultValue: 'builder',
          options: [
            { label: 'Builder (nothing selected)', value: 'builder' },
            { label: '<Message>', value: 'reference' },
          ],
        },
        payload: { type: 'text', label: 'Payload JSON (replaces the sample)', defaultValue: '' },
      },
    },
  ],
};

export default builder;
