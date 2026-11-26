# @discord-mana/builder-site

The message builder at https://builder.discord-mana.dev: build a Discord message (content, embeds, or Components v2) where it renders, check it against Discord's limits, and export it as JSON or send it with a webhook. It is `@discord-mana/builders`' UI (`BuilderProvider`, `ComponentPalette`, `BuilderCanvas`, `BuilderPanels`) laid out as a Discord window, with discord-mana's brand and theme switcher.

Everything happens in the browser:

- **Drafts** autosave to `localStorage` (`discord-mana-builder:draft`). "New" starts from a blank message or an example; undo brings the previous draft back.
- **Share** copies a link with the message in its hash (`#m=`, the payload deflated with `CompressionStream` and base64url'd). The hash never reaches a server; opening the link loads the message.
- **Send** posts to the webhook straight from the browser (`sendWebhookMessage`). The webhook URL is only kept if "Remember in this browser" is on (`discord-mana-builder:webhook`). Once a valid URL is entered, the builder looks the webhook up (Get Webhook with Token) to preview its name and avatar and to know whether it can send buttons and selects.
- **Open as preview** posts the message to `preview.discord-mana.dev` with an API key typed into the popout (never stored), or copies the request body.

## Develop

```sh
pnpm --filter @discord-mana/builder-site dev      # http://localhost:5175
pnpm --filter @discord-mana/builder-site build    # dist/
```

`public/boot.js` sets the theme class before the app loads (same storage key and default, Dark, as the other sites).

## Test

```sh
pnpm --filter @discord-mana/builder-site dev &
CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @discord-mana/builder-site test:e2e http://localhost:5175
```

`scripts/e2e.mjs` builds a classic message by typing in place, reorders fields and embeds by dragging, switches to Components v2 and builds a container with a section, a gallery and an action row, exceeds a limit, exports and re-imports the JSON and sends it to a mocked webhook. Screenshots go to `test-results/e2e`. `node scripts/builder-parity.mjs` (repo root, with the playground running) checks that the builder draws an unselected message pixel for pixel like `<Message>`.

## Deploy

Static assets on Cloudflare Workers, with no Worker script. `wrangler.jsonc` serves `dist/` on the Custom Domain `builder.discord-mana.dev`; unknown paths serve the app.

```sh
npx wrangler login
pnpm run deploy   # vite build && wrangler deploy
```

The `discord-mana.dev` zone has to be on the same Cloudflare account; the first deploy creates the DNS record and certificate. From the repo root, `pnpm deploy:builder` does the same.
