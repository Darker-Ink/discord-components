import type { ReactNode } from 'react';
import { PopoverPortalTarget } from '../FloatingLayer';
import { AppLayerContainer, AppLayerProvider } from '../Layer/AppLayer';
import { VerificationLayerContainer, VerificationLayerProvider } from '../Layer/VerificationLayer';
import { ModalStack } from './ModalStack';

const CONTENTS = { display: 'contents' } as const;

// Everything modals and popouts need around an app, arranged like Discord's client root: the App and
// Verification layer providers, the modal stack after the app's content, and then the containers
// overlays portal into (#popover-portal, the App layer and the Verification layer) inside two
// `display: contents` wrappers.
export const ModalLayerRoot = ({ children }: { children?: ReactNode }) => (
  <AppLayerProvider>
    <VerificationLayerProvider>
      {children}
      <ModalStack />
      <div style={CONTENTS}>
        <div style={CONTENTS}>
          <PopoverPortalTarget />
          <AppLayerContainer />
          <VerificationLayerContainer />
        </div>
      </div>
    </VerificationLayerProvider>
  </AppLayerProvider>
);

ModalLayerRoot.displayName = 'ModalLayerRoot';
