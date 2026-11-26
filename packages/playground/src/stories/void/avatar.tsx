import { Avatar, AvatarSizes, StatusTypes, type AvatarSize, type StatusType } from '@discord-mana/components';
import type { StoryGroup } from '../../types';

// Discord's story shows the signed-in user's avatar; without an account this is the first default avatar.
export const SAMPLE_AVATAR_URL = '/void/default-avatar-0.png';

interface AvatarStoryProps {
  size?: AvatarSize;
  status?: StatusType | null;
  isVR?: boolean;
  isMobile?: boolean;
  src?: string;
}

const AvatarStory = ({
  size = AvatarSizes.SIZE_48,
  status,
  isVR = false,
  isMobile = false,
  src = SAMPLE_AVATAR_URL,
}: AvatarStoryProps) => (
  <Avatar src={src} size={size} aria-label="Sample User" status={status} isVR={isVR} isMobile={isMobile} />
);

AvatarStory.displayName = 'AvatarStory';

const avatar: StoryGroup = {
  title: 'Avatar',
  stories: [
    {
      id: 'avatar',
      name: 'Avatar',
      component: AvatarStory,
      controls: {
        size: {
          type: 'select',
          label: 'Size',
          defaultValue: AvatarSizes.SIZE_48,
          options: Object.keys(AvatarSizes).map((key) => ({
            label: key,
            value: AvatarSizes[key as keyof typeof AvatarSizes],
          })),
        },
        status: {
          type: 'select',
          label: 'Status',
          defaultValue: null,
          options: [
            { label: 'None', value: null },
            ...Object.keys(StatusTypes).map((key) => ({
              label: key,
              value: StatusTypes[key as keyof typeof StatusTypes],
            })),
          ],
        },
        isVR: { type: 'boolean', label: 'VR', defaultValue: false },
        isMobile: { type: 'boolean', label: 'Mobile', defaultValue: false },
      },
    },
  ],
};

export default avatar;
