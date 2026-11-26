import { useId, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { animated } from '@react-spring/web';
import clsx from 'clsx';
import { Dialog } from '../Dialog/Dialog';
import { ModalTransitionState, type ModalTransitionStateValue } from '../Dialog/ModalContext';
import { FocusRingScope } from '../FocusRing';
import { HeadingLevel } from '../HeadingLevel';
import { useModalTransitionStyle, type ModalAnimationVariant } from '../ModalStack/useModalTransitionStyle';
import { ManaModalContext } from './ManaModalContext';
import styles from './Modal.module.css';

export type BaseModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type BaseModalPaddingSize = 'sm' | 'lg';

export interface BaseModalProps {
  // Passed in by `openModal`.
  transitionState: ModalTransitionStateValue | null | undefined;
  onClose: () => void;
  animationVariant?: ModalAnimationVariant;
  size?: BaseModalSize;
  paddingSize?: BaseModalPaddingSize;
  // Fill the screen on small viewports.
  fullScreenOnMobile?: boolean;
  returnRef?: RefObject<HTMLElement | null>;
  role?: 'dialog' | 'alertdialog';
  // Labels the dialog; without it, the modal's heading does.
  'aria-label'?: string;
  // When false, the header shows no close button.
  dismissable?: boolean;
  // 'viewport' lets the modal grow to the height of the viewport.
  maxHeight?: 'default' | 'viewport';
  // Rendered inside the outer container, before the modal itself.
  contentOutsideContainer?: ReactNode;
  // Sent with the impression the client tracks when the modal mounts.
  trackingProps?: Record<string, unknown>;
  children?: ReactNode;
}

// The modal chrome every Mana modal builds on: the dialog, the enter/exit animation, size, padding
// and focus handling, without any header, body or action bar.
export const BaseModal = ({
  transitionState,
  animationVariant = 'default',
  size = 'md',
  paddingSize = 'sm',
  fullScreenOnMobile = true,
  returnRef,
  role = 'dialog',
  'aria-label': ariaLabel,
  dismissable = true,
  maxHeight = 'default',
  onClose,
  contentOutsideContainer,
  trackingProps,
  children,
}: BaseModalProps) => {
  const id = useId();
  const context = useMemo(() => ({ id, headingId: `heading-${id}`, onClose, dismissable }), [dismissable, id, onClose]);
  const style = useModalTransitionStyle(transitionState, animationVariant);
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <ManaModalContext.Provider value={context}>
      <Dialog
        id={id}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel != null ? undefined : context.headingId}
        returnRef={returnRef}
        trackingProps={trackingProps}
        trackingComponentName="Modal"
      >
        <HeadingLevel forceLevel={1}>
          <div className={clsx(styles.outerContainer, { [styles.fullScreenOnMobile]: fullScreenOnMobile })}>
            {contentOutsideContainer}
            <animated.div
              ref={containerRef}
              data-mana-component="modal"
              className={clsx(styles.container, styles[`size-${size}`], styles[`padding-size-${paddingSize}`], {
                [styles.maxHeightViewport]: maxHeight === 'viewport',
                [styles.exiting]:
                  transitionState === ModalTransitionState.EXITING || transitionState === ModalTransitionState.EXITED,
              })}
              style={style}
            >
              <FocusRingScope containerRef={containerRef}>{children}</FocusRingScope>
            </animated.div>
          </div>
        </HeadingLevel>
      </Dialog>
    </ManaModalContext.Provider>
  );
};

BaseModal.displayName = 'BaseModal';
