import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Tooltip, tokens } from '@discord-components/components';
import { CheckmarkSmallBoldIcon } from '@discord-components/icons';
import { useMessageI18n } from './messageI18n';
import styles from './BotTag.module.css';

export const BotTagTypes = {
  BOT: 0,
  SERVER: 1,
  SYSTEM_DM: 2,
  OFFICIAL: 3,
  STAFF_ONLY_DM: 4,
  ORIGINAL_POSTER: 5,
  NOT_STAFF_WARNING: 6,
} as const;

export type BotTagType = (typeof BotTagTypes)[keyof typeof BotTagTypes];

export interface BotTagProps {
  type?: BotTagType;
  className?: string;
  /** Adds the verified checkmark (verified apps). */
  verified?: boolean;
  invertColor?: boolean;
  hideIcon?: boolean;
  /** Sizes in rem so the tag scales with the chat font size (messages do). */
  useRemSizes?: boolean;
  children?: ReactNode;
}

/** The "APP" tag after an app's name (and the server, official and OP variants). */
export const BotTag = ({
  invertColor = false,
  type = BotTagTypes.BOT,
  className,
  verified: verifiedProp,
  hideIcon = false,
  useRemSizes = false,
  children,
}: BotTagProps) => {
  const i18n = useMessageI18n();
  let verified = verifiedProp;
  let verifiedLabel = i18n.VERIFIED_APP;
  let text: string;
  let colorClass = clsx(invertColor ? styles.botTagInvert : styles.botTagRegular, styles.botTag);
  switch (type) {
    case BotTagTypes.SYSTEM_DM:
    case BotTagTypes.OFFICIAL:
      verified = true;
      verifiedLabel = i18n.OFFICIAL_MESSAGE;
      text = i18n.OFFICIAL_TAG;
      break;
    case BotTagTypes.SERVER:
      text = i18n.SERVER_TAG;
      break;
    case BotTagTypes.ORIGINAL_POSTER:
      text = 'OP';
      break;
    case BotTagTypes.STAFF_ONLY_DM:
      text = 'STAFF ONLY';
      break;
    case BotTagTypes.NOT_STAFF_WARNING:
      text = 'NOT STAFF';
      colorClass = clsx(styles.botTagNotStaffWarning, styles.botTag);
      break;
    default:
      text = i18n.APP_TAG;
  }
  const isOP = type === BotTagTypes.ORIGINAL_POSTER;
  const icon = verified ? (
    <Tooltip text={verifiedLabel} align="center" position="top">
      <CheckmarkSmallBoldIcon className={styles.botTagVerified} color={tokens.colors.WHITE} />
    </Tooltip>
  ) : null;
  let label: string | undefined;
  if (verified) label = verifiedLabel;
  else if (type === BotTagTypes.BOT) label = i18n.APP_TAG_LABEL;
  else if (type === BotTagTypes.SERVER) label = i18n.SERVER_TAG_LABEL;
  else label = text;
  const tag = (
    <span
      role="img"
      aria-label={label}
      className={clsx(
        className,
        colorClass,
        useRemSizes ? styles.rem : styles.px,
        isOP ? clsx(styles.botTagOP, styles.botTag) : null,
      )}
    >
      {hideIcon ? null : icon}
      {children}
      <span className={styles.botText}>{text}</span>
    </span>
  );
  return isOP ? (
    <Tooltip text="Original Poster" position="top" asContainer>
      {tag}
    </Tooltip>
  ) : (
    tag
  );
};

BotTag.displayName = 'BotTag';
