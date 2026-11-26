import { useEffect, useMemo } from 'react';
import {
  MediaViewerProvider,
  MessageAttachments,
  useMediaContext,
  type APIAttachment,
  type MediaViewerItem,
} from '@discord-components/messages';
import type { StoryGroup } from '../../types';

interface ViewerFixtureData {
  items: MediaViewerItem[];
  startingIndex?: number;
  shouldHideMediaOptions?: boolean;
}

const fixtureFiles = import.meta.glob<{ story: string; data: ViewerFixtureData }>(
  '../../../../../scripts/fixtures/media-viewer/*.json',
  { eager: true, import: 'default' },
);

const ASSETS = `${window.location.origin}/messages`;
const MEDIA = `${ASSETS}/attachments`;
const withAssets = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replaceAll('{{assets}}', ASSETS));

const fixtures = Object.fromEntries(
  Object.entries(fixtureFiles).map(
    ([file, fixture]) =>
      [
        `media-viewer/${file
          .split('/')
          .pop()!
          .replace(/\.json$/, '')}`,
        withAssets(fixture.data),
      ] as const,
  ),
);

// Opens the viewer as soon as it mounts, like clicking a piece of media.
const OpenOnMount = ({ items, startingIndex, shouldHideMediaOptions }: ViewerFixtureData) => {
  const { openMediaViewer } = useMediaContext();
  useEffect(() => {
    openMediaViewer?.({ items, startingIndex, shouldHideMediaOptions });
  }, [openMediaViewer, items, startingIndex, shouldHideMediaOptions]);
  return null;
};

OpenOnMount.displayName = 'OpenOnMount';

const ViewerFixture = ({ fixture }: { fixture: string }) => {
  const data = fixtures[fixture];
  if (data == null) return null;
  return (
    <MediaViewerProvider>
      <OpenOnMount {...data} />
    </MediaViewerProvider>
  );
};

ViewerFixture.displayName = 'ViewerFixture';

const PHOTOS: [number, number][] = [
  [1600, 900],
  [900, 1200],
  [1000, 1000],
  [1920, 1080],
  [800, 1400],
];

const photo = (index: number): MediaViewerItem => {
  const [width, height] = PHOTOS[index % PHOTOS.length];
  const url = `${MEDIA}/photo-${(index % PHOTOS.length) + 1}.jpg`;
  return { type: 'IMAGE', url, proxyUrl: url, width, height, contentType: 'image/jpeg', original: url };
};

const video = (): MediaViewerItem & { poster: string } => ({
  type: 'VIDEO',
  url: `${MEDIA}/video-1.webm`,
  proxyUrl: `${MEDIA}/video-1.webm`,
  poster: `${MEDIA}/video-1-poster.jpg`,
  width: 1280,
  height: 720,
  contentType: 'video/webm',
});

interface ViewerStoryProps {
  count: number;
  includeVideo: boolean;
  startingIndex: number;
  shouldHideMediaOptions: boolean;
}

const MediaViewerStory = ({ count, includeVideo, startingIndex, shouldHideMediaOptions }: ViewerStoryProps) => {
  const items = useMemo(() => {
    const list: MediaViewerItem[] = Array.from({ length: Math.max(1, count) }, (_, index) => photo(index));
    if (includeVideo) list.splice(1, 0, video());
    return list;
  }, [count, includeVideo]);
  return (
    <MediaViewerProvider key={`${count}-${includeVideo}-${startingIndex}-${shouldHideMediaOptions}`}>
      <OpenOnMount
        items={items}
        startingIndex={Math.min(startingIndex, items.length - 1)}
        shouldHideMediaOptions={shouldHideMediaOptions}
      />
    </MediaViewerProvider>
  );
};

MediaViewerStory.displayName = 'MediaViewerStory';

const ATTACHMENTS: APIAttachment[] = PHOTOS.slice(0, 3).map(([width, height], index) => ({
  id: `viewer-${index}`,
  filename: `photo-${index + 1}.jpg`,
  size: 21000,
  url: `${MEDIA}/photo-${index + 1}.jpg`,
  proxy_url: `${MEDIA}/photo-${index + 1}.jpg`,
  width,
  height,
  content_type: 'image/jpeg',
}));

const ClickToOpen = ({ count }: { count: number }) => (
  <MediaViewerProvider>
    <MessageAttachments attachments={ATTACHMENTS.slice(0, count)} />
  </MediaViewerProvider>
);

ClickToOpen.displayName = 'ClickToOpen';

const mediaViewer: StoryGroup = {
  title: 'Media Viewer',
  stories: [
    {
      name: 'Media Viewer',
      id: 'media-viewer',
      component: MediaViewerStory,
      docs: 'Click the media to zoom (drag or scroll to pan), use the arrows, thumbnails or ←/→ to browse, Escape or the backdrop to close.',
      controls: {
        count: { label: 'Images', type: 'slider', defaultValue: 3, minValue: 1, maxValue: 5 },
        includeVideo: { label: 'Include a video', type: 'boolean', defaultValue: false },
        startingIndex: { label: 'Starting index', type: 'number', defaultValue: 0, minValue: 0 },
        shouldHideMediaOptions: { label: 'Hide media options', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'Open From Attachments',
      id: 'media-viewer-attachments',
      component: ClickToOpen,
      docs: 'Click an attachment to open it in the viewer.',
      controls: { count: { label: 'Attachments', type: 'slider', defaultValue: 3, minValue: 1, maxValue: 3 } },
    },
    {
      name: 'Media Viewer Fixtures',
      id: 'media-viewer-fixtures',
      component: ViewerFixture,
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

export default mediaViewer;
