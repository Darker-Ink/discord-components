import {
  MediaViewerProvider,
  MessageEmbeds,
  type APIEmbed,
  type EmbedMessage,
  type ObscureReason,
} from '@discord-mana/messages';
import type { StoryGroup } from '../../types';

// Fixtures shared with scripts/compare-messages.mjs; "{{assets}}" is the playground's /messages folder.
const fixtureFiles = import.meta.glob<{ story: string; data: EmbedFixtureData }>(
  '../../../../../scripts/fixtures/embeds/*.json',
  { eager: true, import: 'default' },
);

interface EmbedFixtureData {
  embeds: APIEmbed[];
  message?: EmbedMessage;
  // Mirrors the Embed props the reference renderer passes (scripts/fixtures/embeds/reference.js).
  props?: {
    obscureReason?: ObscureReason;
    autoPlayGif?: boolean;
    hideMedia?: boolean;
    canSuppressEmbeds?: boolean;
    shouldAgeVerify?: boolean;
  };
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
  const {
    obscureReason,
    autoPlayGif = false,
    hideMedia = false,
    canSuppressEmbeds,
    shouldAgeVerify,
  } = data.props ?? {};
  return (
    <MessageEmbeds
      embeds={data.embeds}
      message={data.message ?? DEFAULT_MESSAGE}
      autoPlayGif={autoPlayGif}
      inlineEmbedMedia={!hideMedia}
      getObscureReason={() => obscureReason}
      onSuppressEmbeds={canSuppressEmbeds ? () => {} : undefined}
      shouldAgeVerify={shouldAgeVerify}
    />
  );
};

EmbedFixture.displayName = 'EmbedFixture';

const media = (name: string, width: number, height: number, description?: string) => ({
  url: `${ASSETS}/${name}.png`,
  proxy_url: `${ASSETS}/${name}.png`,
  width,
  height,
  ...(description ? { description } : {}),
});

const IMAGES = {
  landscape: media('landscape', 1280, 720),
  portrait: media('portrait', 600, 900),
  square: media('square', 512, 512),
  wide: media('wide', 1600, 400),
  small: media('small', 240, 160),
};

type ImageName = keyof typeof IMAGES;

const imageOptions = Object.keys(IMAGES).map((name) => ({ label: name, value: name }));

const hexToInt = (hex: string) => parseInt(hex.replace('#', ''), 16);

interface SharedProps {
  autoPlayGif: boolean;
  inlineEmbedMedia: boolean;
  spoiler: boolean;
  canSuppressEmbeds: boolean;
}

const Embeds = ({
  embeds,
  autoPlayGif,
  inlineEmbedMedia,
  spoiler,
  canSuppressEmbeds,
}: SharedProps & { embeds: APIEmbed[] }) => (
  // Clicking an image opens the media viewer.
  <MediaViewerProvider>
    <MessageEmbeds
      embeds={embeds}
      message={DEFAULT_MESSAGE}
      autoPlayGif={autoPlayGif}
      inlineEmbedMedia={inlineEmbedMedia}
      hasSpoilerEmbeds={spoiler}
      onSuppressEmbeds={canSuppressEmbeds ? () => {} : undefined}
    />
  </MediaViewerProvider>
);

Embeds.displayName = 'Embeds';

const sharedControls = {
  inlineEmbedMedia: {
    label: 'Show embed media',
    hint: 'The "show embeds and preview website links" setting',
    type: 'boolean',
    defaultValue: true,
  },
  autoPlayGif: { label: 'Autoplay GIFs', type: 'boolean', defaultValue: true },
  spoiler: { label: 'Spoiler', hint: 'The message content spoilers the link', type: 'boolean', defaultValue: false },
  canSuppressEmbeds: { label: 'Can remove embeds', type: 'boolean', defaultValue: false },
} as const;

interface RichEmbedProps extends SharedProps {
  title: string;
  url: string;
  description: string;
  color: string;
  useColor: boolean;
  authorName: string;
  authorIcon: boolean;
  providerName: string;
  fieldCount: number;
  inlineFields: boolean;
  thumbnail: boolean;
  image: ImageName | 'none';
  footerText: string;
  footerIcon: boolean;
  timestamp: boolean;
}

