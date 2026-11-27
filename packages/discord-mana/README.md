# discord-mana

React versions of Discord's UI components, with styles, props and markup taken from Discord's own web build. This package installs everything in one go: tokens, icons, components, message rendering, markdown, the chat input and the message builder.

```bash
npm i discord-mana
```

```tsx
import { AppRoot, Button } from 'discord-mana';

export const App = () => (
  <AppRoot theme="darker">
    <Button text="Click me" onClick={() => console.log('clicked')} />
  </AppRoot>
);
```

Each part is also published on its own under `@discord-mana/*` if you only need some of it.

Playground: https://play.discord-mana.dev. Docs and source: https://github.com/Darker-Ink/discord-components
