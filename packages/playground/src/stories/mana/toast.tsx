import { Stack, Toast, tokens, type ToastEntity } from '@discord-mana/components';
import { CircleInformationIcon, StarIcon } from '@discord-mana/icons';
import type { Control, StoryGroup } from '../../types';

const GUILD_NAMES = ['Wumpus', 'Discord Staff', 'Design Systems Team'];

const textControl: Control = { label: 'Text', type: 'text', defaultValue: 'This is a toast message' };

// The client's emoji images for the two emoji the story shows (Twemoji, as Discord ships them).
const EMOJI_URLS: Record<string, string> = { '👋': '/toast/1f44b.svg', '🔥': '/toast/1f525.svg' };

const emojiEntity = (emoji: string): ToastEntity => {
  const src = EMOJI_URLS[emoji] ?? '';
  return src !== '' ? { type: 'emoji', src, alt: emoji } : { type: 'emoji', unicode: emoji };
};

const ToastStory = ({ text }: { text: string }) => (
  <Stack gap={12}>
    <Toast text={text} variant="default" />
    <Toast text={text} variant="default" icon={CircleInformationIcon} />
    <Toast
      text={text}
      variant="default"
      icon={CircleInformationIcon}
      iconColor={tokens.colors.ICON_BRAND}
      secondaryIconColor={tokens.colors.ICON_DEFAULT}
    />
    <Toast text={text} variant="default" icon={StarIcon} iconColor={tokens.colors.ICON_BRAND} />
    <Toast text={text} variant="success" />
    <Toast text={text} variant="critical" />
  </Stack>
);

ToastStory.displayName = 'ToastStory';

// Discord also shows a toast for the first server in the user's list that has an icon; the playground
// has no servers, so like Discord's playground without any, it's left out.
const ToastEntitiesStory = ({ text }: { text: string }) => (
  <Stack gap={12}>
    <Toast text={text} icon={emojiEntity('👋')} />
    <Toast text={text} icon={emojiEntity('🔥')} />
    <Toast text={text} icon={{ type: 'avatar', src: 'https://cdn.discordapp.com/embed/avatars/0.png', alt: 'Nelly' }} />
    {GUILD_NAMES.map((name) => (
      <Toast key={name} text={name} icon={{ type: 'guild', src: null, name }} />
    ))}
  </Stack>
);

ToastEntitiesStory.displayName = 'ToastEntitiesStory';

const toast: StoryGroup = {
  title: 'Toast',
  stories: [
    { name: 'Toast', id: 'toast', component: ToastStory, controls: { text: textControl } },
    {
      name: 'Toasts with entities',
      id: 'toast-entities',
      component: ToastEntitiesStory,
      controls: { text: textControl },
    },
  ],
};

export default toast;
