# Releasing

Five packages are published to npm, always together and with the same version:

- `discord-mana`
- `@discord-mana/tokens`
- `@discord-mana/icons`
- `@discord-mana/components`
- `@discord-mana/messages`

The playground and the preview site are private and never published.

## Adding a changeset

When a pull request changes something users of the packages will notice, add a changeset:

```bash
pnpm changeset
```

Pick the packages, the kind of bump (patch, minor or major) and write a line for the changelog. This creates a
Markdown file in `.changeset/`; commit it with the change. The packages are versioned as one group, so the
highest bump in any changeset applies to all of them.

## What the release workflow does

`.github/workflows/release.yml` runs on every push to `master`:

1. If there are changesets, it opens (or updates) the **Version packages** pull request. That PR bumps the
   versions, writes the changelogs and deletes the changesets.
2. When that PR is merged, there are no changesets left and the new versions aren't on npm yet, so the workflow
   builds the packages, packs them with `pnpm pack` (which points `exports` at `dist` and replaces the
   `workspace:*` dependencies with the released version) and publishes the tarballs to npm. Publishing uses
   npm trusted publishing (no npm token) and adds provenance. It then tags the release and creates GitHub
   releases.

`.github/workflows/ci.yml` typechecks, lints, checks formatting and builds every pull request and push.

To try a build locally: `pnpm build`, then `pnpm pack` in a package directory to see the tarball.

## One-time setup

1. **GitHub**: in the repository's Settings → Actions → General, enable "Allow GitHub Actions to create and
   approve pull requests", so the workflow can open the Version packages PR.
2. **Create the packages on npm.** npm only lets you add a trusted publisher to a package that already exists, so
   publish a first `0.0.0` of each package by hand, before merging the first Version packages PR. Log in to npm
   with the account that owns the `@discord-mana` scope and `discord-mana`, then on an up-to-date, clean `master`:

   ```bash
   npm login
   pnpm install
   pnpm build
   pnpm -r publish --access public
   ```

3. **Add the trusted publisher** to each of the five packages: on npmjs.com, open the package → Settings →
   Trusted Publisher → GitHub Actions, and enter:
   - Organization or user: `Darker-Ink`
   - Repository: `discord-components`
   - Workflow filename: `release.yml`
   - Environment: leave empty

   Optionally, under Settings → Publishing access, choose "Require two-factor authentication and disallow
   tokens", since the workflow doesn't need a token.

4. Merge the Version packages PR. The workflow publishes the new version.
