import { useMemo } from 'react';
import {
  AttachmentFlags,
  MediaContextProvider,
  MediaGallery,
  MediaViewerProvider,
  MessageAttachments,
  type APIMediaGalleryItem,
  type APIAttachment,
  type APIMessageAttachmentContext,
} from '@discord-components/messages';
import type { Controls, Story, StoryGroup } from '../../types';

interface AttachmentFixtureData {
  attachments: APIAttachment[];
  message?: APIMessageAttachmentContext;
  // Mirrors what the reference renderer reads (scripts/fixtures/attachments/reference.js).
  props?: {
    canDeleteAttachments?: boolean;
    inlineAttachmentMedia?: boolean;
    gifAutoPlay?: boolean;
    viewImageDescriptions?: boolean;
  };
}

const fixtureFiles = import.meta.glob<{ story: string; data: AttachmentFixtureData }>(
  '../../../../../scripts/fixtures/attachments/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const MEDIA = `${ASSETS}/attachments`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `attachments/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

const galleryFixtureFiles = import.meta.glob<{
  story: string;
  data: { items: APIMediaGalleryItem[]; props?: { viewImageDescriptions?: boolean } };
}>('../../../../../scripts/fixtures/media-gallery/*.json', { eager: true, import: 'default' });

const galleryFixtures = Object.fromEntries(
  Object.entries(galleryFixtureFiles)
    .map(
      ([file, fixture]) =>
        [
          `media-gallery/${file
            .split('/')
            .pop()!
            .replace(/\.json$/, '')}`,
          withAssets(fixture.data),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
);

const MediaGalleryFixture = ({ fixture }: { fixture: string }) => {
  const data = galleryFixtures[fixture];
  if (data == null) return null;
  return (
    <MediaContextProvider viewImageDescriptions={data.props?.viewImageDescriptions ?? false} isWindowFocused={false}>
      <MediaGallery items={data.items} />
    </MediaContextProvider>
  );
};

MediaGalleryFixture.displayName = 'MediaGalleryFixture';

const DEFAULT_MESSAGE: APIMessageAttachmentContext = {
  id: '1300000000000000000',
  channel_id: '1200000000000000000',
  content: '',
};

const AttachmentFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  if (data == null) return null;
  const {
    canDeleteAttachments,
    inlineAttachmentMedia = true,
    gifAutoPlay = true,
    viewImageDescriptions = false,
  } = data.props ?? {};
  return (
    // The reference renderer has no window store, so the client considers its window unfocused (GIFs stay paused).
    <MediaContextProvider
      inlineAttachmentMedia={inlineAttachmentMedia}
      gifAutoPlay={gifAutoPlay}
      viewImageDescriptions={viewImageDescriptions}
      isWindowFocused={false}
    >
      <MessageAttachments
        attachments={data.attachments}
        message={data.message ?? DEFAULT_MESSAGE}
        canDeleteAttachments={canDeleteAttachments}
      />
    </MediaContextProvider>
  );
};

AttachmentFixture.displayName = 'AttachmentFixture';

const PHOTO_SIZES: [number, number][] = [
  [1600, 900],
  [900, 1200],
  [1000, 1000],
  [1920, 1080],
  [800, 1400],
  [1200, 800],
  [1024, 1024],
  [2000, 600],
  [700, 1000],
  [1280, 960],
];

type MediaKind = 'images' | 'videos' | 'gifs' | 'mixed';

const photo = (index: number, flags: number, description?: string): APIAttachment => {
  const n = (index % PHOTO_SIZES.length) + 1;
  const [width, height] = PHOTO_SIZES[n - 1];
  return {
    id: `photo-${index}`,
    filename: `photo-${n}.jpg`,
    size: 20000 + n * 1000,
    url: `${MEDIA}/photo-${n}.jpg`,
    proxy_url: `${MEDIA}/photo-${n}.jpg`,
    width,
    height,
    content_type: 'image/jpeg',
    flags,
    description,
  };
};

const video = (index: number, flags: number, description?: string): APIAttachment => {
  const n = (index % 2) + 1;
  return {
    id: `video-${index}`,
    filename: `video-${n}.webm`,
    size: 19000,
    url: `${MEDIA}/video-${n}.webm`,
    proxy_url: `${MEDIA}/video-${n}.webm`,
    width: n === 1 ? 1280 : 720,
    height: n === 1 ? 720 : 1280,
    content_type: 'video/webm',
    flags,
    description,
  };
};

const gif = (index: number, flags: number, description?: string): APIAttachment => ({
  id: `gif-${index}`,
  filename: 'animated.gif',
  size: 348457,
  url: `${MEDIA}/animated.gif`,
  proxy_url: `${MEDIA}/animated.gif`,
  width: 320,
  height: 240,
  content_type: 'image/gif',
  flags: flags | AttachmentFlags.IsAnimated,
  description,
});

const MIXED = [photo, video, gif, photo];

interface MosaicStoryProps {
  count: number;
  kind: MediaKind;
  spoiler: boolean;
  altText: boolean;
  viewImageDescriptions: boolean;
  gifAutoPlay: boolean;
  inlineAttachmentMedia: boolean;
  canDeleteAttachments: boolean;
  messageContent: string;
}

const MediaMosaicStory = ({
  count,
  kind,
  spoiler,
  altText,
  viewImageDescriptions,
  gifAutoPlay,
  inlineAttachmentMedia,
  canDeleteAttachments,
  messageContent,
}: MosaicStoryProps) => {
  const attachments = useMemo(
    () =>
      Array.from({ length: Math.max(1, Math.min(10, count)) }, (_, index) => {
        const make = kind === 'images' ? photo : kind === 'videos' ? video : kind === 'gifs' ? gif : MIXED[index % 4];
        return make(index, spoiler ? AttachmentFlags.IsSpoiler : 0, altText ? `Attachment ${index + 1}` : undefined);
      }),
    [count, kind, spoiler, altText],
  );
  return (
    <MediaContextProvider
      viewImageDescriptions={viewImageDescriptions}
      gifAutoPlay={gifAutoPlay}
      inlineAttachmentMedia={inlineAttachmentMedia}
    >
      <MediaViewerProvider>
        <MessageAttachments
          attachments={attachments}
          message={{ ...DEFAULT_MESSAGE, content: messageContent }}
          canDeleteAttachments={canDeleteAttachments}
        />
      </MediaViewerProvider>
    </MediaContextProvider>
  );
};

MediaMosaicStory.displayName = 'MediaMosaicStory';

const mosaicControls = (count: number, kind: MediaKind = 'images', spoiler = false): Controls => ({
  count: {
    label: 'Count',
    type: 'slider',
    defaultValue: count,
    minValue: 1,
    maxValue: 10,
    markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  kind: {
    label: 'Media',
    type: 'select',
    defaultValue: kind,
    options: [
      { label: 'Images', value: 'images' },
      { label: 'Videos', value: 'videos' },
      { label: 'GIFs', value: 'gifs' },
      { label: 'Mixed', value: 'mixed' },
    ],
  },
  spoiler: { label: 'Spoiler', type: 'boolean', defaultValue: spoiler },
  altText: { label: 'Alt text', type: 'boolean', defaultValue: false },
  viewImageDescriptions: { label: 'Show image descriptions', type: 'boolean', defaultValue: false },
  gifAutoPlay: { label: 'Autoplay GIFs', type: 'boolean', defaultValue: true },
  inlineAttachmentMedia: { label: 'Inline media', type: 'boolean', defaultValue: true },
  canDeleteAttachments: { label: 'Own message (edit/remove)', type: 'boolean', defaultValue: false },
  messageContent: { label: 'Message content', type: 'text', defaultValue: '' },
});

const countStories: Story[] = Array.from({ length: 10 }, (_, index) => {
  const count = index + 1;
  return {
    name: `${count} ${count === 1 ? 'Image' : 'Images'}`,
    id: `media-mosaic-${count}`,
    component: MediaMosaicStory,
    controls: mosaicControls(count),
  };
});

const FILES: APIAttachment[] = [
  ['report.pdf', 482133, 'application/pdf'],
  ['archive.zip', 10485760, 'application/zip'],
  ['spreadsheet.xlsx', 24576, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['main.ts', 2048, 'text/plain'],
  ['design.sketch', 1048576, undefined],
  ['data.bin', 512, 'application/octet-stream'],
].map(([filename, size, contentType], index) => ({
  id: `file-${index}`,
  filename: filename as string,
  size: size as number,
  url: `${MEDIA}/${filename}`,
  proxy_url: `${MEDIA}/${filename}`,
  content_type: contentType as string | undefined,
}));

const FilesStory = ({ count, withMedia }: { count: number; withMedia: boolean }) => (
  <MessageAttachments
    attachments={[...(withMedia ? [photo(0, 0), photo(1, 0)] : []), ...FILES.slice(0, count)]}
    message={DEFAULT_MESSAGE}
  />
);

FilesStory.displayName = 'FilesStory';

const AudioStory = () => (
  <MessageAttachments
    attachments={[
      {
        id: 'audio',
        filename: 'song.mp3',
        size: 3145728,
        url: `${MEDIA}/video-1.webm`,
        proxy_url: `${MEDIA}/video-1.webm`,
      },
    ]}
    message={DEFAULT_MESSAGE}
  />
);

AudioStory.displayName = 'AudioStory';

const MediaGalleryStory = ({ count, kind, spoiler, altText, viewImageDescriptions }: MosaicStoryProps) => {
  const items = useMemo(
    (): APIMediaGalleryItem[] =>
      Array.from({ length: Math.max(1, Math.min(10, count)) }, (_, index) => {
        const make = kind === 'images' ? photo : kind === 'videos' ? video : kind === 'gifs' ? gif : MIXED[index % 4];
        const attachment = make(index, 0);
        return {
          media: {
            url: attachment.url,
            proxy_url: attachment.proxy_url,
            width: attachment.width,
            height: attachment.height,
            content_type: attachment.content_type,
            flags: kind === 'gifs' ? 1 : 0,
            loading_state: 2,
          },
          description: altText ? `Gallery item ${index + 1}` : undefined,
          spoiler,
        };
      }),
    [count, kind, spoiler, altText],
  );
  return (
    <MediaContextProvider viewImageDescriptions={viewImageDescriptions}>
      <MediaViewerProvider>
        <MediaGallery items={items} />
      </MediaViewerProvider>
    </MediaContextProvider>
  );
};

MediaGalleryStory.displayName = 'MediaGalleryStory';

const mediaMosaic: StoryGroup = {
  title: 'Media Mosaic',
  stories: [
    ...countStories,
    {
      name: 'Mixed Media',
      id: 'media-mosaic-mixed',
      component: MediaMosaicStory,
      controls: mosaicControls(4, 'mixed'),
    },
    { name: 'Videos', id: 'media-mosaic-videos', component: MediaMosaicStory, controls: mosaicControls(2, 'videos') },
    { name: 'GIFs', id: 'media-mosaic-gifs', component: MediaMosaicStory, controls: mosaicControls(1, 'gifs') },
    {
      name: 'Spoilers',
      id: 'media-mosaic-spoilers',
      component: MediaMosaicStory,
      controls: mosaicControls(3, 'mixed', true),
    },
    {
      name: 'Files',
      id: 'media-mosaic-files',
      component: FilesStory,
      controls: {
        count: { label: 'Count', type: 'slider', defaultValue: 3, minValue: 1, maxValue: FILES.length },
        withMedia: { label: 'With images', type: 'boolean', defaultValue: false },
      },
    },
    { name: 'Audio', id: 'media-mosaic-audio', component: AudioStory },
    {
      name: 'Media Gallery (Components v2)',
      id: 'media-gallery',
      component: MediaGalleryStory,
      docs: 'Components v2’s Media Gallery uses the same mosaic, up to 600px wide.',
      controls: mosaicControls(3),
    },
    {
      name: 'Media Gallery Fixtures',
      id: 'media-gallery-fixtures',
      component: MediaGalleryFixture,
      controls: {
        fixture: {
          label: 'Fixture',
          type: 'select',
          defaultValue: Object.keys(galleryFixtures)[0],
          options: Object.keys(galleryFixtures).map((name) => ({ label: name, value: name })),
        },
      },
    },
    {
      name: 'Attachment Fixtures',
      id: 'attachment-fixtures',
      component: AttachmentFixture,
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

export default mediaMosaic;
