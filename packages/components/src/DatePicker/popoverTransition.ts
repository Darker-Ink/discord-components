import type { UseTransitionStylesProps } from '@floating-ui/react';

// The calendar popover grows out of the field, from whichever edge it's attached to.
export const PICKER_POPOVER_TRANSITION: UseTransitionStylesProps = {
  common: ({ side }) => ({ transformOrigin: `${side === 'top' ? 'bottom' : 'top'} center` }),
  initial: { opacity: 0.5, transform: 'scaleY(0.96)' },
  duration: 100,
};
