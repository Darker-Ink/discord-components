import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type TransitionEvent,
} from 'react';
import clsx from 'clsx';
import { ThemeTypes } from '@discord-components/tokens';
import {
  CircleErrorIcon,
  CircleInformationIcon,
  StageIcon,
  VideoIcon,
  VoiceNormalIcon,
  WarningIcon,
} from '@discord-components/icons';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';
import { Button, type ButtonProps } from '../Button';
import { CloseButton } from '../CloseButton';
import { Countdown, type CountdownDaysLeftProps, type CountdownTimerProps } from '../Countdown';
import { HiddenVisually } from '../HiddenVisually';
import { useStableCallback } from '../hooks';
import { useManaContext, type ManaI18n } from '../ManaContext';
import { Text } from '../Text';
import { ThemeProvider } from '../Theme';
import { getTextContent } from '../utils/getTextContent';
import styles from './GlobalBanner.module.css';

export type GlobalBannerAction = Omit<ButtonProps, 'size' | 'variant'>;

export type GlobalBannerCountdown =
  Omit<CountdownTimerProps, 'size' | 'variant'> | Omit<CountdownDaysLeftProps, 'size' | 'variant'>;

export interface GlobalBannerHandle {
  // Plays the exit animation, then calls onDismiss.
  dismiss: () => void;
}

// `alert` announces the banner right away, `status` when the screen reader is idle.
export type GlobalBannerRole = 'alert' | 'status';

export type GlobalBannerConnectedAccessory = 'voice' | 'video' | 'stage';

interface GlobalBannerBaseProps {
  // A bold lead-in before the message.
  title?: ReactNode;
  message: ReactNode;
  primaryAction?: GlobalBannerAction;
  // Only shown next to a primary action.
  secondaryAction?: GlobalBannerAction;
  onDismiss?: () => void;
  ref?: Ref<GlobalBannerHandle>;
}

export type GlobalBannerStatusProps = GlobalBannerBaseProps & {
  variant: 'status';
  role: GlobalBannerRole;
} & (
    | { type: 'critical' | 'warning'; leadingAccessory?: never }
    | { type: 'info'; leadingAccessory?: ReactNode }
    | { type: 'connected'; leadingAccessory: GlobalBannerConnectedAccessory }
  );

export interface GlobalBannerPromotionProps extends GlobalBannerBaseProps {
  variant: 'promotion';
  type: 'expressive' | 'nitro';
  leadingAccessory?: ReactNode;
  // A timer for time-limited offers, shown before the message.
  countdown?: GlobalBannerCountdown;
}

export type GlobalBannerProps = GlobalBannerStatusProps | GlobalBannerPromotionProps;

export type GlobalBannerVariant = GlobalBannerProps['variant'];
export type GlobalBannerType = GlobalBannerProps['type'];

// The exit transition runs 400ms; dismiss anyway if it never reports back.
const DISMISS_FALLBACK_MS = 600;
const TEXT_VARIANT = 'body-sm/normal';

const getStatusLabel = (type: GlobalBannerStatusProps['type'], i18n: ManaI18n) => {
  switch (type) {
    case 'critical':
      return i18n.FEEDBACK_CRITICAL_ICON_A11Y_LABEL;
    case 'warning':
      return i18n.FEEDBACK_WARNING_ICON_A11Y_LABEL;
    case 'info':
      return i18n.FEEDBACK_INFO_ICON_A11Y_LABEL;
    case 'connected':
      return null;
  }
};

const StatusIcon = ({ banner }: { banner: GlobalBannerStatusProps }) => {
  const props = { size: 'sm', color: 'currentColor', 'aria-hidden': true } as const;
  switch (banner.type) {
    case 'critical':
      return <CircleErrorIcon {...props} />;
    case 'warning':
      return <WarningIcon {...props} />;
    case 'info':
      return <CircleInformationIcon {...props} />;
    case 'connected':
      switch (banner.leadingAccessory) {
        case 'voice':
          return <VoiceNormalIcon {...props} />;
        case 'video':
          return <VideoIcon {...props} />;
        case 'stage':
          return <StageIcon {...props} />;
      }
  }
};

StatusIcon.displayName = 'StatusIcon';

const getLeadingAccessory = (banner: GlobalBannerProps): ReactNode => {
  if (banner.variant === 'promotion') return banner.leadingAccessory;
  return banner.type === 'info' ? banner.leadingAccessory : null;
};

