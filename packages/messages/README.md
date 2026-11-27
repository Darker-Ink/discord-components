# @discord-mana/messages

Renders Discord messages from the same JSON the API returns: content, attachments, embeds, polls, buttons, selects and Components v2 layouts, plus interaction modals and the media viewer.

```bash
npm i @discord-mana/messages @discord-mana/markdown
```

```tsx
import { Message } from '@discord-mana/messages';
import { renderEmbedMarkdown, renderMessageMarkdown } from '@discord-mana/markdown';

<Message
  renderMarkdown={renderMessageMarkdown}
  renderEmbedMarkdown={renderEmbedMarkdown}
  message={{
    id: '1',
    channel_id: '1',
    type: 0,
    timestamp: '2026-01-01T12:00:00.000Z',
    edited_timestamp: null,
    content: 'Hello!',
    author: { id: '1', username: 'wumpus', global_name: 'Wumpus', avatar: null },
    embeds: [{ title: 'An embed', description: 'Some text', color: 0x5865f2 }],
  }}
  onInteraction={({ data }) => console.log(data.custom_id)}
/>;
```

Without `renderMarkdown` the content is shown as plain text. `openInteractionModal` shows a modal from the payload a bot would send and hands back the submitted values in the API's format. `MessageEmbeds`, `MessageAttachments`, `MediaGallery`, `MessagePoll` and `openMediaViewer` are exported on their own too.

Wrap your app in `AppRoot` from `@discord-mana/components`. Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
