import type { ReactNode } from 'react';
import { BaseModal, type BaseModalProps } from './BaseModal';
import { ModalActionBar, type ModalAction, type ModalActionBarLayout } from './ModalActionBar';
import { ModalBody, hasModalBodyContent, type ModalBodyListProps, type ModalBodyProps } from './ModalBody';
import { ModalFooter } from './ModalFooter';
import { ModalHeader, type ModalSubtitle } from './ModalHeader';
import { ModalNotice, type ModalNoticeProps } from './ModalNotice';

export type ModalSize = 'sm' | 'md';

export interface ModalProps extends Omit<BaseModalProps, 'size' | 'paddingSize' | 'children'> {
  // Defaults to 'md' when the modal has an input, a body or a list, and 'sm' otherwise.
  size?: ModalSize;
  title: string;
  subtitle?: ModalSubtitle;
  // Controls above the body (e.g. a search input).
  input?: ReactNode;
  // Content shown under the body, above the actions.
  preview?: ReactNode;
  actions?: ModalAction[];
  // Content before the actions (e.g. a checkbox); the actions then stop being full width.
  actionBarInput?: ReactNode;
  actionBarInputLayout?: ModalActionBarLayout;
  listProps?: ModalBodyListProps;
  notice?: ModalNoticeProps;
  onScroll?: () => void;
  scrollerRef?: ModalBodyProps['scrollerRef'];
  children?: ReactNode;
}

// The standard modal: a header with title and subtitle, an optional notice, a scrolling body, an
// optional preview and the action bar.
export const Modal = ({
  size,
  title,
  subtitle,
  input,
  preview,
  actions,
  actionBarInput,
  actionBarInputLayout = 'default',
  listProps,
  notice,
  onScroll,
  scrollerRef,
  children,
  'aria-label': ariaLabel,
  ...props
}: ModalProps) => {
  const resolvedSize =
    size ??
    (input != null || actionBarInput != null || hasModalBodyContent(children) || listProps != null ? 'md' : 'sm');
  return (
    <BaseModal {...props} aria-label={ariaLabel ?? title} size={resolvedSize}>
      <ModalHeader title={title} subtitle={subtitle} />
      <ModalNotice message={notice?.message} type={notice?.type} role={notice?.role} />
      <ModalBody controls={input} listProps={listProps} onScroll={onScroll} scrollerRef={scrollerRef}>
        {children}
      </ModalBody>
      <ModalFooter>{preview}</ModalFooter>
      <ModalActionBar
        leading={actionBarInput}
        leadingLayout={actionBarInputLayout}
        actions={actions}
        actionsFullWidth={actionBarInput == null}
      />
    </BaseModal>
  );
};

Modal.displayName = 'Modal';
