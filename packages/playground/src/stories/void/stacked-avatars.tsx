import { AvatarSizes, StackedAvatars, type AvatarSize, type StackedAvatarsUser } from '@discord-components/components';
import type { StoryGroup } from '../../types';

const DEFAULT_AVATARS = [0, 1, 2, 3, 4, 5].map((index) => `/void/default-avatar-${index}.png`);

// Discord's story shows the first users in the client's user store; these stand in for them.
export const SAMPLE_USERS: StackedAvatarsUser[] = Array.from({ length: 5 }, (_, index) => ({
  id: String(100000000000000000n + BigInt(index)),
  username: `user${index}`,
  globalName: `Sample User ${index + 1}`,
  getAvatarURL: () => DEFAULT_AVATARS[index % DEFAULT_AVATARS.length],
}));

interface StackedAvatarsStoryProps {
  size?: AvatarSize;
  maxUsers?: number;
  hideOverflowCount?: boolean;
  users?: StackedAvatarsUser[];
}

const StackedAvatarsStory = ({
  size = AvatarSizes.SIZE_24,
  maxUsers = 3,
  hideOverflowCount = false,
  users = SAMPLE_USERS,
}: StackedAvatarsStoryProps) =>
  users.length === 0 ? null : (
    <StackedAvatars users={users} maxUsers={maxUsers} size={size} hideOverflowCount={hideOverflowCount} />
  );

StackedAvatarsStory.displayName = 'StackedAvatarsStory';

const stackedAvatars: StoryGroup = {
  title: 'Stacked Avatars',
  stories: [
    {
      id: 'stacked-avatars',
      name: 'StackedAvatars',
      component: StackedAvatarsStory,
      controls: {
        size: {
          type: 'select',
          label: 'Size',
          defaultValue: AvatarSizes.SIZE_24,
          options: [
            { label: 'SIZE_16', value: AvatarSizes.SIZE_16 },
            { label: 'SIZE_20', value: AvatarSizes.SIZE_20 },
            { label: 'SIZE_24', value: AvatarSizes.SIZE_24 },
          ],
        },
        maxUsers: { type: 'number', label: 'Max Users', defaultValue: 3, minValue: 1 },
        hideOverflowCount: { type: 'boolean', label: 'Hide Overflow Count', defaultValue: false },
      },
    },
  ],
};

export default stackedAvatars;
