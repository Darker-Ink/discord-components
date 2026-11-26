import { createContext, useContext } from 'react';

export interface ManaModalContextValue {
  // When false, the header shows no close button.
  dismissable: boolean;
  onClose: () => void;
  id: string;
  // The id of the modal's title, which labels the dialog unless it has an aria-label.
  headingId: string;
}

export const ManaModalContext = createContext<ManaModalContextValue>({
  dismissable: true,
  onClose: () => {},
  id: 'modal-id',
  headingId: 'modal-heading-id',
});

ManaModalContext.displayName = 'ManaModalContext';

export const useModalContext = () => {
  const context = useContext(ManaModalContext);
  if (context == null) throw Error('useModalContext must be used within a ModalContext.Provider');
  return context;
};
