import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ButtonVariant } from '../Button';
import { useManaContext } from '../ManaContext';
import { openModal } from '../ModalStack/modalStore';
import { Modal, type ModalProps } from './Modal';
import { ModalActionBarCheckbox, type ModalActionBarCheckboxProps } from './ModalActionBar';

export interface ConfirmModalProps extends Omit<ModalProps, 'actions' | 'actionBarInput' | 'role' | 'notice'> {
  confirmText: string;
  cancelText?: string;
  // Adds a checkbox (e.g. "Don't show again") before the buttons.
  checkboxProps?: ModalActionBarCheckboxProps;
  // Awaited before the modal closes; throwing keeps it open with an error notice. Call `setError`
  // to choose that notice's message.
  onConfirm?: (setError: (message: string | undefined) => void) => unknown;
  onCancel?: () => void;
  // Called when the modal unmounts, however it was closed.
  onCloseCallback?: () => void;
  variant?: ButtonVariant | 'critical';
  children?: ReactNode;
}

// A modal asking to confirm an action, with Cancel and confirm buttons. The confirm button shows a
// spinner while `onConfirm` runs.
export const ConfirmModal = ({
  confirmText,
  cancelText,
  checkboxProps,
  onConfirm,
  onCancel,
  onCloseCallback,
  variant = 'critical',
  children,
  ...props
}: ConfirmModalProps) => {
  const { i18n } = useManaContext();
  const defaultCancelText = i18n.CANCEL;
  const genericError = i18n.INLINE_NOTICE_GENERIC_ERROR;
  const [pending, setPending] = useState(false);
  const onCloseCallbackRef = useRef(onCloseCallback);
  useLayoutEffect(() => {
    onCloseCallbackRef.current = onCloseCallback;
  });
  useLayoutEffect(
    () => () => {
      onCloseCallbackRef.current?.();
    },
    [],
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const reportError = (message: string | undefined) => {
    setError(message);
  };
  return (
    <Modal
      actions={[
        {
          text: cancelText ?? defaultCancelText,
          variant: 'secondary',
          onClick: () => {
            onCancel?.();
            props.onClose();
          },
        },
        {
          text: confirmText,
          variant: variant === 'critical' ? 'critical-primary' : variant,
          onClick: async () => {
            setError(undefined);
            setPending(true);
            try {
              await onConfirm?.(reportError);
              props.onClose();
            } catch (caught) {
              setPending(false);
              setError((current) => current ?? genericError);
              throw caught;
            }
          },
          disabled: pending,
          loading: pending,
        },
      ]}
      actionBarInput={checkboxProps != null ? <ModalActionBarCheckbox {...checkboxProps} /> : undefined}
      role="alertdialog"
      notice={error != null ? { message: error, type: 'critical', role: 'alert' } : undefined}
      {...props}
    >
      {children}
    </Modal>
  );
};

ConfirmModal.displayName = 'ConfirmModal';

export type OpenConfirmModalProps = Omit<ConfirmModalProps, 'transitionState' | 'onClose'>;

// Opens a ConfirmModal in the modal stack and returns its key.
export const openConfirmModal = (props: OpenConfirmModalProps) =>
  openModal((renderProps) => <ConfirmModal {...renderProps} {...props} />);
