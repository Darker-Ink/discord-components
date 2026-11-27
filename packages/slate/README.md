# @discord-mana/slate

Discord's chat input: the rich text editor from the message bar, with live markdown, mentions, emoji and the buttons next to it. It also has `InlineEditor`, which edits text in place where it's shown.

```bash
npm i @discord-mana/slate
```

```tsx
import { ChannelTextArea } from '@discord-mana/slate';

<ChannelTextArea placeholder="Message #general" onSubmit={(text) => console.log(text)} />;
```

`onSubmit` gets the text in message format (`<@id>` for mentions, `<:name:id>` for custom emoji). Pass `resolvers` (the same ones `Message` uses) so mentions and emoji show as pills.

Wrap your app in `AppRoot` from `@discord-mana/components`. Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
