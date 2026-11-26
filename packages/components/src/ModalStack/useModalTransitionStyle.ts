import { useContext } from 'react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { ModalTransitionState, type ModalTransitionStateValue } from '../Dialog/ModalContext';
import { useSpring } from '../hooks';

export const MODAL_ENTER_SPRING_CONFIG = { mass: 1, tension: 1000, friction: 48 };
export const MODAL_EXIT_SPRING_CONFIG = { mass: 1, tension: 1200, friction: 80 };

export type ModalAnimationVariant = 'default' | 'subtle';

// The fade and scale a modal enters and leaves with; 'subtle' (and reduced motion) only fades.
export const useModalTransitionStyle = (
  transitionState: ModalTransitionStateValue | null | undefined,
  animationVariant?: ModalAnimationVariant,
) => {
  const visible = transitionState === ModalTransitionState.ENTERING || transitionState === ModalTransitionState.ENTERED;
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const transform = visible || reducedMotion.enabled || animationVariant === 'subtle' ? 'scale(1)' : 'scale(0.9)';
  return useSpring(
    {
      opacity: visible ? 1 : 0,
      transform,
      config: visible ? MODAL_ENTER_SPRING_CONFIG : MODAL_EXIT_SPRING_CONFIG,
      delay: visible ? 64 : 0,
    },
    'animate-always',
  );
};
