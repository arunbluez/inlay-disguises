# Contributing

Thanks for building a disguise. A disguise is a small, ordinary-looking app that ships inside Inlay; this repository holds the SDK, the shared UI kit, the test kit, the playground and every disguise.

## Guides

1. [Getting started](docs/getting-started.md): clone, install, copy `_template`, run it in the playground, run the checks.
2. [SDK reference](docs/sdk-reference.md): the manifest, the hooks, the import allowlist and how to request an addition, versions and testing.
3. [Trigger design](docs/trigger-design.md): how a disguise takes a code, and why a wrong code must do exactly the normal thing.
4. [Review process](docs/review-process.md): proposal and community vote, maintainer and security review, bundling into a release.

## Licence

This repository is licensed under [Apache-2.0](LICENSE). By contributing, you agree that your contribution is licensed under the same terms.

## Developer Certificate of Origin

Every commit must be signed off under the [Developer Certificate of Origin 1.1](DCO). Sign off with `git commit -s`, which adds a line like:

```
Signed-off-by: Your Name <you@example.com>
```

Use your real name. Pull requests with unsigned commits can't be merged. To sign off commits you already made, run `git rebase --signoff <base>` and force-push your branch.

## Rules every disguise follows

- **Imports.** A disguise imports only `react`, `react-native`, `@inlay/disguise-sdk`, `@inlay/ui` and the packages in [`packages/disguise-sdk/allowlist.json`](packages/disguise-sdk/allowlist.json). `pnpm check-imports` enforces it. Ask for an addition in an issue first ([how](docs/sdk-reference.md#requesting-an-addition)).
- **No telltale words.** A disguise must never hint at what it covers: not in its strings, identifiers, file names, icon or package metadata. `pnpm check-words` holds the word list and checks every disguise, the UI kit and these docs; run it and reword anything it reports. If a hit is a platform keyword rather than text (a style value, a config field), add an exact-pattern entry with a reason to `check-words.allow.json`.
- **The trigger.** A tap never submits; a hold submits; a wrong code does exactly the normal thing; `onReset` clears the field and cancels pending work. See [Trigger design](docs/trigger-design.md).
- **No network by default.** `allowedHosts` stays empty unless the disguise needs a service, and every host is justified in the pull request.

## Community disguises

Community disguises are **proposed** to ship as Pro disguises in the app: set `tier: 'pro'` in your manifest, as `_template` does. This is a proposal, not a final decision; see [Review process](docs/review-process.md#tier).

## Before you open a pull request

Run these at the repo root (Node 22, `nvm use`):

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm check-imports
pnpm check-words
pnpm format:check
```

Then run your disguise in `apps/playground` against `MockHost`, try a hold and a Reset, and add light and dark screenshots to the pull request.
