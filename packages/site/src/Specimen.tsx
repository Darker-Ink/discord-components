import { useMemo } from 'react';
import { renderEmbedMarkdown, renderMessageMarkdown } from '@discord-mana/markdown';
import {
  Message,
  MessageListItem,
  type APIMessage,
  type MessageResolvers,
  type OnMessageComponentInteraction,
} from '@discord-mana/messages';
import { THEMES, isSiteTheme, type SiteTheme } from './theme';
import styles from './Site.module.css';

const AUTHOR = {
  id: '1300000000000000001',
  username: 'discord-mana',
  global_name: 'discord-mana',
  avatar: null,
  bot: true,
  avatar_url: '/avatar.svg',
};

const RESOLVERS: MessageResolvers = {
  getAvatarURL: (user) => user.avatar_url ?? null,
};

// Sent a couple of minutes before the page opened.
const SENT_AT = new Date(Date.now() - 2 * 60_000).toISOString();

const BUTTON_STYLE = { primary: 1, secondary: 2 } as const;

// A bot message, as the API would send it. Its buttons pick the page's theme.
const themeMessage = (theme: SiteTheme, timestamp: string): APIMessage => ({
  id: '1300000000000000002',
  channel_id: '1300000000000000003',
  type: 0,
  timestamp,
  edited_timestamp: null,
  author: AUTHOR,
  content: 'Rendered by `<Message>` from the JSON a bot would send.',
  embeds: [
    {
      type: 'rich',
      title: 'Pick a theme',
      description:
        'These buttons are message components. A click calls `onInteraction`, which here switches the theme.',
      color: 0x5865f2,
    },
  ],
  components: [
    {
      type: 1,
      components: THEMES.map(({ id, label }) => ({
        type: 2,
        style: id === theme ? BUTTON_STYLE.primary : BUTTON_STYLE.secondary,
        label,
        custom_id: id,
      })),
    },
  ],
});

export const Specimen = ({ theme, onThemeChange }: { theme: SiteTheme; onThemeChange: (theme: SiteTheme) => void }) => {
  const message = useMemo(() => themeMessage(theme, SENT_AT), [theme]);
  const onInteraction: OnMessageComponentInteraction<APIMessage> = ({ data }) => {
    if (isSiteTheme(data.custom_id)) onThemeChange(data.custom_id);
  };
  return (
    <figure className={styles.specimen}>
      <ol className={styles.channel} aria-label="Example message">
        <MessageListItem message={message}>
          <Message
            message={message}
            resolvers={RESOLVERS}
            renderMarkdown={renderMessageMarkdown}
            renderEmbedMarkdown={renderEmbedMarkdown}
            onInteraction={onInteraction}
          />
        </MessageListItem>
      </ol>
      <figcaption className={styles.caption}>A live message from @discord-mana/messages, not a screenshot.</figcaption>
    </figure>
  );
};

Specimen.displayName = 'Specimen';
