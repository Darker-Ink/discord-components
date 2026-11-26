import { useState } from 'react';
import {
  BlobMask,
  getBadgeWidthForValue,
  GuildIcon,
  GuildIconSizes,
  HeaderBar,
  NavItem,
  NumberBadge,
  Stack,
  type GuildIconSize,
  type NavItemBackgroundStyle,
} from '@discord-mana/components';
import {
  BellIcon,
  CompassIcon,
  InboxIcon,
  PinIcon,
  PlusLargeIcon,
  TextIcon,
  ThreadIcon,
  UserIcon,
} from '@discord-mana/icons';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { noop, valueOptions } from './shared';

const SERVER_ICON = '/messages/icon.png';

interface HeaderBarStoryProps {
  channel: string;
  topic: string;
  transparent: boolean;
  scrollable: boolean;
  showBadge: boolean;
}

const HeaderBarStory = ({ channel, topic, showBadge, ...props }: HeaderBarStoryProps) => {
  const [showMembers, setShowMembers] = useState(true);
  return (
    <div className={styles.headerBar}>
      <HeaderBar
        {...props}
        aria-label="Channel header"
        toolbar={
          <>
            <HeaderBar.Icon icon={ThreadIcon} tooltip="Threads" onClick={noop} />
            <HeaderBar.Icon
              icon={BellIcon}
              tooltip="Notification Settings"
              badge={showBadge ? { type: 'unread' } : null}
              onClick={noop}
            />
            <HeaderBar.Icon icon={PinIcon} tooltip="Pinned Messages" onClick={noop} />
            <HeaderBar.Icon
              icon={UserIcon}
              tooltip={showMembers ? 'Hide Member List' : 'Show Member List'}
              selected={showMembers}
              onClick={() => setShowMembers((value) => !value)}
            />
            <HeaderBar.Icon icon={InboxIcon} tooltip="Inbox" onClick={noop} />
          </>
        }
      >
        <HeaderBar.ChannelIcon icon={TextIcon} aria-hidden />
        <HeaderBar.Title>{channel}</HeaderBar.Title>
        {topic !== '' && (
          <>
            <HeaderBar.Divider />
            <HeaderBar.Title muted>{topic}</HeaderBar.Title>
          </>
        )}
      </HeaderBar>
    </div>
  );
};

HeaderBarStory.displayName = 'HeaderBarStory';

interface NavItemStoryProps {
  name: string;
  showIcon: boolean;
  selected: boolean;
  backgroundStyle: NavItemBackgroundStyle;
}

const NavItemStory = ({ name, showIcon, selected, backgroundStyle }: NavItemStoryProps) => {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className={styles.navRail}>
      <NavItem
        name={name}
        icon={showIcon ? SERVER_ICON : null}
        selected={selected || active === 'server'}
        onClick={() => setActive('server')}
      />
      <NavItem
        ariaLabel="Add a Server"
        backgroundStyle={backgroundStyle}
        selected={active === 'add'}
        onClick={() => setActive('add')}
      >
        <PlusLargeIcon size="md" color="currentColor" />
      </NavItem>
      <NavItem
        ariaLabel="Discover"
        backgroundStyle={backgroundStyle}
        selected={active === 'discover'}
        onClick={() => setActive('discover')}
      >
        <CompassIcon size="md" color="currentColor" />
      </NavItem>
    </div>
  );
};

NavItemStory.displayName = 'NavItemStory';

interface BlobMaskStoryProps {
  selected: boolean;
  highlight: boolean;
  rounded: boolean;
  mentions: number;
  upperBadge: boolean;
}

// The guild bar's masked icon: badges cut a notch out of the icon below them.
const BlobMaskStory = ({ mentions, upperBadge, ...props }: BlobMaskStoryProps) => (
  <div className={styles.navRail}>
    <BlobMask
      {...props}
      className={styles.blob}
      lowerBadge={mentions > 0 ? <NumberBadge count={mentions} /> : null}
      lowerBadgeSize={{ width: getBadgeWidthForValue(mentions) }}
      upperBadge={upperBadge ? <NumberBadge count={1} /> : null}
    >
      <img src={SERVER_ICON} alt="" className={styles.blobImage} />
    </BlobMask>
  </div>
);

