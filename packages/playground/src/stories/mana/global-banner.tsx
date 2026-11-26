import { useRef, useState, type ReactNode } from 'react';
import {
  Button,
  GlobalBanner,
  Stack,
  Text,
  type GlobalBannerCountdown,
  type GlobalBannerHandle,
} from '@discord-mana/components';
import { BellSlashIcon, ClockIcon, NitroWheelIcon, OrbsIcon } from '@discord-mana/icons';
import type { Controls, SelectOption, StoryGroup } from '../../types';
import { useEndsAt } from './shared/countdownExamples';
import {
  GlobalBannerFromConfig,
  LAST_DAY_MS,
  PromoImage,
  WideImage,
  isDismissible,
  withStatusLink,
  type GlobalBannerConfig,
} from './shared/globalBannerExamples';

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Text variant="body-sm/semibold" color="text-subtle">
    {children}
  </Text>
);

SectionLabel.displayName = 'SectionLabel';

const GlobalBannerStory = ({ actionLoading, ...config }: GlobalBannerConfig & { actionLoading: boolean }) => {
  const [dismissed, setDismissed] = useState(false);
  const [replay, setReplay] = useState(0);
  const banner = useRef<GlobalBannerHandle>(null);
  const canHide = !dismissed && isDismissible(config);
  return (
    <Stack gap={16}>
      <Stack direction="horizontal" gap={8}>
        <Button
          text={dismissed ? 'Show banner' : 'Replay enter'}
          variant="secondary"
          size="sm"
          onClick={() => {
            setDismissed(false);
            setReplay((count) => count + 1);
          }}
        />
        <Button
          text="Hide"
          variant="secondary"
          size="sm"
          disabled={!canHide}
          onClick={() => banner.current?.dismiss()}
        />
      </Stack>
      {dismissed ? null : (
        <GlobalBannerFromConfig
          key={replay}
          ref={banner}
          config={config}
          actionLoading={actionLoading}
          onDismiss={() => setDismissed(true)}
        />
      )}
    </Stack>
  );
};

GlobalBannerStory.displayName = 'GlobalBannerStory';

const SHOP_SALE = {
  title: 'Spend your Orbs for less in the Shop',
  message: 'until the sale ends, with 30% off avatar decorations and profile effects.',
  primaryAction: { text: 'Visit the Shop', onClick: () => {} },
  onDismiss: () => {},
};

const NITRO_SALE = {
  title: 'Get a year of Nitro for 30% off',
  message: 'until the Black Friday sale ends, with HD streaming and custom profiles included.',
  primaryAction: { text: 'Get Nitro', onClick: () => {} },
  onDismiss: () => {},
};

const COUNTDOWN_EXAMPLES: {
  label: string;
  render: (endsAt: Date) => GlobalBannerCountdown;
  leadingAccessory?: ReactNode;
}[] = [
  { label: 'Timer with hours and minutes', render: (endsAt) => ({ endsAt, appearance: 'timer' }) },
  {
    label: 'Timer with days and seconds',
    render: (endsAt) => ({ endsAt, appearance: 'timer', showDays: true, showSeconds: true }),
  },
  { label: 'Days left', render: (endsAt) => ({ endsAt, appearance: 'days-left' }) },
  {
    label: 'Days left without the icon, since a clock is already beside it',
    render: (endsAt) => ({ endsAt, appearance: 'days-left', showIcon: false }),
    leadingAccessory: <ClockIcon size="sm" color="currentColor" />,
  },
];

const CountdownBanners = () => {
  const endsAt = useEndsAt();
  const lastDay = useEndsAt(LAST_DAY_MS);
  return (
    <Stack gap={12}>
      <SectionLabel>Countdowns on time-limited promotions</SectionLabel>
      {COUNTDOWN_EXAMPLES.map(({ label, render, leadingAccessory }) => (
        <Stack key={label} gap={8}>
          <Text variant="body-xs/normal" color="text-muted">
            {label}
          </Text>
          <GlobalBanner
            variant="promotion"
            type="expressive"
            leadingAccessory={leadingAccessory ?? <OrbsIcon size="sm" color="currentColor" />}
            countdown={render(endsAt)}
            {...SHOP_SALE}
          />
          <GlobalBanner
            variant="promotion"
            type="nitro"
            leadingAccessory={leadingAccessory ?? <NitroWheelIcon size="refresh_sm" color="currentColor" />}
            countdown={render(endsAt)}
            {...NITRO_SALE}
          />
        </Stack>
      ))}
      <Stack gap={8}>
        <Text variant="body-xs/normal" color="text-muted">
          Timer and days left on the last day
        </Text>
        {[COUNTDOWN_EXAMPLES[0], COUNTDOWN_EXAMPLES[2]].map(({ label, render }) => (
          <GlobalBanner
            key={label}
            variant="promotion"
            type="expressive"
            leadingAccessory={<OrbsIcon size="sm" color="currentColor" />}
            countdown={render(lastDay)}
            {...SHOP_SALE}
          />
        ))}
      </Stack>
    </Stack>
  );
};

CountdownBanners.displayName = 'CountdownBanners';