const RichEmbed = ({
  title,
  url,
  description,
  color,
  useColor,
  authorName,
  authorIcon,
  providerName,
  fieldCount,
  inlineFields,
  thumbnail,
  image,
  footerText,
  footerIcon,
  timestamp,
  ...shared
}: RichEmbedProps) => {
  const embed: APIEmbed = {
    type: 'rich',
    title: title || undefined,
    url: url || undefined,
    description: description || undefined,
    color: useColor ? hexToInt(color) : undefined,
    provider: providerName ? { name: providerName } : undefined,
    author: authorName
      ? {
          name: authorName,
          url: url || undefined,
          ...(authorIcon ? { icon_url: `${ASSETS}/avatar.png`, proxy_icon_url: `${ASSETS}/avatar.png` } : {}),
        }
      : undefined,
    fields: Array.from({ length: fieldCount }, (_, index) => ({
      name: `Field ${index + 1}`,
      value: `Value ${index + 1}`,
      inline: inlineFields,
    })),
    thumbnail: thumbnail ? media('thumbnail', 160, 160) : undefined,
    image: image !== 'none' ? IMAGES[image] : undefined,
    footer:
      footerText || footerIcon
        ? {
            text: footerText,
            ...(footerIcon ? { icon_url: `${ASSETS}/icon.png`, proxy_icon_url: `${ASSETS}/icon.png` } : {}),
          }
        : undefined,
    timestamp: timestamp ? new Date().toISOString() : undefined,
  };
  return <Embeds embeds={[embed]} {...shared} />;
};

RichEmbed.displayName = 'RichEmbed';

interface LinkEmbedProps extends SharedProps {
  type: 'link' | 'article';
  title: string;
  description: string;
  providerName: string;
  thumbnail: ImageName | 'none';
}

const LinkEmbed = ({ type, title, description, providerName, thumbnail, ...shared }: LinkEmbedProps) => (
  <Embeds
    embeds={[
      {
        type,
        url: 'https://example.com/article',
        title: title || undefined,
        description: description || undefined,
        provider: providerName ? { name: providerName, url: 'https://example.com' } : undefined,
        thumbnail: thumbnail !== 'none' ? IMAGES[thumbnail] : undefined,
      },
    ]}
    {...shared}
  />
);

LinkEmbed.displayName = 'LinkEmbed';

const ImageEmbed = ({ image, ...shared }: SharedProps & { image: ImageName }) => (
  <Embeds embeds={[{ type: 'image', url: IMAGES[image].url, thumbnail: IMAGES[image] }]} {...shared} />
);

ImageEmbed.displayName = 'ImageEmbed';

const GIFVEmbed = (shared: SharedProps) => (
  <Embeds
    embeds={[
      {
        type: 'gifv',
        url: 'https://tenor.com/view/example-gif-1234',
        provider: { name: 'Tenor', url: 'https://tenor.co' },
        thumbnail: media('gifv-poster', 480, 270),
        video: { url: `${ASSETS}/gifv.mp4`, proxy_url: `${ASSETS}/gifv.mp4`, width: 480, height: 270 },
      },
    ]}
    {...shared}
  />
);

GIFVEmbed.displayName = 'GIFVEmbed';

interface VideoEmbedProps extends SharedProps {
  source: 'youtube' | 'direct';
  title: string;
  description: string;
}

const VideoEmbed = ({ source, title, description, ...shared }: VideoEmbedProps) => (
  <Embeds
    embeds={[
      source === 'youtube'
        ? {
            type: 'video',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: title || undefined,
            description: description || undefined,
            color: 0xff0000,
            author: { name: 'Some Channel', url: 'https://www.youtube.com/@channel' },
            provider: { name: 'YouTube', url: 'https://www.youtube.com' },
            thumbnail: IMAGES.landscape,
            video: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', width: 1280, height: 720 },
          }
        : {
            type: 'video',
            url: `${ASSETS}/gifv.mp4`,
            thumbnail: media('gifv-poster', 480, 270),
            video: { url: `${ASSETS}/gifv.mp4`, proxy_url: `${ASSETS}/gifv.mp4`, width: 480, height: 270 },
          },
    ]}
    {...shared}
  />
);

VideoEmbed.displayName = 'VideoEmbed';

const GalleryEmbed = ({ count, ...shared }: SharedProps & { count: number }) => {
  const images = Object.values(IMAGES).slice(0, count);
  return (
    <Embeds
      embeds={images.map((image, index) => ({
        type: 'rich',
        url: 'https://example.com/gallery',
        ...(index === 0
          ? { title: 'Gallery', description: 'Embeds sharing a url merge into one.', color: 0x9b59b6 }
          : {}),
        image,
      }))}
      {...shared}
    />
  );
};

GalleryEmbed.displayName = 'GalleryEmbed';

const SpotifyEmbed = ({ kind }: { kind: 'track' | 'album' | 'playlist' }) => (
  <MessageEmbeds
    message={DEFAULT_MESSAGE}
    embeds={[
      {
        type: 'link',
        url: `https://open.spotify.com/${kind}/${kind === 'track' ? '4cOdK2wGLETKBW3PvgPWqT' : '37i9dQZF1DXcBWIGoYBM5M'}`,
        provider: { name: 'Spotify', url: 'https://open.spotify.com/' },
        title: 'Spotify',
      },
    ]}
  />
);

