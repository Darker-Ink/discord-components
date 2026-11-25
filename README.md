# discord-components

React recreations of Discord's design system components (Mana), with styles taken from Discord's own build.

## Packages

| Package                          | Contents                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| `@discord-components/tokens`     | Design tokens, the four themes (Light, Ash, Dark, Onyx), fonts, base CSS |
| `@discord-components/icons`      | Icon components                                                          |
| `@discord-components/components` | Mana components                                                          |
| `@discord-components/playground` | Component playground (mirrors Discord's internal one)                    |

## Development

```bash
pnpm install
pnpm dev
```

### Themes

Discord sets the theme class on `<html>`; components follow it.

| Name  | Class            |
| ----- | ---------------- |
| Light | `theme-light`    |
| Ash   | `theme-dark`     |
| Dark  | `theme-darker`   |
| Onyx  | `theme-midnight` |

## Working from the Discord build

Styles are not written by hand. The scripts below pull a build from `canary.discord.com` into `.cache/` and
extract what we need from it.

```bash
pnpm assets:fetch                  # every JS/CSS chunk of the current build -> .cache/assets
pnpm assets:split                  # one file per webpack module -> .cache/modules/<id>.js
pnpm assets:css <module-id|suffix> # rebuild a CSS module as .module.css
node scripts/extract-tokens.mjs    # regenerate packages/tokens/src/*.css
node scripts/extract-icons.mjs     # regenerate packages/icons/src (one component per Discord icon)
```

A component's class map module (`{button:"button_F7qvhY",…}`) gives the suffix of its CSS module;
`assets:css` copies every rule for that suffix verbatim and strips the hash.
