# @discord-mana/playground

Every component's stories, with live props, in all four themes. Live at https://play.discord-mana.dev.

## Develop

```sh
pnpm dev        # from the repo root: http://localhost:5173
```

`?embed&collection=<id>&story=<id>&theme=<theme>` renders one story without the playground around it; the compare scripts use it.

## Build

```sh
pnpm build      # vite build into dist/
pnpm preview    # serve dist/ locally
```

The build is about 205 MB, almost all of it the syntax highlighting grammars (99 wasm files, about 180 MB, each loaded the first time a code block needs it) and the Rive files (15 MB). The app itself is one 4.9 MB script (1.2 MB gzipped) and 0.6 MB of CSS. The largest file is a 15 MB grammar, under the 25 MiB per-file limit of Workers static assets.

The dev server answers `?format=` requests for the sample videos with their posters, like Discord's media proxy. A static host can't, so the build adds a service worker (`media-proxy-sw.js`, generated in `vite.config.ts`) that does the same in the browser.

## Deploy

The playground is static assets on Cloudflare Workers, with no Worker script. `wrangler.jsonc` serves `dist/` with a single-page fallback on the Custom Domain `play.discord-mana.dev`.

```sh
npx wrangler login
pnpm run deploy # vite build && wrangler deploy
```

The `discord-mana.dev` zone has to be on the same Cloudflare account. The first deploy creates the DNS record and certificate for `play`. From the repo root, `pnpm deploy:playground` does the same as `pnpm run deploy` here.
