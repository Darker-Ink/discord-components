# @discord-mana/components

Discord's Mana design system for React: buttons, inputs, selects, modals, tooltips, menus, date pickers, toasts and more, plus a few older Void components that Mana doesn't replace.

```bash
npm i @discord-mana/components @discord-mana/tokens
```

Import the tokens once and wrap your app in `AppRoot`. It sets up the theme, accessibility settings, focus rings and the layers that popouts, tooltips and modals render into.

```tsx
import '@discord-mana/tokens';
import { AppRoot, Button } from '@discord-mana/components';

export const App = () => (
  <AppRoot theme="darker">
    <Button text="Click me" onClick={() => console.log('clicked')} />
  </AppRoot>
);
```

Components take the same props as Discord's. Every one of them has a story in the playground at https://play.discord-mana.dev.

Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
