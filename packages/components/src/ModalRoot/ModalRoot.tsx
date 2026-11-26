import { useContext, useId, useMemo, useRef, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { animated } from '@react-spring/web';
import clsx from 'clsx';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { ModalContext, ModalTransitionState, type ModalTransitionStateValue } from '../Dialog/ModalContext';
import { FocusRingScope } from '../FocusRing';
import { useSpring } from '../hooks';
import { ModalFocusLock } from './ModalFocusLock';
import styles from './ModalRoot.module.css';

export const ModalSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  // Sized by its content.
  DYNAMIC: 'dynamic',
} as const;

export type ModalSizeValue = (typeof ModalSize)[keyof typeof ModalSize];

export const ModalAnimation = {
  DEFAULT: 'default',
  // Fades without scaling.
  SUBTLE: 'subtle',
} as const;

export type ModalAnimationValue = (typeof ModalAnimation)[keyof typeof ModalAnimation];

const SIZE_CLASS_NAMES: Readonly<Record<ModalSizeValue, string | null>> = Object.freeze({
  small: styles.small,
  medium: styles.medium,
  large: styles.large,
  dynamic: null,
});

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

const noop = () => {};

export interface ModalRootProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationEnd'> {
  transitionState: ModalTransitionStateValue | null | undefined;
  children?: ReactNode;
  size?: ModalSizeValue;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  fullscreenOnMobile?: boolean;
  hideShadow?: boolean;
  // Called when the enter or exit animation comes to rest.
  onAnimationEnd?: () => void;
  returnRef?: RefObject<HTMLElement | null>;
  animation?: ModalAnimationValue;
  // Reported with the client's impression analytics (not tracked without the app).
  parentComponent?: string;
  [key: `data-${string}`]: unknown;
}

// The root of Discord's older modals: a focus-locked dialog that scales and fades in and out with
// the modal's transition state.
export const ModalRoot = ({
  transitionState,
  children,
  size = ModalSize.SMALL,
  role = 'dialog',
  className,
  fullscreenOnMobile = true,
  hideShadow = false,
  onAnimationEnd = noop,
  returnRef,
  animation = ModalAnimation.DEFAULT,
  parentComponent: _parentComponent,
  ...props
}: ModalRootProps) => {
  const visible = transitionState === ModalTransitionState.ENTERING || transitionState === ModalTransitionState.ENTERED;
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const style = useSpring(
    {
      opacity: visible ? 1 : 0,
      transform: visible || reducedMotion.enabled || animation === ModalAnimation.SUBTLE ? 'scale(1)' : 'scale(0.7)',
      config: { duration: 200, easing: easeOutQuad, clamp: true },
      onRest: onAnimationEnd,
    },
    'animate-always',
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const hasLabel = props['aria-label'] != null;
  const headerIdIsManaged = props['aria-labelledby'] != null;
  const generatedId = useId();
  const headerId = props['aria-labelledby'] ?? generatedId;
  const context = useMemo(
    () => ({ headerId, headerIdIsManaged, transitionState: transitionState ?? undefined }),
    [headerId, headerIdIsManaged, transitionState],
  );
  return (
    <ModalContext.Provider value={context}>
      <ModalFocusLock
        className={styles.focusLock}
        role={role}
        returnRef={returnRef}
        aria-labelledby={hasLabel ? undefined : context.headerId}
        {...props}
      >
        <animated.div
          className={clsx(className, styles.root, SIZE_CLASS_NAMES[size], {
            [styles.fullscreenOnMobile]: fullscreenOnMobile,
            [styles.rootWithShadow]: !hideShadow,
          })}
          ref={rootRef}
          style={style}
        >
          <FocusRingScope containerRef={rootRef}>{children}</FocusRingScope>
        </animated.div>
      </ModalFocusLock>
    </ModalContext.Provider>
  );
};

ModalRoot.displayName = 'ModalRoot';
