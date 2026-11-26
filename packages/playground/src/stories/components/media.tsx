import { useMemo } from 'react';
import {
  Graphic,
  LottieAnimation,
  RiveAnimation,
  RiveAssetStatus,
  useRiveAsset,
  type GraphicAspectRatio,
  type GraphicProps,
  type LottieRenderer,
  type RiveAlignment,
  type RiveFit,
} from '@discord-mana/components';
import {
  FileAttachment,
  GifTag,
  Image,
  ImageReadyState,
  LazyImage,
  MediaContextProvider,
  MediaLayoutType,
  MediaMosaicHoverButtons,
  MediaPlayer,
  MediaPlayerTypes,
  ObscuredContent,
  ObscuredContentTypes,
  ObscureReason,
  type MediaPlayerType,
  type ObscuredContentType,
} from '@discord-mana/messages';
import type { CSSProperties, ReactNode } from 'react';
import { DynamicGraphicComponent } from '../../dynamicGraphics';
import type { StoryGroup } from '../../types';
import { noop, valueOptions } from './shared';

const ASSETS = `${window.location.origin}/messages`;
const PHOTO = { src: `${ASSETS}/attachments/photo-1.jpg`, width: 1600, height: 900 };
const GIF = { src: `${ASSETS}/attachments/animated.gif`, width: 320, height: 240 };
const VIDEO = `${ASSETS}/attachments/video-1.webm`;
const VIDEO_POSTER = `${ASSETS}/attachments/video-1-poster.jpg`;
const AUDIO = `${ASSETS}/audio.mp3`;
const MIME_TYPE = ['text', 'plain'];

const GRAPHIC_IMAGE = '/mana/expressive-modal-graphic.svg';
// A copy of the client's box-wumpus.riv: Discord's CDN doesn't allow fetching it from other origins.
const RIVE_ASSET = '/components/box-wumpus.riv';
const VIDEO_ASSET =
  'https://cdn.discordapp.com/assets/content/06fafa729efafb6235e0ee9df9482566fa9e74b96a792a9265dca70113c71ab7.webm';

const loadLottie = () => import('../mana/assets/expressive-modal-lottie.json').then((module) => module.default);

// The media primitives read their strings and settings from the media context, like in a message.
const WithMediaContext = ({ children }: { children: ReactNode }) => (
  <MediaContextProvider isWindowFocused={false}>{children}</MediaContextProvider>
);

interface RiveStoryProps {
  artboard: string;
  fit: RiveFit;
  alignment: RiveAlignment;
  autoplay: boolean;
  withReducedMotion: 'halt' | 'short-loop' | 'play';
}

const BoxWumpusRive = (props: Partial<RiveStoryProps> & { className?: string; style?: CSSProperties }) => {
  const { status, buffer } = useRiveAsset(RIVE_ASSET);
  if (status === RiveAssetStatus.Loading) return null;
  return <RiveAnimation buffer={buffer} artboard="box-wumpus" {...props} />;
};

BoxWumpusRive.displayName = 'BoxWumpusRive';

const RiveStory = (props: RiveStoryProps) => (
  <div style={{ width: 320, height: 320 }}>
    <BoxWumpusRive {...props} style={{ width: '100%', height: '100%' }} />
  </div>
);

RiveStory.displayName = 'RiveStory';

interface GraphicStoryProps {
  type: GraphicProps['type'];
  aspectRatio: GraphicAspectRatio;
}

const GraphicStory = ({ type, aspectRatio }: GraphicStoryProps) => {
  const graphic = useMemo((): GraphicProps => {
    switch (type) {
      case 'lottie':
        return { type, lottie: loadLottie, aspectRatio };
      case 'rive':
        return { type, rive: BoxWumpusRive, aspectRatio };
      case 'video':
        return { type, src: VIDEO_ASSET, fallbackImageSrc: GRAPHIC_IMAGE, loop: true, loopAt: 2.5, aspectRatio };
      case 'dynamic':
        return { type, component: DynamicGraphicComponent.DEMO, props: { text: 'Dynamic Content' }, aspectRatio };
      default:
        return { type: 'image', src: GRAPHIC_IMAGE, aspectRatio };
    }
  }, [type, aspectRatio]);
  return (
    <div style={{ width: 400 }}>
      <Graphic {...graphic} />
    </div>
  );
};

GraphicStory.displayName = 'GraphicStory';

interface LottieStoryProps {
  loop: boolean;
  autoplay: boolean;
  shouldAnimate: boolean;
  renderer: LottieRenderer;
}

const LottieStory = (props: LottieStoryProps) => (
  <div style={{ width: 320 }}>
    <LottieAnimation key={props.renderer} {...props} importData={loadLottie} />
  </div>
);

