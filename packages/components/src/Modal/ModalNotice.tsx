import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { InlineNotice, type InlineNoticeType } from '../InlineNotice';
import styles from './Modal.module.css';

export type ModalNoticeRole = 'status' | 'alert';

export interface ModalNoticeProps {
  message?: string;
  type?: InlineNoticeType;
  role?: ModalNoticeRole;
}

// A notice under the modal's header. It stays mounted when cleared so it can animate out with its
// last message.
export const ModalNotice = ({ message, type, role }: ModalNoticeProps) => {
  const hidden = message == null || message.length === 0 || type == null;
  const [shownType, setShownType] = useState<InlineNoticeType>(type ?? 'info');
  const [shownMessage, setShownMessage] = useState(message ?? '');
  const [shownRole, setShownRole] = useState<ModalNoticeRole>(role ?? 'status');
  useEffect(() => {
    // Keeps the last values while hidden, so the notice animates out with them.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (type != null) setShownType(type);
    if (message != null) setShownMessage(message);
    if (role != null) setShownRole(role);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [type, message, role]);
  return (
    <div className={hidden ? clsx(styles.sectionHidden, styles.section) : styles.section}>
      <InlineNotice type={shownType} hidden={hidden} message={shownMessage} role={shownRole} />
    </div>
  );
};

ModalNotice.displayName = 'ModalNotice';
