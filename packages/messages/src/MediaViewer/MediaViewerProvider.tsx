import { useCallback, type ReactNode } from 'react';
import { BackdropStyles, openModal, type ModalContextKey } from '@discord-components/components';
import { MediaContextProvider } from '../media/MediaContext';
import type { MediaViewerOpenOptions } from '../media/mediaViewerTypes';
import { MediaViewerModal, type MediaViewerModalProps } from './MediaViewerModal';

export const MEDIA_VIEWER_MODAL_KEY = 'Media Viewer Modal';

export interface OpenMediaViewerOptions
  extends MediaViewerOpenOptions, Pick<MediaViewerModalProps, 'isItemObscured' | 'onOpenMoreMenu' | 'renderAuthor'> {
  /** The modal stack context to open in (defaults to the app's). */
  contextKey?: ModalContextKey;
}

/**
 * Opens Discord's media viewer through the modal stack, like the client: the lightbox backdrop and the viewer
 * modal keyed "Media Viewer Modal". Returns the modal key.
 */
export const openMediaViewer = ({
  contextKey,
  onClose,
  isItemObscured,
  onOpenMoreMenu,
  renderAuthor,
  items,
  startingIndex,
  shouldHideMediaOptions,
}: OpenMediaViewerOptions) =>
  openModal(
    ({ transitionState, onClose: closeModal }) => (
      <MediaViewerModal
        items={items}
        startingIndex={startingIndex}
        shouldHideMediaOptions={shouldHideMediaOptions}
        transitionState={transitionState}
        onClose={() => {
          onClose?.();
          void closeModal();
        }}
        isItemObscured={isItemObscured}
        onOpenMoreMenu={onOpenMoreMenu}
        renderAuthor={renderAuthor}
      />
    ),
    { modalKey: MEDIA_VIEWER_MODAL_KEY, backdropStyle: BackdropStyles.LIGHTBOX },
    contextKey,
  );

export interface MediaViewerProviderProps extends Pick<
  MediaViewerModalProps,
  'isItemObscured' | 'onOpenMoreMenu' | 'renderAuthor'
> {
  children?: ReactNode;
  contextKey?: ModalContextKey;
}

/** Makes media inside it open in the media viewer when clicked (needs the modal stack mounted, as in AppRoot). */
export const MediaViewerProvider = ({
  children,
  contextKey,
  isItemObscured,
  onOpenMoreMenu,
  renderAuthor,
}: MediaViewerProviderProps) => {
  const open = useCallback(
    (options: MediaViewerOpenOptions) => {
      openMediaViewer({ ...options, contextKey, isItemObscured, onOpenMoreMenu, renderAuthor });
    },
    [contextKey, isItemObscured, onOpenMoreMenu, renderAuthor],
  );
  return <MediaContextProvider openMediaViewer={open}>{children}</MediaContextProvider>;
};

MediaViewerProvider.displayName = 'MediaViewerProvider';
