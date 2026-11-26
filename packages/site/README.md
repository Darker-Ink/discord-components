# @discord-mana/site

The home page at https://discord-mana.dev. One page built with discord-mana's own components and tokens: the install line, links to the playground, the preview API and GitHub, a live `<Message>` whose buttons switch the theme, and the list of packages.

## Develop

```sh
pnpm --filter @discord-mana/site dev       # http://localhost:5173 (or the next free port)
pnpm --filter @discord-mana/site build     # dist/: index.html, 404.html and the assets
```

`public/boot.js` sets the theme class before the app loads, so the page never flashes the wrong background. It reads the same storage key as `src/theme.ts`. The page defaults to Dark.

## Deploy

Static assets on Cloudflare Workers, with no Worker script. `wrangler.jsonc` serves `dist/` on the Custom Domain `discord-mana.dev` and answers unknown paths with `404.html`. `wrangler.www.jsonc` is a separate one-line Worker (`src/www/redirect.ts`) on `www.discord-mana.dev` that redirects to the apex with a 301, keeping the path and query.

```sh
npx wrangler login
pnpm run deploy   # vite build, then both wrangler deploys
```

The `discord-mana.dev` zone has to be on the same Cloudflare account. The first deploy creates the DNS records and certificates for the apex and `www`; remove any existing records for those names first. If you'd rather not run a Worker for `www`, skip `wrangler.www.jsonc` and add a Redirect Rule in the dashboard instead (a proxied DNS record for `www`, then a 301 from `www.discord-mana.dev/*` to `https://discord-mana.dev/${1}`). From the repo root, `pnpm deploy:site` does the same as `pnpm run deploy` here.
