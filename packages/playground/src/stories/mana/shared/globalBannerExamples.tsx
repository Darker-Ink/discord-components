import type { ReactNode, Ref } from 'react';
import { Anchor, GlobalBanner, type GlobalBannerHandle, type GlobalBannerRole } from '@discord-mana/components';
import { NitroWheelIcon } from '@discord-mana/icons';
import { useEndsAt } from './countdownExamples';

// Four hours and change: a countdown on its last day.
export const LAST_DAY_MS = 17158e3;

const PROMO_IMAGE =
  'https://cdn.discordapp.com/assets/content/26736d800236761a21973e6fe690dfd5fa484f664976b3bba91b98d5d47bb1f7.svg';

export const PromoImage = () => <img src={PROMO_IMAGE} alt="" />;

PromoImage.displayName = 'PromoImage';

export const WideImage = () => (
  <svg width="200" height="20" viewBox="0 0 200 20" fill="currentColor">
    <rect x="0" y="2" width="56" height="16" rx="8" />
    <rect x="64" y="4" width="64" height="12" rx="6" />
    <rect x="136" y="4" width="64" height="12" rx="6" />
  </svg>
);

WideImage.displayName = 'WideImage';

export const withStatusLink = (text: string): ReactNode[] => [
  text,
  <Anchor key="link" href="https://discordstatus.com">
    Discord Status
  </Anchor>,
  '.',
];

export type LeadingAccessoryOption = 'none' | 'icon' | 'image' | 'wide-image' | 'voice' | 'video' | 'stage';

export interface GlobalBannerConfig {
  variant: 'status' | 'promotion';
  type: 'critical' | 'warning' | 'info' | 'connected' | 'expressive' | 'nitro';
  role: GlobalBannerRole;
  title: string;
  message: string;
  sampleLink: boolean;
  leadingAccessory: LeadingAccessoryOption;
  dismissible: boolean;
  primaryAction: string;
  primaryActionIcon: boolean;
  secondaryAction: string;
  countdown: boolean;
  countdownAppearance: 'timer' | 'days-left';
  countdownShowDays: boolean;
  countdownShowSeconds: boolean;
}

// Only critical status banners can be made non-dismissible.
export const isDismissible = (config: GlobalBannerConfig) =>
  config.variant === 'promotion' || config.type !== 'critical' || config.dismissible;

const renderLeadingAccessory = (option: LeadingAccessoryOption) => {
  switch (option) {
    case 'none':
    case 'voice':
    case 'video':
    case 'stage':
      return undefined;
    case 'icon':
      return <NitroWheelIcon size="md" color="currentColor" />;
    case 'image':
      return <PromoImage />;
    case 'wide-image':
      return <WideImage />;
  }
};

// The banner the playground controls describe.
export const GlobalBannerFromConfig = ({
  ref,
  config,
  onDismiss,
  actionLoading = false,
}: {
  ref?: Ref<GlobalBannerHandle>;
  config: GlobalBannerConfig;
  onDismiss: () => void;
  actionLoading?: boolean;
}) => {
  const endsAt = useEndsAt();
  const copy = {
    title: config.title === '' ? undefined : config.title,
    message: config.sampleLink
      ? withStatusLink('Discord will be down for maintenance tonight from 10pm to 11pm, and you can follow along on ')
      : config.message,
  };
  const actions =
    config.primaryAction === ''
      ? {}
      : {
          primaryAction: {
            text: config.primaryAction,
            icon: config.primaryActionIcon ? NitroWheelIcon : undefined,
            onClick: () => {},
            loading: actionLoading,
          },
          secondaryAction:
            config.secondaryAction === '' ? undefined : { text: config.secondaryAction, onClick: () => {} },
        };
  const leadingAccessory = renderLeadingAccessory(config.leadingAccessory);
  if (config.variant === 'promotion')
    return (
      <GlobalBanner
        ref={ref}
        variant="promotion"
        type={config.type === 'nitro' ? 'nitro' : 'expressive'}
        {...copy}
        {...actions}
        leadingAccessory={leadingAccessory}
        countdown={
          config.countdown
            ? config.countdownAppearance === 'days-left'
              ? { endsAt, appearance: 'days-left' }
              : {
                  endsAt,
                  appearance: 'timer',
                  showDays: config.countdownShowDays,
                  showSeconds: config.countdownShowSeconds,
                }
            : undefined
        }
        onDismiss={onDismiss}
      />
    );
  switch (config.type) {
    case 'critical':
      return (
        <GlobalBanner
          ref={ref}
          variant="status"
          type="critical"
          role={config.role}
          {...copy}
          {...actions}
          onDismiss={isDismissible(config) ? onDismiss : undefined}
        />
      );
    case 'connected':
      return (
        <GlobalBanner
          ref={ref}
          variant="status"
          type="connected"
          leadingAccessory={
            config.leadingAccessory === 'video' || config.leadingAccessory === 'stage'
              ? config.leadingAccessory
              : 'voice'
          }
          role={config.role}
          {...copy}
          {...actions}
          onDismiss={onDismiss}
        />
      );
    case 'warning':
      return (
        <GlobalBanner
          ref={ref}
          variant="status"
          type="warning"
          role={config.role}
          {...copy}
          {...actions}
          onDismiss={onDismiss}
        />
      );
    case 'expressive':
    case 'nitro':
    case 'info':
      return (
        <GlobalBanner
          ref={ref}
          variant="status"
          type="info"
          role={config.role}
          {...copy}
          {...actions}
          leadingAccessory={leadingAccessory}
          onDismiss={onDismiss}
        />
      );
  }
};

GlobalBannerFromConfig.displayName = 'GlobalBannerFromConfig';