const noop = () => {};

const GlobalBannerVariantsStory = () => (
  <Stack gap={24}>
    <Stack gap={12}>
      <SectionLabel>Every type with a title and an inline link</SectionLabel>
      <GlobalBanner
        variant="status"
        type="critical"
        role="alert"
        title="Someone signed in to your account from a new device,"
        message="so change your password if it wasn’t you."
        primaryAction={{ text: 'Change Password', onClick: noop }}
        secondaryAction={{ text: 'Review Devices', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="warning"
        role="status"
        title="Discord will be down for maintenance tonight"
        message={withStatusLink('from 10pm to 11pm, and you can follow along on ')}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="info"
        role="status"
        leadingAccessory={<BellSlashIcon size="refresh_sm" color="currentColor" />}
        title="Desktop notifications are off,"
        message="so turn them on to see new messages while Discord runs in the background."
        primaryAction={{ text: 'Turn On Notifications', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="connected"
        leadingAccessory="voice"
        role="status"
        title="You’re in a voice call on your phone,"
        message="so transfer it here to keep talking from your computer."
        primaryAction={{ text: 'Transfer Call', onClick: noop }}
        secondaryAction={{ text: 'Stay on Phone', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="nitro"
        leadingAccessory={<NitroWheelIcon size="refresh_sm" color="currentColor" />}
        title="Your Nitro trial is ready,"
        message="so start it today to get HD streaming, bigger uploads, and custom profiles."
        primaryAction={{ text: 'Start Trial', onClick: noop }}
        secondaryAction={{ text: 'Explore Perks', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="expressive"
        leadingAccessory={<OrbsIcon size="sm" color="currentColor" />}
        title="New Quests are live,"
        message="so complete one to earn Orbs for avatar decorations and profile effects in the Shop."
        primaryAction={{ text: 'Browse Quests', onClick: noop }}
        secondaryAction={{ text: 'Visit the Shop', onClick: noop }}
        onDismiss={noop}
      />
    </Stack>
    <Stack gap={12}>
      <SectionLabel>Status banners</SectionLabel>
      <GlobalBanner
        variant="status"
        type="critical"
        role="alert"
        message="Your Nitro payment didn’t go through, so update your payment method to keep your perks."
        primaryAction={{ text: 'Update Payment', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="critical"
        role="alert"
        message="Verify your email address to keep sending messages and joining servers on Discord."
        primaryAction={{ text: 'Verify Email', onClick: noop }}
      />
      <GlobalBanner
        variant="status"
        type="warning"
        role="status"
        title="Your version of macOS is no longer supported,"
        message="so update it to keep getting Discord updates."
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="info"
        role="status"
        title="Streamer Mode is on,"
        message="so your personal details and server invite links are hidden on stream."
        primaryAction={{ text: 'Turn Off', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="connected"
        leadingAccessory="voice"
        role="status"
        message="You’re in a voice call in General with your mic muted, so unmute when you’re ready to talk."
        primaryAction={{ text: 'Unmute Mic', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="connected"
        leadingAccessory="video"
        role="status"
        message="You’re in a video call with Wumpus, and your camera is off until you turn it on."
        primaryAction={{ text: 'Turn On Camera', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="status"
        type="connected"
        leadingAccessory="stage"
        role="status"
        message="You’ve been invited to speak on Stage in Town Hall, so join as a speaker when you’re ready."
        primaryAction={{ text: 'Join as Speaker', onClick: noop }}
        secondaryAction={{ text: 'Stay in Audience', onClick: noop }}
        onDismiss={noop}
      />
    </Stack>
    <Stack gap={12}>
      <SectionLabel>Promotions</SectionLabel>
      <GlobalBanner
        variant="promotion"
        type="expressive"
        leadingAccessory={<OrbsIcon size="sm" color="currentColor" />}
        title="Earn 2x Orbs"
        message="when you complete Quests this week, with no limit on how many you can finish."
        primaryAction={{ text: 'Find Quests', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="nitro"
        message="Send a friend Nitro this week, and we’ll add an avatar decoration to their gift."
        primaryAction={{ text: 'Send Nitro', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="expressive"
        leadingAccessory={<PromoImage />}
        message="Get Discord on your phone and computer to keep up with your friends wherever you are."
        primaryAction={{ text: 'Get the App', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="expressive"
        leadingAccessory={<WideImage />}
        message="New avatar decorations and profile effects just landed in the Shop, including a Wumpus set."
        primaryAction={{ text: 'Visit the Shop', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="nitro"
        leadingAccessory={<NitroWheelIcon size="md" color="currentColor" />}
        message="Your Nitro trial ends in 3 days, but you can keep your perks for less with a yearly plan."
        primaryAction={{ text: 'Get Nitro', onClick: noop }}
        secondaryAction={{ text: 'Compare Plans', onClick: noop }}
        onDismiss={noop}
      />
      <GlobalBanner
        variant="promotion"
        type="nitro"
        title="Come back to Nitro"
        message="and pick up custom profiles, HD streaming, and bigger uploads where you left off."
        primaryAction={{ text: 'Get Nitro', onClick: noop }}
        onDismiss={noop}
      />
    </Stack>
    <CountdownBanners />
  </Stack>
);

GlobalBannerVariantsStory.displayName = 'GlobalBannerVariantsStory';

const STATUS_TYPES: SelectOption[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
  { label: 'Connected', value: 'connected' },
];

const PROMOTION_TYPES: SelectOption[] = [
  { label: 'Expressive', value: 'expressive' },
  { label: 'Nitro', value: 'nitro' },
];

const GRAPHICS: SelectOption[] = [
  { label: 'None', value: 'none' },
  { label: 'Icon', value: 'icon' },
  { label: 'Image (16:9)', value: 'image' },
  { label: 'Wide image', value: 'wide-image' },
];

const CALL_GRAPHICS: SelectOption[] = [
  { label: 'Voice', value: 'voice' },
  { label: 'Video', value: 'video' },
  { label: 'Stage', value: 'stage' },
];

type Props = Record<string, unknown>;
const isStatus = (props: Props) => props.variant === 'status';
const isPromotion = (props: Props) => props.variant === 'promotion';
const isConnected = (props: Props) => isStatus(props) && props.type === 'connected';
const hasPrimaryAction = (props: Props) => props.primaryAction !== '';
const hasCountdown = (props: Props) => isPromotion(props) && props.countdown === true;
const hasTimerCountdown = (props: Props) => hasCountdown(props) && props.countdownAppearance === 'timer';

const controls: Controls = {
  variant: {
    label: 'Variant',
    type: 'select',
    defaultValue: 'status',
    options: [
      { label: 'Status', value: 'status' },
      { label: 'Promotion', value: 'promotion' },
    ],
  },
  type: {
    label: 'Type',
    type: 'select',
    defaultValue: 'warning',
    options: [...STATUS_TYPES, ...PROMOTION_TYPES],
    getOptions: (props) => (isPromotion(props) ? PROMOTION_TYPES : STATUS_TYPES),
  },
  role: {
    label: 'Screen reader',
    type: 'select',
    defaultValue: 'status',
    options: [
      { label: 'Announce right away', value: 'alert' },
      { label: 'Announce when idle', value: 'status' },
    ],
    isVisible: isStatus,
  },
  title: { label: 'Title', hint: 'Optional bold lead-in.', type: 'text', defaultValue: '' },
  message: {
    label: 'Message',
    type: 'text',
    defaultValue:
      'Discord will be down for maintenance tonight from 10pm to 11pm, so voice calls and messages might not work.',
  },
  sampleLink: {
    label: 'End the message with a link',
    hint: 'Replaces the message with the maintenance notice, linking to Discord Status.',
    type: 'boolean',
    defaultValue: false,
  },
  leadingAccessory: {
    label: 'Leading graphic',
    type: 'select',
    defaultValue: 'none',
    options: [...GRAPHICS, ...CALL_GRAPHICS],
    getOptions: (props) => (isConnected(props) ? CALL_GRAPHICS : GRAPHICS),
    isVisible: (props) => isPromotion(props) || props.type === 'info' || isConnected(props),
  },
  dismissible: {
    label: 'Dismissible',
    hint: 'Only critical banners can turn this off.',
    type: 'boolean',
    defaultValue: true,
    isVisible: (props) => isStatus(props) && props.type === 'critical',
  },
  primaryAction: { label: 'Primary button', hint: 'Leave empty for no buttons.', type: 'text', defaultValue: '' },
  primaryActionIcon: {
    label: 'Primary button icon',
    type: 'boolean',
    defaultValue: false,
    isVisible: hasPrimaryAction,
  },
  secondaryAction: { label: 'Secondary button', type: 'text', defaultValue: '', isVisible: hasPrimaryAction },
  actionLoading: { label: 'Primary button loading', type: 'boolean', defaultValue: false, isVisible: hasPrimaryAction },
  countdown: {
    label: 'Countdown',
    hint: 'A time-limited offer timer.',
    type: 'boolean',
    defaultValue: false,
    isVisible: isPromotion,
  },
  countdownAppearance: {
    label: 'Countdown style',
    type: 'select',
    defaultValue: 'timer',
    options: [
      { label: 'Timer', value: 'timer' },
      { label: 'Days left', value: 'days-left' },
    ],
    isVisible: hasCountdown,
  },
  countdownShowDays: {
    label: 'Countdown days',
    hint: 'Splits days out of the hours.',
    type: 'boolean',
    defaultValue: false,
    isVisible: hasTimerCountdown,
  },
  countdownShowSeconds: {
    label: 'Countdown seconds',
    type: 'boolean',
    defaultValue: false,
    isVisible: hasTimerCountdown,
  },
};

const globalBanner: StoryGroup = {
  title: 'GlobalBanner',
  stories: [
    { name: 'GlobalBanner', id: 'global-banner', component: GlobalBannerStory, controls },
    {
      name: 'Every type, with countdowns',
      id: 'global-banner-variants',
      component: GlobalBannerVariantsStory,
      controls: {},
    },
  ],
};

export default globalBanner;
