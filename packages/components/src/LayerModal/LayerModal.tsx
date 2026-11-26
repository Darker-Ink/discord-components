import { useId, useMemo, type ReactNode, type RefObject } from 'react';
import { animated } from '@react-spring/web';
import clsx from 'clsx';
import type { ModalTransitionStateValue } from '../Dialog/ModalContext';
import { HeadingLevel } from '../HeadingLevel';
import { ManaModalContext } from '../Modal/ManaModalContext';
import modalStyles from '../Modal/Modal.module.css';
import { ModalFocusLock, type ModalImpression } from '../ModalRoot/ModalFocusLock';
import { useModalTransitionStyle, type ModalAnimationVariant } from '../ModalStack/useModalTransitionStyle';
import { ThemeProvider, useThemeContext } from '../Theme';
import styles from './LayerModal.module.css';

export interface LayerModalTrackingProps {
  impressionType?: string;
  impression?: ModalImpression;
  disableTrack?: boolean;
}

export interface LayerModalProps {
  transitionState: ModalTransitionStateValue | null | undefined;
  onClose: () => void;
  animationVariant?: ModalAnimationVariant;
  returnRef?: RefObject<HTMLElement | null>;
  'aria-label'?: string;
  trackingProps?: LayerModalTrackingProps;
  children?: ReactNode;
}

// A modal that covers most of the window (like a settings layer), for full-page flows.
export const LayerModal = ({
  transitionState,
  animationVariant = 'default',
  returnRef,
  'aria-label': ariaLabel,
  onClose,
  trackingProps,
  children,
}: LayerModalProps) => {
  const id = useId();
  const context = useMemo(() => ({ id, headingId: `heading-${id}`, onClose, dismissable: true }), [id, onClose]);
  const { theme } = useThemeContext();
  const style = useModalTransitionStyle(transitionState, animationVariant);
  return (
    <ManaModalContext.Provider value={context}>
      <ModalFocusLock
        id={id}
        role="dialog"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel != null ? undefined : context.headingId}
        returnRef={returnRef}
        {...trackingProps}
      >
        <HeadingLevel forceLevel={1}>
          <div className={styles.outerContainer}>
            {/* Discord's client gives the frame the Ash theme when the user has a dark sidebar (a client
                setting); otherwise it follows the current theme, as here. */}
            <ThemeProvider theme={undefined}>
              {(frameThemeClassName) => (
                <animated.div
                  data-mana-component="layer-modal"
                  className={clsx(modalStyles.container, styles.modal, frameThemeClassName)}
                  style={style}
                >
                  <div className={styles.modalContent}>
                    <ThemeProvider theme={theme}>
                      {(themeClassName) => (
                        <div className={clsx(themeClassName, styles.modalContentInner)}>{children}</div>
                      )}
                    </ThemeProvider>
                  </div>
                </animated.div>
              )}
            </ThemeProvider>
          </div>
        </HeadingLevel>
      </ModalFocusLock>
    </ManaModalContext.Provider>
  );
};

LayerModal.displayName = 'LayerModal';
