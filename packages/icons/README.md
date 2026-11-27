# @discord-mana/icons

Every icon in the Discord client as a React component, under the same names Discord uses.

```bash
npm i @discord-mana/icons
```

```tsx
import { SettingsIcon } from '@discord-mana/icons';

<SettingsIcon size="md" color="var(--interactive-icon-default)" />;
```

`size` is one of `xxs` (12), `xs` (16), `sm` (18), `md` (24), `lg` (32) or `custom`, which uses `width` and `height`. `color` takes any CSS color. Icons are hidden from screen readers unless you give them an `aria-label`.

Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
