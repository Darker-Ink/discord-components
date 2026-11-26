# discord-mana

React versions of Discord's UI components. The styles, props and markup come straight from Discord's own web build, and every component is checked pixel by pixel against the real thing in all four themes.

## What's included

| Package                    | What it has                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@discord-mana/tokens`     | Colors, spacing, fonts and the four themes                                                                                                |
| `@discord-mana/icons`      | Every icon in the Discord client, under the same names Discord uses                                                                       |
| `@discord-mana/components` | The Mana design system (buttons, inputs, selects, modals, tooltips, menus, date pickers, toasts and more), plus the older Void components |
| `@discord-mana/messages`   | Message rendering: embeds, attachments, the media gallery and viewer, message components (including Components v2) and interaction modals |
| `@discord-mana/markdown`   | Discord's markdown renderer: its fork of simple-markdown with every rule the client uses, mentions, emoji, timestamps and code blocks     |
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

`@discord-mana/markdown` is a port of the client's markdown: Discord's patched simple-markdown, the same rules with the same regexes and order, the same parse state per context, and the same React output. Contexts are presets named after where the client parses text (`message`, `reply`, `textDisplay`, `embedTitle`, `embedTitleWithoutLinks`, `embedDescription`, `embedFieldValue`, `channelTopic`, `poll`…). Rules can be turned off (or on) by name; there's no API for custom rules.

```tsx
import { Markdown, parse } from '@discord-mana/markdown';

<div className="your-markup-container">
  <Markdown content="**Hi** <@1234> ||spoiler|| <t:1764158400:R>" rules={{ codeBlock: false }} />
</div>;

parse('`code` and :tada:', { preset: 'embedDescription', rules: ['inlineCode', 'emoji'] }); // the AST
```

Mentions, channels, roles, servers, slash commands and emoji images come from the same `resolvers` as `Message` (`MessageResolversContext`); unknown ones show what Discord shows (`@unknown-user`, `#unknown-channel`…). Clicks on mentions and links go to `onMarkdownInteraction` in `MessageActionsContext`. Code blocks are highlighted with Arborium like the client, for the languages you enable (see below); `setCodeHighlighter` swaps in another engine.

### Syntax highlighting

The client highlights code blocks with Arborium (tree-sitter grammars compiled to WebAssembly). Grammars are optional peer dependencies, so nothing is installed or bundled until you pick languages. Install Arborium and the grammars you want, and import their entries once (e.g. next to your app's root):

```bash
npm i @arborium/arborium @arborium/rust @arborium/python
```

```ts
import '@discord-mana/markdown/languages/rust';
import '@discord-mana/markdown/languages/python';
// or every language Discord highlights (installs about 180 MB of grammars):
// import '@discord-mana/markdown/languages/all';
```

Each grammar becomes its own chunk that loads the first time a code block uses it (plain text shows meanwhile), and nothing is fetched from a CDN. Code in a language you haven't enabled stays plain text. Aliases work like in Discord (`js`, `ts`, `py`, `rs`, `sh`, `yml`, `c#`…) once their language is enabled.

Languages: `ada`, `agda`, `asciidoc`, `asm`, `awk`, `bash`, `batch`, `c`, `c-sharp`, `caddy`, `capnp`, `cedar`, `cedarschema`, `clojure`, `cmake`, `commonlisp`, `cpp`, `css`, `d`, `dart`, `devicetree`, `diff`, `dockerfile`, `dot`, `elisp`, `elixir`, `elm`, `erlang`, `fish`, `fsharp`, `gleam`, `glsl`, `go`, `graphql`, `groovy`, `haskell`, `hcl`, `hlsl`, `html`, `idris`, `ini`, `java`, `javascript`, `jinja2`, `jq`, `json`, `julia`, `kotlin`, `lean`, `lua`, `markdown`, `matlab`, `meson`, `ninja`, `nix`, `objc`, `ocaml`, `perl`, `php`, `postscript`, `powershell`, `prolog`, `python`, `query`, `r`, `rego`, `rescript`, `ron`, `ruby`, `rust`, `scala`, `scheme`, `scss`, `solidity`, `sparql`, `sql`, `ssh-config`, `starlark`, `styx`, `svelte`, `swift`, `textproto`, `thrift`, `tlaplus`, `toml`, `tsx`, `typescript`, `typst`, `verilog`, `vhdl`, `vim`, `vue`, `wit`, `x86asm`, `xml`, `yaml`, `yuri`, `zig`, `zsh`. Discord also highlights `luau` and `ansi`: `luau` has no Arborium package (it stays plain), and ` ```ansi ` blocks need no grammar.

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