LottieStory.displayName = 'LottieStory';

interface ImageStoryProps {
  readyState: ImageReadyState;
  maxWidth: number;
  maxHeight: number;
  mediaLayoutType: MediaLayoutType;
  gifTag: boolean;
  alt: string;
}

const ImageStory = ({ gifTag, ...props }: ImageStoryProps) => (
  <WithMediaContext>
    <Image {...PHOTO} {...props} accessory={gifTag ? <GifTag /> : undefined} onClick={noop} />
  </WithMediaContext>
);

ImageStory.displayName = 'ImageStory';

interface LazyImageStoryProps {
  animated: boolean;
  autoPlay: boolean;
  responsive: boolean;
  maxWidth: number;
  maxHeight: number;
}

const LazyImageStory = ({ animated, ...props }: LazyImageStoryProps) => (
  <WithMediaContext>
    <LazyImage {...(animated ? GIF : PHOTO)} {...props} animated={animated} shouldAnimate alt="" onZoom={noop} />
  </WithMediaContext>
);

LazyImageStory.displayName = 'LazyImageStory';

interface ObscuredContentStoryProps {
  type: ObscuredContentType;
  reason: ObscureReason;
  obscured: boolean;
}

const ObscuredContentStory = ({ type, ...props }: ObscuredContentStoryProps) => (
  <WithMediaContext>
    {type === ObscuredContentTypes.TEXT ? (
      <span style={{ color: 'var(--text-default)' }}>
        The ending is{' '}
        <ObscuredContent key={String(props.obscured)} type={type} {...props}>
          {() => 'Wumpus was the friends we made along the way'}
        </ObscuredContent>
        .
      </span>
    ) : (
      <ObscuredContent
        key={String(props.obscured)}
        type={type}
        {...props}
        isSingleMosaicItem
        containerStyles={{ maxWidth: 400, width: '100%', height: '100%', justifySelf: 'auto' }}
      >
        {(hidden) => (
          // Mosaic items blur themselves while hidden; the overlay only adds the label.
          <Image
            {...PHOTO}
            maxWidth={400}
            maxHeight={300}
            style={{ filter: hidden ? 'blur(var(--custom-message-attachment-spoiler-blur-radius))' : undefined }}
          />
        )}
      </ObscuredContent>
    )}
  </WithMediaContext>
);

ObscuredContentStory.displayName = 'ObscuredContentStory';

interface MediaPlayerStoryProps {
  type: MediaPlayerType;
  autoMute: boolean;
  playable: boolean;
  forceExternal: boolean;
  fileName: string;
  fileSize: string;
}

const MediaPlayerStory = ({ type, ...props }: MediaPlayerStoryProps) => (
  <WithMediaContext>
    {type === MediaPlayerTypes.AUDIO ? (
      <MediaPlayer key={type} {...props} type={type} src={AUDIO} width={400} height={66} mimeType={['audio', 'mpeg']} />
    ) : (
      <MediaPlayer
        key={type}
        {...props}
        type={type}
        src={VIDEO}
        poster={VIDEO_POSTER}
        width={400}
        height={225}
        mimeType={['video', 'webm']}
      />
    )}
  </WithMediaContext>
);

MediaPlayerStory.displayName = 'MediaPlayerStory';

interface FileAttachmentStoryProps {
  fileName: string;
  fileSize: number;
  hoverActions: boolean;
}

const FileAttachmentStory = ({ fileName, fileSize, hoverActions }: FileAttachmentStoryProps) => {
  const url = `${ASSETS}/attachments/${fileName}`;
  return (
    <WithMediaContext>
      <FileAttachment
        url={url}
        fileName={fileName}
        fileSize={fileSize}
        renderAdjacentContent={
          hoverActions
            ? () => (
                <MediaMosaicHoverButtons
                  mimeType={MIME_TYPE}
                  downloadURL={url}
                  showDownload
                  isVisualMediaType={false}
                />
              )
            : undefined
        }
      />
    </WithMediaContext>
  );
};

FileAttachmentStory.displayName = 'FileAttachmentStory';

const sizeControls = {
  maxWidth: { label: 'Max Width', type: 'number' as const, defaultValue: 400 },
  maxHeight: { label: 'Max Height', type: 'number' as const, defaultValue: 300 },
};

