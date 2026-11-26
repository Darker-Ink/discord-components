import { lazy, type ComponentType } from 'react';
import { Text } from '@discord-components/components';
import './dynamicGraphics.css';

// The keys of the app components Discord's client registers as ManaContext dynamicGraphicComponents.
// Only the demo one exists outside the client.
export const DynamicGraphicComponent = {
  DEMO: 0,
  COLLECTIBLES_PREVIEW: 1,
  GUILD_TAG_COACHMARK_ASSET: 2,
  ACCOUNT_LINK_DISPLAY: 3,
  GAME_SERVER_GAME_INSTRUCTIONS_ASSET: 4,
  APPLICATION_IMAGE_HEADER: 5,
  SOCIAL_LAYER_SKU_PREVIEW: 6,
  GUILD_POWERUPS_COACHMARK_ASSET: 7,
  BADGE_IMAGE_WITH_PROGRESS_CIRCLE: 8,
  QUEST_ACTIVITY_UNENROLLED: 9,
  GUILD_THEME_NUX_PREVIEW: 10,
  BADGE_DIRECTORY_NUX: 11,
  MEMBER_VERIFICATION_SUCCESS: 12,
} as const;

const DynamicGraphicDemo = ({ text }: { text?: string }) => (
  <div className="dynamicGraphicDemoContainer">
    <Text variant="body-lg/semibold" className="dynamicGraphicDemoText">
      {text}
    </Text>
  </div>
);

DynamicGraphicDemo.displayName = 'DynamicGraphicDemo';

// Lazily loaded, like the client's.
export const dynamicGraphicComponents: Record<number, ComponentType<Record<string, unknown>>> = {
  [DynamicGraphicComponent.DEMO]: lazy(() => Promise.resolve({ default: DynamicGraphicDemo })),
};
