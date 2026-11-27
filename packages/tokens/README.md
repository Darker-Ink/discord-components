# @discord-mana/tokens

Discord's design tokens: colors, spacing, radii, shadows, fonts and the four themes, as CSS variables and as TypeScript values.

```bash
npm i @discord-mana/tokens
```

Import it once to load the fonts, the variables and all four themes:

```ts
import '@discord-mana/tokens';
```

The theme is picked by a class on a parent element. `AppRoot` from `@discord-mana/components` sets it for you, or use `themeClassName(ThemeTypes.DARK)` yourself.

| Theme | Value      |
| ----- | ---------- |
| Light | `light`    |
| Ash   | `dark`     |
| Dark  | `darker`   |
| Onyx  | `midnight` |

The variables have the same names as in Discord, for example `var(--background-base-low)` or `var(--text-default)`. The same values are exported for use in code: `SEMANTIC_COLORS`, `RAW_COLORS`, `SPACING`, `RADII` and `SHADOWS`.

Part of [discord-mana](https://github.com/Darker-Ink/discord-components).