const media: StoryGroup = {
  title: 'Media',
  stories: [
    {
      name: 'Graphic',
      id: 'graphic',
      component: GraphicStory,
      controls: {
        type: {
          label: 'Type',
          type: 'select',
          defaultValue: 'image',
          options: valueOptions(['image', 'lottie', 'rive', 'video', 'dynamic']),
        },
        aspectRatio: {
          label: 'Aspect Ratio',
          type: 'select',
          defaultValue: '16/9',
          options: valueOptions(['21/9', '16/9', '6/4', '2/1', '1/1']),
        },
      },
    },
    {
      name: 'LottieAnimation',
      id: 'lottie-animation',
      component: LottieStory,
      controls: {
        loop: { label: 'Loop', type: 'boolean', defaultValue: true },
        autoplay: { label: 'Autoplay', type: 'boolean', defaultValue: true },
        shouldAnimate: { label: 'Should Animate', type: 'boolean', defaultValue: true },
        renderer: { label: 'Renderer', type: 'select', defaultValue: 'svg', options: valueOptions(['svg', 'canvas']) },
      },
    },
    {
      name: 'RiveAnimation',
      id: 'rive-animation',
      component: RiveStory,
      controls: {
        fit: {
          label: 'Fit',
          type: 'select',
          defaultValue: 'contain',
          options: valueOptions(['cover', 'contain', 'fill', 'fitWidth', 'fitHeight', 'none', 'scaleDown', 'layout']),
        },
        alignment: {
          label: 'Alignment',
          type: 'select',
          defaultValue: 'center',
          options: valueOptions([
            'center',
            'topLeft',
            'topCenter',
            'topRight',
            'centerLeft',
            'centerRight',
            'bottomLeft',
            'bottomCenter',
            'bottomRight',
          ]),
        },
        autoplay: { label: 'Autoplay', type: 'boolean', defaultValue: true },
        withReducedMotion: {
          label: 'With Reduced Motion',
          type: 'select',
          defaultValue: 'halt',
          options: valueOptions(['halt', 'short-loop', 'play']),
        },
      },
    },
    {
      name: 'Image',
      id: 'image',
      component: ImageStory,
      controls: {
        readyState: {
          label: 'Ready State',
          type: 'select',
          defaultValue: ImageReadyState.READY,
          options: valueOptions(Object.values(ImageReadyState)),
        },
        ...sizeControls,
        mediaLayoutType: {
          label: 'Layout',
          type: 'select',
          defaultValue: MediaLayoutType.STATIC,
          options: valueOptions(Object.values(MediaLayoutType)),
        },
        gifTag: { label: 'GIF Tag', type: 'boolean', defaultValue: false },
        alt: { label: 'Alt Text', type: 'text', defaultValue: 'A photo' },
      },
    },
    {
      name: 'LazyImage',
      id: 'lazy-image',
      component: LazyImageStory,
      controls: {
        animated: { label: 'Animated (GIF)', type: 'boolean', defaultValue: false },
        autoPlay: { label: 'Auto Play', type: 'boolean', defaultValue: false },
        responsive: { label: 'Responsive', type: 'boolean', defaultValue: false },
        ...sizeControls,
      },
    },
    {
      name: 'ObscuredContent',
      id: 'obscured-content',
      component: ObscuredContentStory,
      controls: {
        type: {
          label: 'Type',
          type: 'select',
          defaultValue: ObscuredContentTypes.ATTACHMENT,
          options: valueOptions(Object.values(ObscuredContentTypes)),
        },
        reason: {
          label: 'Reason',
          type: 'select',
          defaultValue: ObscureReason.SPOILER,
          options: valueOptions(Object.values(ObscureReason)),
        },
        obscured: { label: 'Obscured', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'MediaPlayer',
      id: 'media-player',
      component: MediaPlayerStory,
      controls: {
        type: {
          label: 'Type',
          type: 'select',
          defaultValue: MediaPlayerTypes.VIDEO,
          options: valueOptions(Object.values(MediaPlayerTypes)),
        },
        autoMute: { label: 'Auto Mute', type: 'boolean', defaultValue: false },
        playable: { label: 'Playable', type: 'boolean', defaultValue: true },
        forceExternal: { label: 'Force External', type: 'boolean', defaultValue: false },
        fileName: { label: 'File Name', type: 'text', defaultValue: 'clip.webm' },
        fileSize: { label: 'File Size', type: 'text', defaultValue: '1.2 MB' },
      },
    },
    {
      name: 'FileAttachment',
      id: 'file-attachment',
      component: FileAttachmentStory,
      controls: {
        fileName: { label: 'File Name', type: 'text', defaultValue: 'release-notes.txt' },
        fileSize: { label: 'File Size (bytes)', type: 'number', defaultValue: 24576 },
        hoverActions: { label: 'Hover Actions', type: 'boolean', defaultValue: true },
      },
    },
  ],
};

export default media;
