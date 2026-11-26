import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { animated } from '@react-spring/web';
import {
  AppLayer,
  ModalTransitionState,
  modalStack,
  useTransition,
  type ModalTransitionStateValue,
} from '@discord-components/components';
import { MediaContextProvider } from '../media/MediaContext';
import type { MediaViewerItem, MediaViewerOpenOptions } from '../media/mediaViewerTypes';
import { MediaViewerModal, type MediaViewerModalProps } from './MediaViewerModal';
import backdropStyles from './Backdrop.module.css';
import layerStyles from './ModalLayer.module.css';

export const MEDIA_VIEWER_MODAL_KEY = 'Media Viewer Modal';

// The modal stack's enter/exit duration.
const TRANSITION_MS = 300;
const BACKDROP_SPRING = { mass: 1, tension: 1000, friction: 48 };

const LightboxBackdrop = ({ isVisible, onClick }: { isVisible: boolean; onClick: () => void }) => {
  const transition = useTransition(
    isVisible,
    {
      keys: (visible: boolean) => (visible ? 'scrim' : 'empty'),
      config: BACKDROP_SPRING,
      from: { opacity: 0 },
      enter: { opacity: 1 },
      leave: { opacity: 0 },
    },
    'animate-always',
  );
  return transition((style, visible) =>
    visible ? (
      <animated.div
        role="none"
        className={`${backdropStyles.scrim} ${backdropStyles.lightbox}`}
        style={style}
        onClick={onClick}
      />
    ) : null,
  );
};

LightboxBackdrop.displayName = 'LightboxBackdrop';

interface OpenViewer extends MediaViewerOpenOptions {
  transitionState: ModalTransitionStateValue;
}

export interface MediaViewerProviderProps extends Pick<
  MediaViewerModalProps,
  'isItemObscured' | 'onOpenMoreMenu' | 'renderAuthor'
> {
  children?: ReactNode;
  /** Opens the viewer already entered, without the enter/exit transition (handy for screenshots). */
  instant?: boolean;
}

/**
 * Opens Discord's media viewer when media is clicked: renders the lightbox backdrop and the viewer in the app layer,
 * the way the client's modal stack shows it. Wrap message content in it.
 */
export const MediaViewerProvider = ({
  children,
  instant = false,
  isItemObscured,
  onOpenMoreMenu,
  renderAuthor,
}: MediaViewerProviderProps) => {
  const [viewer, setViewer] = useState<OpenViewer | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const openMediaViewer = useCallback(
    (options: MediaViewerOpenOptions) => {
      setViewer({
        ...options,
        transitionState: instant ? ModalTransitionState.ENTERED : ModalTransitionState.ENTERING,
      });
      modalStack.push(MEDIA_VIEWER_MODAL_KEY);
      if (!instant)
        later(
          () =>
            setViewer((current) =>
              current != null ? { ...current, transitionState: ModalTransitionState.ENTERED } : current,
            ),
          TRANSITION_MS,
        );
    },
    [instant],
  );

  const close = useCallback(() => {
    setViewer((current) => {
      if (current == null || current.transitionState === ModalTransitionState.EXITING) return current;
      current.onClose?.();
      return { ...current, transitionState: ModalTransitionState.EXITING };
    });
    const remove = () => {
      setViewer(null);
      modalStack.remove(MEDIA_VIEWER_MODAL_KEY);
    };
    if (instant) remove();
    else later(remove, TRANSITION_MS);
  }, [instant]);

  const isOpen = viewer != null && viewer.transitionState !== ModalTransitionState.EXITING;

  return (
    <MediaContextProvider openMediaViewer={openMediaViewer}>
      {children}
      <AppLayer>
        <LightboxBackdrop isVisible={isOpen} onClick={close} />
      </AppLayer>
      {viewer != null && (
        <AppLayer>
          <div className={layerStyles.layer}>
            <MediaViewerModal
              items={viewer.items as MediaViewerItem[]}
              startingIndex={viewer.startingIndex}
              shouldHideMediaOptions={viewer.shouldHideMediaOptions}
              transitionState={viewer.transitionState}
              onClose={close}
              isItemObscured={isItemObscured}
              onOpenMoreMenu={onOpenMoreMenu}
              renderAuthor={renderAuthor}
            />
          </div>
        </AppLayer>
      )}
    </MediaContextProvider>
  );
};

MediaViewerProvider.displayName = 'MediaViewerProvider';
