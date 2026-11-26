import { useContext } from 'react';
import { useTransitionStyles } from '@floating-ui/react';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useDropdownFloating } from '../hooks/useDropdownFloating';

/** The dropdown of a Select: below the field, as wide as it, scaling in unless motion is reduced. */
export const useSelectFloating = () => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  const { isOpen, setIsOpen, refs, floatingStyles, getReferenceProps, getFloatingProps, context } = useDropdownFloating(
    { placement: 'bottom', matchReferenceWidth: true, transform: reducedMotion.enabled },
  );
  const { styles } = useTransitionStyles(context, {
    common: { transformOrigin: 'top center' },
    initial: { opacity: 0.5, transform: 'scaleY(0.96)' },
    duration: 100,
  });
  return {
    isOpen,
    setIsOpen,
    refs,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
    transitionStyles: reducedMotion.enabled ? {} : styles,
  };
};
