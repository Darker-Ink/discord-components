import { createContext } from 'react';

export const ModalTransitionState = {
  ENTERING: 0,
  ENTERED: 1,
  EXITING: 2,
  EXITED: 3,
  HIDDEN: 4,
} as const;

export type ModalTransitionStateValue = (typeof ModalTransitionState)[keyof typeof ModalTransitionState];

// The modal stack a modal belongs to, unless the app opens it in another one.
export const DEFAULT_MODAL_CONTEXT = 'default';

export interface ModalContextValue {
  headerId: string | undefined;
  headerIdIsManaged: boolean;
  // Set while inside a modal; popovers inside stay hidden until the modal has finished entering.
  transitionState: ModalTransitionStateValue | undefined;
}

export const ModalContext = createContext<ModalContextValue>({
  headerId: undefined,
  headerIdIsManaged: false,
  transitionState: undefined,
});

ModalContext.displayName = 'ModalContext';
