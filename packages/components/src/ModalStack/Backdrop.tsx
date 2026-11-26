import { animated } from '@react-spring/web';
import clsx from 'clsx';
import { useTransition } from '../hooks';
import styles from './Backdrop.module.css';
import { MODAL_ENTER_SPRING_CONFIG } from './useModalTransitionStyle';

export type BackdropVariant = 'default' | 'lightbox' | 'experimental_blur';

export interface BackdropProps {
  variant?: BackdropVariant;
  animationVariant?: 'default' | 'instant';
  onClick?: () => void;
  isVisible: boolean;
  disabled?: boolean;
  disablePointerEvents?: boolean;
}

// The scrim behind open modals; fades in and out with them.
export const Backdrop = ({
  variant = 'default',
  animationVariant = 'default',
  onClick,
  isVisible,
  disabled = false,
  disablePointerEvents = false,
}: BackdropProps) => {
  const transition = useTransition(
    isVisible,
    {
      keys: (visible: boolean) => (visible ? 'scrim' : 'empty'),
      config: MODAL_ENTER_SPRING_CONFIG,
      from: { opacity: 0 },
      enter: { opacity: 1 },
      leave: { opacity: 0 },
    },
    animationVariant === 'instant' ? 'animate-never' : 'animate-always',
  );
  return transition((style, visible) =>
    visible ? (
      <animated.div
        role="none"
        className={clsx(styles.scrim, {
          [styles.lightbox]: variant === 'lightbox',
          [styles.blur]: variant === 'experimental_blur',
          [styles.pointerEventsNone]: disablePointerEvents,
        })}
        style={style}
        onClick={disabled ? undefined : onClick}
      />
    ) : null,
  );
};

Backdrop.displayName = 'Backdrop';
