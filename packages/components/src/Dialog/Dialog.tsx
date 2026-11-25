import {
  createContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type Ref,
  type RefObject,
} from 'react';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { FocusRingScope } from '../FocusRing';
import { HeadingLevel } from '../HeadingLevel';
import { HiddenVisually } from '../HiddenVisually';
import { useManaContext } from '../ManaContext';
import { JumpSection, type JumpSectionProps } from './jumpSection';
import { useFocusLock } from './useFocusLock';

export interface DialogContextValue {
  // Props for the first focusable element of a non-modal dialog, so F6 can jump into it.
  firstFocusableItemProps: JumpSectionProps | undefined;
}

export const DialogContext = createContext<DialogContextValue>({ firstFocusableItemProps: undefined });

DialogContext.displayName = 'DialogContext';

// A hidden node inside the dialog that screen reader announcements move into while it is open
// (a modal hides everything outside it from assistive technology).
export const DialogAnnouncerTarget = () => {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    frameRef.current = requestAnimationFrame(() => {
      timeoutRef.current = setTimeout(() => {
        AccessibilityAnnouncer.moveTo(id, ref.current);
      }, 0);
    });
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      AccessibilityAnnouncer.remove(id);
    };
  }, [id]);
  return <HiddenVisually ref={ref} id={id} />;
};

DialogAnnouncerTarget.displayName = 'DialogAnnouncerTarget';

type DivProps = HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: unknown };

interface DialogElementProps extends DivProps {
  ref: RefObject<HTMLDivElement | null>;
}

const ModalDialog = ({ children, ref, role = 'dialog', ...props }: DialogElementProps) => (
  <DialogContext.Provider value={{ firstFocusableItemProps: undefined }}>
    <div {...props} ref={ref} data-dialog="modal" role={role} aria-modal tabIndex={-1}>
      <DialogAnnouncerTarget />
      <HeadingLevel forceLevel={1}>
        <FocusRingScope containerRef={ref}>{children}</FocusRingScope>
      </HeadingLevel>
    </div>
  </DialogContext.Provider>
);

ModalDialog.displayName = 'ModalDialog';

const NonModalDialog = ({ children, role = 'dialog', ...props }: DialogElementProps) => (
  <JumpSection>
    {(jumpSectionProps) => (
      <DialogContext.Provider value={{ firstFocusableItemProps: jumpSectionProps }}>
        <div {...props} data-dialog="non-modal" role={role}>
          <DialogAnnouncerTarget />
          {children}
        </div>
      </DialogContext.Provider>
    )}
  </JumpSection>
);

NonModalDialog.displayName = 'NonModalDialog';

export interface DialogProps extends DivProps {
  ref?: Ref<HTMLDivElement | null>;
  // Where focus goes when the dialog closes; defaults to what was focused when it opened.
  returnRef?: RefObject<HTMLElement | null>;
  // Modal dialogs trap focus and are announced as modal; non-modal ones join F6 navigation.
  modal?: boolean;
  setDialogRef?: (element: HTMLDivElement | null) => void;
  trackingProps?: Record<string, unknown>;
  trackingComponentName?: string;
}

export const Dialog = ({
  ref,
  returnRef,
  modal = true,
  setDialogRef,
  trackingProps,
  trackingComponentName = 'Dialog',
  ...props
}: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(ref, () => dialogRef.current, []);
  useEffect(() => {
    setDialogRef?.(dialogRef.current);
    return () => {
      setDialogRef?.(null);
    };
    // Reports the element once, like a callback ref that never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { trackImpression } = useManaContext();
  useEffect(() => {
    if (trackImpression != null && trackingProps != null) {
      trackImpression({ componentName: trackingComponentName, payload: trackingProps });
    }
  }, [trackImpression, trackingComponentName, trackingProps]);
  useFocusLock(dialogRef, { returnRef, disable: !modal });
  const DialogElement = modal ? ModalDialog : NonModalDialog;
  return <DialogElement {...props} ref={dialogRef} />;
};

Dialog.displayName = 'Dialog';
