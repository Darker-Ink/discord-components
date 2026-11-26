# discord-components

React versions of Discord's UI components. The styles, props and markup come straight from Discord's own web build, and every component is checked pixel by pixel against the real thing in all four themes.

## What's included

| Package                          | What it has                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@discord-components/tokens`     | Colors, spacing, fonts and the four themes                                                                                                |
| `@discord-components/icons`      | Every icon in the Discord client, under the same names Discord uses                                                                       |
| `@discord-components/components` | The Mana design system (buttons, inputs, selects, modals, tooltips, menus, date pickers, toasts and more), plus the older Void components |
| `@discord-components/messages`   | Message rendering: embeds, attachments, the media gallery and viewer, message components (including Components v2) and interaction modals |
| `@discord-components/playground` | A playground for browsing and trying out every component                                                                                  |

Void is Discord's older design system. Discord hardly uses it anymore, so use the Mana components for anything new.

## Getting started

Import the tokens once and wrap your app in `AppRoot`. It sets up the theme, accessibility settings, focus rings and the layers that popouts, tooltips and modals render into.

```tsx
import '@discord-components/tokens';
import { AppRoot, Button } from '@discord-components/components';

export const App = () => (
  <AppRoot theme="darker">
    <Button text="Click me" onClick={() => console.log('clicked')} />
  </AppRoot>
);
```

Components take the same props as Discord's. If you know how a component is used in the client, you know how to use it here.

## Themes

Discord has four themes. Pass the class name value to `AppRoot`, or use `ThemeTypes` from the tokens package.

| Theme | Value      |
| ----- | ---------- |
| Light | `light`    |
| Ash   | `dark`     |
| Dark  | `darker`   |
| Onyx  | `midnight` |

To give part of the page a different theme, wrap it in `ThemeProvider`.

## Rendering messages

`Message` takes a message object in the same shape the Discord API returns and renders it like the client does. That includes content, attachments, embeds, buttons, selects and Components v2 layouts. Markdown is not parsed. Content is shown as plain text unless you pass your own `renderMarkdown` function.

```tsx
import { Message } from '@discord-components/messages';

<Message
  message={{
    id: '1',
    channel_id: '1',
    type: 0,
    timestamp: '2026-01-01T12:00:00.000Z',
    edited_timestamp: null,
    content: 'Hello!',
    author: { id: '1', username: 'wumpus', global_name: 'Wumpus', avatar: null },
    embeds: [{ title: 'An embed', description: 'Some text', color: 0x5865f2 }],
    components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Click me', custom_id: 'click' }] }],
  }}
  onInteraction={({ data }) => console.log(data.custom_id)}
/>;
```

Interaction modals work the same way. Pass the modal payload your bot would send to `openInteractionModal` (or render `InteractionModal` yourself) and you get the modal as Discord shows it, with the submitted values handed back in the API's format.

Clicking an image or video opens Discord's media viewer, with zoom, panning and a carousel through the message's media.

The pieces are also exported on their own: `MessageEmbeds`, `MessageAttachments`, `MediaMosaic`, `MediaGallery`, `openMediaViewer` and the individual message components.

## Playground

```bash
pnpm install
pnpm dev
```

This opens the playground at http://localhost:5173. Pick a collection on the left, then a story. The controls panel changes the story's props, and the settings menu switches the theme.

## How it's built

Nothing here is styled by hand. The scripts in `scripts/` download Discord's web build and pull what we need out of it.

```bash
pnpm assets:fetch                   # download every JS and CSS file of the current build into .cache/
pnpm assets:split                   # split the build into one file per module
pnpm assets:css <module-id>         # turn one of Discord's CSS modules into a .module.css file
node scripts/extract-tokens.mjs     # regenerate the design tokens
node scripts/extract-icons.mjs      # regenerate the icons
```

To check a component against Discord, start the playground and the reference server, then compare a story:

```bash
node scripts/reference/server.mjs 5174
```

```bash
node scripts/compare.mjs mana/button --theme all
```

The reference server runs Discord's own components from the downloaded build. `compare.mjs` renders the same story with the same props in both, then reports how many pixels differ in each theme. `compare-messages.mjs` does the same for the message components.

## Scripts

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start the playground            |
| `pnpm build`     | Build every package             |
| `pnpm typecheck` | Type check the whole repo       |
| `pnpm lint`      | Run ESLint                      |
| `pnpm format`    | Format everything with Prettier |
