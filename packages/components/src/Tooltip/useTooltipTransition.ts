import { useContext } from 'react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useTransition } from '../hooks';

const SPRING_CONFIG = { tension: 2400, friction: 52 };

// Scale-and-fade in/out for tooltips (fade only with reduced motion).
export const useTooltipTransition = ({
  shouldShow,
  onExitComplete,
  onAnimationRest,
}: {
  shouldShow: boolean;
  onExitComplete?: () => void;
  onAnimationRest?: (...args: unknown[]) => void;
}) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const hidden = { scale: 0.95, opacity: 0 };
  const reducedHidden = { scale: 1, opacity: 0 };
  return useTransition(
    shouldShow,
    {
      keys: (show: boolean) => (show ? 'tooltip' : 'empty'),
      config: SPRING_CONFIG,
      from: reducedMotion.enabled ? reducedHidden : hidden,
      enter: { scale: 1, opacity: 1 },
      leave: reducedMotion.enabled ? reducedHidden : hidden,
      onRest: (...args: unknown[]) => {
        if (!shouldShow) onExitComplete?.();
        onAnimationRest?.(...args);
      },
    },
    'animate-always',
  );
};
