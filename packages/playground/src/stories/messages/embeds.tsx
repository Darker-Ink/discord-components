import { MessageEmbeds, type APIEmbed, type EmbedMessage, type MessageEmbedsProps } from '@discord-components/messages';
import type { StoryGroup } from '../../types';

// Fixtures shared with scripts/compare-messages.mjs; "{{assets}}" is the playground's /messages folder.
const fixtureFiles = import.meta.glob<{ story: string; data: EmbedFixtureData }>(
  '../../../../../scripts/fixtures/embeds/*.json',
  { eager: true, import: 'default' },
);

interface EmbedFixtureData {
  embeds: APIEmbed[];
  message?: EmbedMessage;
  props?: Partial<MessageEmbedsProps> & { canSuppressEmbeds?: boolean };
}

const ASSETS = `${window.location.origin}/messages`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles).map(([file, fixture]) => [
    `embeds/${file
      .split('/')
      .pop()!
      .replace(/\.json$/, '')}`,
    withAssets(fixture.data),
  ]),
);

const DEFAULT_MESSAGE: EmbedMessage = { id: '1300000000000000000', channel_id: '1200000000000000000' };

const EmbedFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  if (data == null) return null;
  const { canSuppressEmbeds, ...props } = data.props ?? {};
  return (
    <MessageEmbeds
      embeds={data.embeds}
      message={data.message ?? DEFAULT_MESSAGE}
      autoPlayGif={false}
      onSuppressEmbeds={canSuppressEmbeds ? () => {} : undefined}
      {...props}
    />
  );
};

EmbedFixture.displayName = 'EmbedFixture';

const embeds: StoryGroup = {
  title: 'Embeds',
  stories: [
    {
      name: 'Fixtures',
      id: 'embed-fixtures',
      component: EmbedFixture,
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

export default embeds;
