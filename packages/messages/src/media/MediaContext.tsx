import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MediaViewerOpenOptions } from './mediaViewerTypes';

// English strings the media components render. Discord's client fills these from its translations.
export const DEFAULT_MEDIA_I18N = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  IMAGE_FAILED_TO_LOAD: 'Image failed to load.',
  IMAGE_NOT_FOUND: 'Image not found',
  IMAGE_DESCRIPTION_ALT_TEXT: 'Image Description (Alt Text)',
  ALT: 'ALT',
  SPOILER: 'Spoiler',
  MAY_CONTAIN_SENSITIVE_CONTENT: 'May contain sensitive content',
  REVEAL_SENSITIVE_CONTENT: 'Reveal sensitive content',
  CONTENT_WARNING_SENSITIVE: 'Content Warning: This may contain sensitive content',
  DOWNLOAD: 'Download',
  MODIFY_ATTACHMENT: 'Modify Attachment',
  DELETE: 'Delete',
  REMOVE_MESSAGE_ATTACHMENT: 'Remove Message Attachment',
  PLAY: 'Play',
  PAUSE: 'Pause',
  PLAY_AGAIN: 'Play again',
  FULL_SCREEN: 'Full screen',
  ENTER_FULL_SCREEN: 'Full Screen',
  EXIT_FULL_SCREEN: 'Exit Full Screen',
  CONTROL_VOLUME: 'Control volume',
  ATTACHMENT_FILE_TYPE: (fileType: string) => `Attachment file type: ${fileType}`,
  UNKNOWN: 'unknown',
};

export type MediaI18n = typeof DEFAULT_MEDIA_I18N;

export interface MediaContextValue {
  i18n: MediaI18n;
  /** The "Show image descriptions" accessibility setting: renders the ALT badge / alt text under media. */
  viewImageDescriptions: boolean;
  /** "Automatically play GIFs when Discord is focused". */
  gifAutoPlay: boolean;
  /** "Show images and videos that are uploaded directly to Discord" (when off, attachments render as files). */
  inlineAttachmentMedia: boolean;
  /** "Show images and videos posted as links in chat". */
  inlineEmbedMedia: boolean;
  /** Whether the window has focus; animated media only plays while it does. Tracks the real window when unset. */
  isWindowFocused?: boolean;
  /**
   * Opens the media viewer for the clicked media. Defaults to the package's MediaViewer when a
   * `MediaViewerProvider` is mounted; set it to route clicks elsewhere.
   */
  openMediaViewer?: (options: MediaViewerOpenOptions) => void;
}

export const DEFAULT_MEDIA_CONTEXT: MediaContextValue = {
  i18n: DEFAULT_MEDIA_I18N,
  viewImageDescriptions: false,
  gifAutoPlay: true,
  inlineAttachmentMedia: true,
  inlineEmbedMedia: true,
  isWindowFocused: undefined,
  openMediaViewer: undefined,
};

export const MediaContext = createContext<MediaContextValue>(DEFAULT_MEDIA_CONTEXT);

MediaContext.displayName = 'MediaContext';

export const useMediaContext = () => useContext(MediaContext);

export type MediaContextProviderProps = Partial<Omit<MediaContextValue, 'i18n'>> & {
  i18n?: Partial<MediaI18n>;
  children?: ReactNode;
};

// Overrides parts of the surrounding media settings; anything left out is inherited.
export const MediaContextProvider = ({ children, i18n, ...overrides }: MediaContextProviderProps) => {
  const parent = useContext(MediaContext);
  const {
    viewImageDescriptions,
    gifAutoPlay,
    inlineAttachmentMedia,
    inlineEmbedMedia,
    isWindowFocused,
    openMediaViewer,
  } = overrides;
  const overridesViewer = 'openMediaViewer' in overrides;
  const value = useMemo<MediaContextValue>(
    () => ({
      i18n: i18n != null ? { ...parent.i18n, ...i18n } : parent.i18n,
      viewImageDescriptions: viewImageDescriptions ?? parent.viewImageDescriptions,
      gifAutoPlay: gifAutoPlay ?? parent.gifAutoPlay,
      inlineAttachmentMedia: inlineAttachmentMedia ?? parent.inlineAttachmentMedia,
      inlineEmbedMedia: inlineEmbedMedia ?? parent.inlineEmbedMedia,
      isWindowFocused: isWindowFocused ?? parent.isWindowFocused,
      openMediaViewer: overridesViewer ? openMediaViewer : parent.openMediaViewer,
    }),
    [
      parent,
      i18n,
      viewImageDescriptions,
      gifAutoPlay,
      inlineAttachmentMedia,
      inlineEmbedMedia,
      isWindowFocused,
      openMediaViewer,
      overridesViewer,
    ],
  );
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

MediaContextProvider.displayName = 'MediaContextProvider';
