import { useEffect, useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { CircleCheckIcon, CircleErrorIcon, CircleInformationIcon, WarningIcon } from '@discord-components/icons';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { Button } from '../Button';
import { CloseButton } from '../CloseButton';
import { HiddenVisually } from '../HiddenVisually';
import { useManaContext, type ManaI18n } from '../ManaContext';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { tokens } from '../tokens';
import { getTextContent } from '../utils/getTextContent';
import styles from './InlineNotice.module.css';

export type InlineNoticeType = 'info' | 'success' | 'warning' | 'critical';

// `alert` announces right away, `status` politely once the notice shows, `none` doesn't announce.
export type InlineNoticeRole = 'alert' | 'status' | 'none';

export interface InlineNoticeAction {
  text: string;
  onClick: () => void;
  loading?: boolean;
}

export interface InlineNoticeProps {
  type: InlineNoticeType;
  title?: ReactNode;
  message: ReactNode;
  // Shown as a bulleted list under the message.
  messageList?: ReactNode[];
  onDismiss?: () => void;
  action?: InlineNoticeAction;
  role?: InlineNoticeRole;
  // Collapses the notice with its exit animation (and expands it again when unset).
  hidden?: boolean;
}

const TITLE_VARIANT = 'body-sm/semibold';
const MESSAGE_VARIANT = 'body-sm/normal';

const NoticeIcon = ({ type }: { type: InlineNoticeType }) => {
  switch (type) {
    case 'success':
      return <CircleCheckIcon color={tokens.colors.ICON_FEEDBACK_POSITIVE} size="xs" aria-hidden />;
    case 'critical':
      return <CircleErrorIcon color={tokens.colors.ICON_FEEDBACK_CRITICAL} size="xs" aria-hidden />;
    case 'info':
      return <CircleInformationIcon color={tokens.colors.ICON_FEEDBACK_INFO} size="xs" aria-hidden />;
    default:
      return <WarningIcon color={tokens.colors.ICON_FEEDBACK_WARNING} size="xs" aria-hidden />;
  }
};

NoticeIcon.displayName = 'NoticeIcon';

const getIconLabel = (type: InlineNoticeType, i18n: ManaI18n) => {
  switch (type) {
    case 'critical':
      return i18n.FEEDBACK_CRITICAL_ICON_A11Y_LABEL;
    case 'warning':
      return i18n.FEEDBACK_WARNING_ICON_A11Y_LABEL;
    case 'info':
      return i18n.FEEDBACK_INFO_ICON_A11Y_LABEL;
    case 'success':
      return i18n.FEEDBACK_POSITIVE_ICON_A11Y_LABEL;
  }
};

const MessageList = ({ intro, items }: { intro?: ReactNode; items: ReactNode[] }) => {
  const list = (
    <ul className={styles.messageList}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
  if (intro == null) return list;
  return (
    <Stack gap={4}>
      <div>{intro}</div>
      {list}
    </Stack>
  );
};

MessageList.displayName = 'MessageList';

const EnterExit = ({ hidden = false, children }: { hidden?: boolean; children: ReactNode }) => (
  <div className={clsx(styles.enterExit, { [styles.enterExitHidden]: hidden })}>
    <div className={styles.enterExitClip}>{children}</div>
  </div>
);

EnterExit.displayName = 'EnterExit';

export const InlineNotice = ({
  type,
  title,
  message,
  messageList,
  onDismiss,
  action,
  role,
  hidden,
}: InlineNoticeProps) => {
  const { i18n } = useManaContext();
  const labelId = useId();
  const messageId = useId();
  const iconLabel = getIconLabel(type, i18n);
  const announcement = [
    iconLabel,
    getTextContent(title),
    getTextContent(message),
    ...(messageList ?? []).map(getTextContent),
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (role === 'status' && !hidden) AccessibilityAnnouncer.announce(announcement, 'polite');
  }, [role, hidden, announcement]);

  const iconVariant = title != null ? TITLE_VARIANT : MESSAGE_VARIANT;
  return (
    <EnterExit hidden={hidden}>
      <div role={role === 'alert' ? 'alert' : undefined} className={clsx(styles.container, styles[type])}>
        <div className={styles.iconAndTextContainer}>
          <Text variant={iconVariant} color="none" className={styles.iconContainer}>
            <NoticeIcon type={type} />
          </Text>
          <div className={clsx(styles.contentsContainer, { [styles.vertical]: onDismiss != null })}>
            <div className={styles.copyContainer}>
              <HiddenVisually id={labelId}>{iconLabel}:</HiddenVisually>
              {title == null ? null : (
                <Text id={messageId} variant={TITLE_VARIANT} color="text-strong">
                  {title}
                </Text>
              )}
              <Text id={title == null ? messageId : undefined} variant={MESSAGE_VARIANT} color="text-strong">
                {messageList != null ? <MessageList intro={message} items={messageList} /> : message}
              </Text>
            </div>
            {action == null ? null : (
              <Button
                variant="secondary"
                size="sm"
                text={action.text}
                onClick={action.onClick}
                loading={action.loading}
              />
            )}
          </div>
        </div>
        {onDismiss != null ? (
          <Text variant={iconVariant} color="none" className={styles.iconContainer}>
            <CloseButton
              aria-label={i18n.DISMISS_BUTTON_LABEL}
              aria-describedby={`${labelId} ${messageId}`}
              size="sm"
              onClick={onDismiss}
            />
          </Text>
        ) : null}
      </div>
    </EnterExit>
  );
};

InlineNotice.displayName = 'InlineNotice';
