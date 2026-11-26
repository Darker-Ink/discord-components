# discord-mana

React versions of Discord's UI components. The styles, props and markup come straight from Discord's own web build, and every component is checked pixel by pixel against the real thing in all four themes.

Links: [Home](https://discord-mana.dev), [Playground](https://play.discord-mana.dev), [Preview](https://preview.discord-mana.dev)

## What's included

| Package                    | What it has                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@discord-mana/tokens`     | Colors, spacing, fonts and the four themes                                                                                                |
| `@discord-mana/icons`      | Every icon in the Discord client, under the same names Discord uses                                                                       |
| `@discord-mana/components` | The Mana design system (buttons, inputs, selects, modals, tooltips, menus, date pickers, toasts and more), plus the older Void components |
| `@discord-mana/messages`   | Message rendering: embeds, attachments, the media gallery and viewer, message components (including Components v2) and interaction modals |
| `@discord-mana/markdown`   | Discord's markdown: the parser and renderer for messages and embeds, with mentions, emoji, timestamps and highlighted code blocks         |
| `@discord-mana/slate`      | The chat input: Discord's rich text editor with live markdown, mentions and emoji                                                         |
| `@discord-mana/playground` | A playground for browsing and trying out every component                                                                                  |

Void is Discord's older design system. Discord hardly uses it anymore, so use the Mana components for anything new.

## Getting started

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

`Message` takes a message object in the same shape the Discord API returns and renders it like the client does. That includes content, attachments, embeds, buttons, selects and Components v2 layouts. Content is shown as plain text unless you pass `renderMarkdown` (and `renderEmbedMarkdown` for embeds); `@discord-mana/markdown` has both.

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
    components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Click me', custom_id: 'click' }] }],
  }}
  onInteraction={({ data }) => console.log(data.custom_id)}
/>;
```

Interaction modals work the same way. Pass the modal payload your bot would send to `openInteractionModal` (or render `InteractionModal` yourself) and you get the modal as Discord shows it, with the submitted values handed back in the API's format.

Clicking an image or video opens Discord's media viewer, with zoom, panning and a carousel through the message's media.

The pieces are also exported on their own: `MessageEmbeds`, `MessageAttachments`, `MediaMosaic`, `MediaGallery`, `openMediaViewer` and the individual message components.

## Markdown

`@discord-mana/markdown` is a port of Discord's markdown parser. It has the same rules and renders the same elements as the client, so mentions, emoji, timestamps, spoilers and code blocks look like they do in Discord.

```bash
npm i @discord-mana/markdown
```

`renderMessageMarkdown` and `renderEmbedMarkdown` plug into `Message` (see above). To render markdown on its own, use `Markdown`:

```tsx
import { Markdown } from '@discord-mana/markdown';

<Markdown content="**Hi** <@1234> ||spoiler|| <t:1764158400:R>" />;
```

Mentions and custom emoji are looked up through the same `resolvers` as `Message`.

### Syntax highlighting

Code blocks are plain text until you enable languages. Install Arborium and the grammars you want:

```bash
npm i @arborium/arborium @arborium/rust
```

Then import each language once, for example next to your app's root:

```ts
import '@discord-mana/markdown/languages/rust';
```

`@discord-mana/markdown/languages/all` enables every language Discord highlights, but that needs all of the grammar packages (about 180 MB). Each grammar is loaded the first time a code block uses it.

Languages: `ada`, `agda`, `asciidoc`, `asm`, `awk`, `bash`, `batch`, `c`, `c-sharp`, `caddy`, `capnp`, `cedar`, `cedarschema`, `clojure`, `cmake`, `commonlisp`, `cpp`, `css`, `d`, `dart`, `devicetree`, `diff`, `dockerfile`, `dot`, `elisp`, `elixir`, `elm`, `erlang`, `fish`, `fsharp`, `gleam`, `glsl`, `go`, `graphql`, `groovy`, `haskell`, `hcl`, `hlsl`, `html`, `idris`, `ini`, `java`, `javascript`, `jinja2`, `jq`, `json`, `julia`, `kotlin`, `lean`, `lua`, `markdown`, `matlab`, `meson`, `ninja`, `nix`, `objc`, `ocaml`, `perl`, `php`, `postscript`, `powershell`, `prolog`, `python`, `query`, `r`, `rego`, `rescript`, `ron`, `ruby`, `rust`, `scala`, `scheme`, `scss`, `solidity`, `sparql`, `sql`, `ssh-config`, `starlark`, `styx`, `svelte`, `swift`, `textproto`, `thrift`, `tlaplus`, `toml`, `tsx`, `typescript`, `typst`, `verilog`, `vhdl`, `vim`, `vue`, `wit`, `x86asm`, `xml`, `yaml`, `yuri`, `zig`, `zsh`.

## Chat input

`@discord-mana/slate` is Discord's chat input: the rich text editor from the message bar, with live markdown, mentions, emoji and the buttons next to it.

```bash
npm i @discord-mana/slate
```

```tsx
import { ChannelTextArea } from '@discord-mana/slate';

<ChannelTextArea placeholder="Message #general" onSubmit={(text) => console.log(text)} />;
```

`onSubmit` gets the text in message format (`<@id>` for mentions, `<:name:id>` for custom emoji). Pass `resolvers` (the same ones `Message` uses) so mentions and emoji show as pills.

## Playground

```bash
pnpm install
pnpm dev
```

This opens the playground at http://localhost:5173 (the hosted one is at https://play.discord-mana.dev). Pick a collection on the left, then a story. The controls panel changes the story's props, and the settings menu switches the theme.

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

| Command              | What it does                                                                       |
| -------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`           | Start the playground                                                               |
| `pnpm build`         | Build every package                                                                |
| `pnpm build:sites`   | Build the playground, the preview site and the home page                           |
| `pnpm deploy:<name>` | Deploy `playground`, `preview` or `site` to Cloudflare (see each package's README) |
| `pnpm typecheck`     | Type check the whole repo                                                          |
| `pnpm lint`          | Run ESLint                                                                         |
| `pnpm format`        | Format everything with Prettier                                                    |
