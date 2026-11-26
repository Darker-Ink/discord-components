import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
  type RefObject,
} from 'react';
import { DialogAnnouncerTarget } from '../Dialog/Dialog';
import { useFocusLock } from '../Dialog/useFocusLock';
import { FocusRingScope } from '../FocusRing';
import { HeadingLevel } from '../HeadingLevel';

export interface ModalFocusLockContextValue {
  inDialog: boolean | undefined;
  // Lets content (e.g. an embedded iframe flow) release the focus trap while it needs to.
  setFocusLockDisabled?: (disabled: boolean) => void;
}

export const ModalFocusLockContext = createContext<ModalFocusLockContextValue>({ inDialog: undefined });

ModalFocusLockContext.displayName = 'ModalFocusLockContext';

export interface ModalImpression {
  impressionName?: string;
  impressionProperties?: Record<string, unknown>;
}

export interface ModalFocusLockProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  returnRef?: RefObject<HTMLElement | null>;
  // Analytics impression the client tracks when the dialog mounts (not tracked without the app).
  impressionType?: string;
  impression?: ModalImpression;
  disableTrack?: boolean;
  [key: `data-${string}`]: unknown;
}

// The modal dialog element of Discord's older modals: traps focus, is announced as a modal dialog
// and starts a new heading level.
export const ModalFocusLock = ({
  ref,
  children,
  impressionType: _impressionType,
  impression: _impression,
  disableTrack: _disableTrack,
  returnRef,
  ...props
}: ModalFocusLockProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const disabledRef = useRef<HTMLDivElement | null>(null);
  const [focusLockDisabled, setFocusLockDisabledState] = useState(false);
  useFocusLock(focusLockDisabled ? disabledRef : containerRef, { returnRef });
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref != null) ref.current = element;
    },
    [ref],
  );
  const setFocusLockDisabled = useCallback(
    (disabled: boolean) => {
      if (focusLockDisabled !== disabled) setFocusLockDisabledState(disabled);
    },
    [focusLockDisabled],
  );
  const context = useMemo(() => ({ inDialog: true, setFocusLockDisabled }), [setFocusLockDisabled]);
  return (
    <ModalFocusLockContext.Provider value={context}>
      <div {...props} ref={setRef} role="dialog" tabIndex={-1} aria-modal>
        <DialogAnnouncerTarget />
        <HeadingLevel forceLevel={1}>
          <FocusRingScope containerRef={containerRef}>{children}</FocusRingScope>
        </HeadingLevel>
      </div>
    </ModalFocusLockContext.Provider>
  );
};

ModalFocusLock.displayName = 'ModalFocusLock';
