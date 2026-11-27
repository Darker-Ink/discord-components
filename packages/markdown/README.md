# @discord-mana/markdown

A port of Discord's markdown parser and renderer. It has the same rules as the client, so mentions, emoji, timestamps, spoilers, headings, lists and code blocks look the way they do in Discord.

```bash
npm i @discord-mana/markdown
```

```tsx
import { Markdown } from '@discord-mana/markdown';

<Markdown content="**Hi** <@1234> ||spoiler|| <t:1764158400:R>" />;
```

`renderMessageMarkdown` and `renderEmbedMarkdown` plug into `Message` from `@discord-mana/messages`. Mentions and custom emoji are looked up through `resolvers`, and rules can be turned on or off.

Code blocks are plain text until you enable languages. Install Arborium and the grammars you want, then import each language once:

```bash
npm i @arborium/arborium @arborium/rust
```

```ts
import '@discord-mana/markdown/languages/rust';
```

`@discord-mana/markdown/languages/all` enables every language Discord highlights, but needs all of the grammar packages. Each grammar loads the first time a code block uses it.

Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
