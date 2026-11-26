import { GuildIconSizes, StackedGuildIcons, type GuildIconGuild } from '@discord-components/components';
import type { StoryGroup } from '../../types';

// Discord's story shows the first servers in the client's guild store; these stand in for them.
export const SAMPLE_GUILDS: GuildIconGuild[] = [
  'Discord Testers',
  'Midjourney',
  'Lofi Girl',
  'Minecraft',
  'Genshin Impact',
].map((name, index) => ({ id: String(200000000000000000n + BigInt(index)), name, icon: null }));

type StackedGuildIconsSize = typeof GuildIconSizes.SMOL | typeof GuildIconSizes.MINI | typeof GuildIconSizes.SMALLER;

interface StackedGuildIconsStoryProps {
  size?: StackedGuildIconsSize;
  maxGuilds?: number;
  hideOverflowCount?: boolean;
  disableGuildNameTooltip?: boolean;
  guilds?: GuildIconGuild[];
}

const StackedGuildIconsStory = ({
  size = GuildIconSizes.SMALLER,
  maxGuilds = 3,
  hideOverflowCount = false,
  disableGuildNameTooltip = false,
  guilds = SAMPLE_GUILDS,
}: StackedGuildIconsStoryProps) =>
  guilds.length === 0 ? null : (
    <StackedGuildIcons
      guilds={guilds}
      maxGuilds={maxGuilds}
      size={size}
      hideOverflowCount={hideOverflowCount}
      disableGuildNameTooltip={disableGuildNameTooltip}
    />
  );

StackedGuildIconsStory.displayName = 'StackedGuildIconsStory';

const stackedGuildIcons: StoryGroup = {
  title: 'Stacked Guild Icons',
  stories: [
    {
      id: 'stacked-guild-icons',
      name: 'StackedGuildIcons',
      component: StackedGuildIconsStory,
      controls: {
        size: {
          type: 'select',
          label: 'Size',
          defaultValue: GuildIconSizes.SMALLER,
          options: [
            { label: 'SMOL', value: GuildIconSizes.SMOL },
            { label: 'MINI', value: GuildIconSizes.MINI },
            { label: 'SMALLER', value: GuildIconSizes.SMALLER },
          ],
        },
        maxGuilds: { type: 'number', label: 'Max Guilds', defaultValue: 3, minValue: 1 },
        hideOverflowCount: { type: 'boolean', label: 'Hide Overflow Count', defaultValue: false },
        disableGuildNameTooltip: { type: 'boolean', label: 'Disable Guild Name Tooltip', defaultValue: false },
      },
    },
  ],
};

export default stackedGuildIcons;
