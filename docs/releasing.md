# Releasing

For maintainers. A release publishes the packages to npm from `main` and marks the commit with an `sdk-x.y.z` tag. Contributors never need this page.

Published (each has `publishConfig.access: public`, a `LICENSE`, a `README` and a `files` list):

| Package                        | Path                    |
| ------------------------------ | ----------------------- |
| `@inlay-app/disguise-sdk`      | `packages/disguise-sdk` |
| `@inlay-app/ui`                | `packages/ui`           |
| `@inlay-app/testkit`           | `packages/testkit`      |
| `@inlay-app/disguise-compress` | `disguises/compress`    |
| `@inlay-app/disguise-dial`     | `disguises/dial`        |
| `@inlay-app/disguise-sudoku`   | `disguises/sudoku`      |
| `@inlay-app/disguise-brief`    | `disguises/brief`       |

Never published: `apps/playground` and `disguises/_template`. Their `package.json` files opt out of publishing, so `pnpm publish` skips them.

The packages ship their TypeScript source as is; Metro and `jest-expo` compile it, so there is no build step. `pnpm publish` rewrites each `workspace:*` dependency to the exact version it depends on.

## Once, before the first release

### npm scope

1. Sign in at [npmjs.com](https://www.npmjs.com) with two-factor authentication on (**Account › Two-Factor Authentication**, "Authorization and writes").
2. Check the scope is free: `npm view @inlay-app/disguise-sdk` must answer `404`. Then **Profile picture › Add Organization**, name `inlay-app`, plan **Unlimited public packages** (free). If `inlay-app` is taken, stop: a different scope renames every import in this repo and in the app.
3. Never put an npm token in a file in this repo, in `.npmrc` or in a shell history. Publishing is done from a maintainer's machine with `npm login`.

### GitHub settings

- **Discussions and the Proposals category.** **Settings › General › Features**, tick **Discussions**. Then open the **Discussions** tab, **Categories** (the pencil next to the category list) › **New category**: name `Proposals`, description `Ideas for new disguises. Upvote the ones you want.`, format **Open-ended discussion**, then **Create**. The links in the README, the review process and the issue chooser point at `discussions/categories/proposals`.
- **DCO.** `.github/workflows/dco.yml` runs a check named `DCO` on every pull request to `develop`. Once it has run on one pull request: **Settings › Rules › Rulesets** (or **Settings › Branches** for a classic rule) › the rule for `develop` › **Require status checks to pass** › **Add checks** › `DCO`, then **Save**. Leave it off `main`: release pull requests carry history from before the check.
- **Vulnerability reports.** **Settings › Advanced Security** (named **Code security** on some accounts) › the vulnerability reporting toggle › **Enable**, so that **Security › Report a vulnerability** works as [SECURITY](../SECURITY.md) says.
- **Labels.** The issue forms apply `proposal` and `bug`. `bug` exists by default; create `proposal` under **Issues › Labels › New label**.

## Each release

1. On `develop`, set `"version"` in the `package.json` of every package that changed, and raise `minSdk` in a disguise only when it needs the new SDK.
2. Merge the work into `develop` through a pull request, then open and merge a pull request from `develop` to `main`.
3. On a clean checkout of `main`:

   ```sh
   git switch main && git pull --ff-only
   nvm use && corepack enable
   pnpm install --frozen-lockfile
   pnpm typecheck && pnpm lint && pnpm test && pnpm check-imports && pnpm check-words && pnpm format:check
   ```

4. Look at exactly what will be published. Each tarball must hold only `package.json`, `README.md`, `LICENSE`, `src/` (and `assets/` for a disguise, `allowlist.json` for the SDK): no `__tests__/`, fixtures, `.agent`, `.env` or `.npmrc`.

   ```sh
   pnpm -r publish --dry-run
   ```

5. Tag, publish, then push the tag (the example is `1.0.0`):

   ```sh
   git tag -a sdk-1.0.0 -m "SDK 1.0.0"
   npm login        # opens the browser; nothing to paste
   npm whoami
   pnpm -r publish
   git push origin sdk-1.0.0
   ```

   `pnpm -r publish` publishes in dependency order (`@inlay-app/ui`, then the SDK, then the testkit and the disguises) and skips any version already on the registry, so if npm asks for a one-time password and it runs out part way, run it again with `--otp <code>`. It refuses to run from a branch other than `main` or with uncommitted changes.

6. Check the result: `npm view @inlay-app/disguise-sdk version` prints the new version, and the package pages on npmjs.com show the README.

A published version can't be replaced. A mistake is fixed with a new patch version; `npm deprecate @inlay-app/<name>@<version> "<reason>"` warns anyone who installs the bad one.