const GlobalBannerContent = (props: GlobalBannerProps & { themeClassName?: string }) => {
  const { variant, type, title, message, primaryAction, secondaryAction, onDismiss, themeClassName, ref } = props;
  const { i18n } = useManaContext();
  const labelId = useId();
  const messageId = useId();
  const [exiting, setExiting] = useState(false);
  const dismissed = useRef(false);
  const transitionStarted = useRef(false);
  const finishDismiss = useStableCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss?.();
  });

  useEffect(() => {
    if (!exiting) return;
    const timeout = setTimeout(finishDismiss, DISMISS_FALLBACK_MS);
    return () => clearTimeout(timeout);
  }, [exiting, finishDismiss]);

  const dismiss =
    onDismiss == null
      ? undefined
      : () => {
          if (!exiting) setExiting(true);
        };
  const isExitTransition = (event: TransitionEvent<HTMLDivElement>) =>
    exiting && event.target === event.currentTarget && event.nativeEvent.propertyName === 'grid-template-rows';

  useImperativeHandle(ref, () => ({ dismiss: () => dismiss?.() }));

  const isStatus = props.variant === 'status';
  const role = props.variant === 'status' ? props.role : null;
  const statusLabel = props.variant === 'status' ? getStatusLabel(props.type, i18n) : null;
  const statusIcon = props.variant === 'status' ? <StatusIcon banner={props} /> : null;
  const leadingAccessory = getLeadingAccessory(props);
  const countdown = props.variant === 'promotion' ? props.countdown : null;
  const text = [getTextContent(title), getTextContent(message)].filter(Boolean).join(', ');
  const announce = useStableCallback(() => {
    if (role == null) return;
    AccessibilityAnnouncer.announce(
      [statusLabel, text].filter(Boolean).join(', '),
      role === 'alert' ? 'assertive' : 'polite',
    );
  });
  useEffect(() => {
    announce();
  }, [role, text, announce]);

  return (
    <div
      className={clsx(styles.motion, exiting && styles.exiting)}
      onTransitionRun={(event) => {
        if (isExitTransition(event)) transitionStarted.current = true;
      }}
      onTransitionEnd={(event) => {
        if (isExitTransition(event)) finishDismiss();
      }}
      onTransitionCancel={(event) => {
        if (isExitTransition(event) && transitionStarted.current) finishDismiss();
      }}
    >
      <div className={styles.motionContent}>
        <div
          data-mana-component="global-banner"
          data-global-banner-variant={variant}
          data-global-banner-type={type}
          className={clsx(
            themeClassName,
            styles.globalBanner,
            isStatus ? styles.status : styles.promotion,
            styles[type],
          )}
        >
          <Text variant={TEXT_VARIANT} color="none" className={styles.content}>
            <div className={styles.copy}>
              {countdown == null ? null : (
                <span className={styles.countdown}>
                  <Countdown {...countdown} size="md" variant="overlay-secondary" />
                </span>
              )}
              {leadingAccessory != null ? (
                <span aria-hidden className={clsx(styles.iconContainer, styles.leadingAccessory)}>
                  {leadingAccessory}
                </span>
              ) : statusIcon != null ? (
                <span className={styles.iconContainer}>{statusIcon}</span>
              ) : null}
              <Text variant={TEXT_VARIANT} color="none" className={styles.message}>
                {statusLabel == null ? null : <HiddenVisually id={labelId}>{statusLabel}: </HiddenVisually>}
                <span id={messageId}>
                  {title == null ? null : (
                    <Text tag="strong" variant="body-sm/semibold" color="none" className={styles.title}>
                      {title}
                    </Text>
                  )}
                  {message}
                </span>
              </Text>
            </div>
            {primaryAction == null ? null : (
              <div className={styles.actions}>
                <Button {...primaryAction} size="sm" variant={isStatus ? 'overlay-primary' : 'expressive'} />
                {secondaryAction == null ? null : <Button {...secondaryAction} size="sm" variant="overlay-secondary" />}
              </div>
            )}
          </Text>
          {onDismiss == null ? null : (
            <Text variant={TEXT_VARIANT} color="none" className={styles.dismiss}>
              <CloseButton
                variant="color-mix"
                aria-label={i18n.DISMISS_BUTTON_LABEL}
                aria-describedby={statusLabel == null ? messageId : `${labelId} ${messageId}`}
                size="sm"
                onClick={dismiss}
              />
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

GlobalBannerContent.displayName = 'GlobalBannerContent';

// Nitro promotions follow the app's theme; every other banner is always dark.
export const GlobalBanner = (props: GlobalBannerProps) => {
  const followsAppTheme = props.variant === 'promotion' && props.type === 'nitro';
  return (
    <ThemeProvider theme={followsAppTheme ? undefined : ThemeTypes.DARK}>
      {(themeClassName) => (
        <GlobalBannerContent {...props} themeClassName={followsAppTheme ? undefined : themeClassName} />
      )}
    </ThemeProvider>
  );
};

GlobalBanner.displayName = 'GlobalBanner';