SpotifyEmbed.displayName = 'SpotifyEmbed';

const embeds: StoryGroup = {
  title: 'Embeds',
  stories: [
    {
      name: 'Rich Embed',
      id: 'rich-embed',
      component: RichEmbed,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Rich embed title' },
        url: { label: 'URL', type: 'text', defaultValue: 'https://discord.com' },
        description: {
          label: 'Description',
          type: 'text',
          defaultValue: 'Rich embeds have an author, title, description, fields, images and a footer.',
        },
        useColor: { label: 'Use color', type: 'boolean', defaultValue: true },
        color: { label: 'Color', type: 'color', defaultValue: '#5865f2' },
        authorName: { label: 'Author', type: 'text', defaultValue: 'Embed Author' },
        authorIcon: { label: 'Author icon', type: 'boolean', defaultValue: true },
        providerName: { label: 'Provider', type: 'text', defaultValue: '' },
        fieldCount: { label: 'Fields', type: 'slider', defaultValue: 3, minValue: 0, maxValue: 25 },
        inlineFields: { label: 'Inline fields', type: 'boolean', defaultValue: true },
        thumbnail: { label: 'Thumbnail', type: 'boolean', defaultValue: true },
        image: {
          label: 'Image',
          type: 'select',
          defaultValue: 'none',
          options: [{ label: 'none', value: 'none' }, ...imageOptions],
        },
        footerText: { label: 'Footer', type: 'text', defaultValue: 'Footer text' },
        footerIcon: { label: 'Footer icon', type: 'boolean', defaultValue: true },
        timestamp: { label: 'Timestamp', type: 'boolean', defaultValue: true },
        ...sharedControls,
      },
    },
    {
      name: 'Link Embed',
      id: 'link-embed',
      component: LinkEmbed,
      controls: {
        type: {
          label: 'Type',
          type: 'select',
          defaultValue: 'link',
          hint: 'Articles show their thumbnail as a large image',
          options: [
            { label: 'link', value: 'link' },
            { label: 'article', value: 'article' },
          ],
        },
        title: { label: 'Title', type: 'text', defaultValue: 'A link preview' },
        description: { label: 'Description', type: 'text', defaultValue: 'Text from the page’s meta tags.' },
        providerName: { label: 'Provider', type: 'text', defaultValue: 'Example' },
        thumbnail: {
          label: 'Thumbnail',
          type: 'select',
          defaultValue: 'square',
          options: [{ label: 'none', value: 'none' }, ...imageOptions],
        },
        ...sharedControls,
      },
    },
    {
      name: 'Image Embed',
      id: 'image-embed',
      component: ImageEmbed,
      docs: 'An image link renders as bare media, without the embed box.',
      controls: {
        image: { label: 'Image', type: 'select', defaultValue: 'landscape', options: imageOptions },
        ...sharedControls,
      },
    },
    {
      name: 'GIFV Embed',
      id: 'gifv-embed',
      component: GIFVEmbed,
      controls: sharedControls,
    },
    {
      name: 'Video Embed',
      id: 'video-embed',
      component: VideoEmbed,
      docs: 'Provider videos show their thumbnail and a play pill; playing swaps in the provider’s player.',
      controls: {
        source: {
          label: 'Source',
          type: 'select',
          defaultValue: 'youtube',
          options: [
            { label: 'YouTube', value: 'youtube' },
            { label: 'Direct video', value: 'direct' },
          ],
        },
        title: { label: 'Title', type: 'text', defaultValue: 'A YouTube video' },
        description: { label: 'Description', type: 'text', defaultValue: 'Click play to load the player.' },
        ...sharedControls,
      },
    },
    {
      name: 'Gallery',
      id: 'gallery-embed',
      component: GalleryEmbed,
      docs: 'Several embeds with the same url merge into one embed whose images form a mosaic.',
      controls: {
        count: { label: 'Images', type: 'slider', defaultValue: 4, minValue: 2, maxValue: 5 },
        ...sharedControls,
      },
    },
    {
      name: 'Spotify Embed',
      id: 'spotify-embed',
      component: SpotifyEmbed,
      docs: 'Spotify, Apple Music, Amazon Music and PlayStation links render the provider’s player.',
      controls: {
        kind: {
          label: 'Kind',
          type: 'select',
          defaultValue: 'track',
          options: [
            { label: 'Track', value: 'track' },
            { label: 'Album', value: 'album' },
            { label: 'Playlist', value: 'playlist' },
          ],
        },
      },
    },
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
