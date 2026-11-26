import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { XSmallIcon } from '@discord-components/icons';
import { Anchor, type AnchorProps } from '../Anchor';
import { Clickable } from '../Clickable';
import { FocusRing } from '../FocusRing';
import { isMobile } from '../utils/platform';
import styles from './Notice.module.css';

export const NoticeColors = Object.freeze({
  DEFAULT: styles.colorDefault,
  NEUTRAL: styles.colorNeutral,
  BRAND: styles.colorBrand,
  WARNING: styles.colorWarning,
  DANGER: styles.colorDanger,
  INFO: styles.colorInfo,
  STREAMER_MODE: styles.colorStreamerMode,
  CUSTOM: clsx(styles.colorCustom, styles.colorInfo),
  SPOTIFY: styles.colorSpotify,
  PREMIUM_TIER_0: clsx(styles.colorPremiumTier0, styles.colorPremium),
  PREMIUM_TIER_1: clsx(styles.colorPremiumTier1, styles.colorPremium),
  PREMIUM_TIER_2: clsx(styles.colorPremiumTier2, styles.colorPremium),
});

export type NoticeColor = (typeof NoticeColors)[keyof typeof NoticeColors];

// The client's English string.
const DISMISS_LABEL = 'Dismiss';

export interface NoticeProps {
  color?: NoticeColor;
  className?: string;
  style?: CSSProperties | null;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export const Notice = ({ color = NoticeColors.DEFAULT, className, style, ref, children }: NoticeProps) => (
  <div
    ref={ref}
    className={clsx(styles.notice, { [styles.isMobile]: isMobile }, className, color)}
    style={style ?? undefined}
  >
    {children}
  </div>
);

Notice.displayName = 'Notice';

export interface NoticeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  minor?: boolean;
}

export const NoticeButton = ({ children, className, minor = false, ...props }: NoticeButtonProps) => (
  <FocusRing>
    <button className={clsx(styles.button, className, { [styles.buttonMinor]: minor })} {...props}>
      {children}
    </button>
  </FocusRing>
);

NoticeButton.displayName = 'NoticeButton';

// `noticeType` names the notice in Discord's analytics events (APP_NOTICE_*); there's no analytics here.
export interface PrimaryCTANoticeButtonProps extends NoticeButtonProps {
  noticeType?: string;
}

export const PrimaryCTANoticeButton = ({
  children,
  noticeType: _noticeType,
  ...props
}: PrimaryCTANoticeButtonProps) => <NoticeButton {...props}>{children}</NoticeButton>;

PrimaryCTANoticeButton.displayName = 'PrimaryCTANoticeButton';

export interface NoticeButtonAnchorProps extends AnchorProps {
  noticeType?: string;
}

export const NoticeButtonAnchor = ({ children, href, noticeType: _noticeType, ...props }: NoticeButtonAnchorProps) => (
  <Anchor {...props} className={styles.button} href={href}>
    {children}
  </Anchor>
);

NoticeButtonAnchor.displayName = 'NoticeButtonAnchor';

export interface NoticeCloseButtonProps {
  onClick: () => void;
  noticeType?: string;
  className?: string;
}

export const NoticeCloseButton = ({ onClick, noticeType: _noticeType, className }: NoticeCloseButtonProps) => (
  <Clickable
    focusProps={{ offset: 6 }}
    className={clsx(styles.closeButton, className)}
    onClick={() => onClick()}
    aria-label={DISMISS_LABEL}
  >
    <XSmallIcon size="sm" color="currentColor" className={styles.closeIcon} />
  </Clickable>
);

NoticeCloseButton.displayName = 'NoticeCloseButton';
