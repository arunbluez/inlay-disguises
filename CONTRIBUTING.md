# Contributing

Thanks for building a disguise. This file is a stub; the full guide (getting started, SDK reference, trigger design and the review process) lands in `docs/` with the SDK.

## Licence

This repository is licensed under [Apache-2.0](LICENSE). By contributing, you agree that your contribution is licensed under the same terms.

## Developer Certificate of Origin

Every commit must be signed off under the [Developer Certificate of Origin 1.1](DCO). Sign off with `git commit -s`, which adds a line like:

```
Signed-off-by: Your Name <you@example.com>
```

Use your real name. Pull requests with unsigned commits can't be merged.

## Community disguises

Community disguises ship as Pro disguises in the app. Set `tier: 'pro'` in your manifest.

## Before you open a pull request

Run these at the repo root (Node 22, `nvm use`):

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Then run your disguise in `apps/playground` against `MockHost`.