BlobMaskStory.displayName = 'BlobMaskStory';

interface GuildIconStoryProps {
  name: string;
  size: GuildIconSize;
  active: boolean;
  showIcon: boolean;
  showTooltip: boolean;
  textScale: number;
}

const GuildIconStory = ({ name, showIcon, ...props }: GuildIconStoryProps) => (
  <Stack direction="horizontal" gap={16} align="center">
    <GuildIcon
      {...props}
      guild={{ id: '200000000000000000', name, icon: null }}
      iconSrc={showIcon ? SERVER_ICON : undefined}
    />
  </Stack>
);

GuildIconStory.displayName = 'GuildIconStory';

const AllGuildIconsStory = ({ name }: { name: string }) => (
  <Stack direction="horizontal" gap={16} align="center" wrap>
    {Object.values(GuildIconSizes).map((size) => (
      <GuildIcon key={size} size={size} guild={{ id: '200000000000000000', name, icon: null }} />
    ))}
  </Stack>
);

AllGuildIconsStory.displayName = 'AllGuildIconsStory';

const navigation: StoryGroup = {
  title: 'Navigation',
  stories: [
    {
      name: 'HeaderBar',
      id: 'header-bar',
      component: HeaderBarStory,
      controls: {
        channel: { label: 'Channel', type: 'text', defaultValue: 'general' },
        topic: { label: 'Topic', type: 'text', defaultValue: 'Say hi to Wumpus' },
        transparent: { label: 'Transparent', type: 'boolean', defaultValue: false },
        scrollable: { label: 'Scrollable', type: 'boolean', defaultValue: false },
        showBadge: { label: 'Icon Badge', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'NavItem',
      id: 'nav-item',
      component: NavItemStory,
      controls: {
        name: { label: 'Name', type: 'text', defaultValue: 'Discord Developers' },
        showIcon: { label: 'Icon', type: 'boolean', defaultValue: false },
        selected: { label: 'Selected', type: 'boolean', defaultValue: false },
        backgroundStyle: {
          label: 'Background Style',
          type: 'select',
          defaultValue: 'always',
          options: valueOptions(['always', 'on-hover']),
        },
      },
    },
    {
      name: 'BlobMask',
      id: 'blob-mask',
      component: BlobMaskStory,
      controls: {
        selected: { label: 'Selected', type: 'boolean', defaultValue: false },
        highlight: { label: 'Highlight', type: 'boolean', defaultValue: false },
        rounded: { label: 'Rounded', type: 'boolean', defaultValue: false },
        mentions: { label: 'Mentions', type: 'number', defaultValue: 3, minValue: 0 },
        upperBadge: { label: 'Upper Badge', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'GuildIcon',
      id: 'guild-icon',
      component: GuildIconStory,
      controls: {
        name: { label: 'Server Name', type: 'text', defaultValue: 'Discord Developers' },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: GuildIconSizes.LARGE,
          options: valueOptions(Object.values(GuildIconSizes)),
        },
        active: { label: 'Active', type: 'boolean', defaultValue: false },
        showIcon: { label: 'Icon', type: 'boolean', defaultValue: false },
        showTooltip: { label: 'Tooltip', type: 'boolean', defaultValue: false },
        textScale: { label: 'Text Scale', type: 'slider', defaultValue: 1, minValue: 0.5, maxValue: 2 },
      },
    },
    {
      name: 'GuildIcon Sizes',
      id: 'guild-icon-sizes',
      component: AllGuildIconsStory,
      controls: { name: { label: 'Server Name', type: 'text', defaultValue: 'Discord Developers' } },
    },
  ],
};

export default navigation;
