# inlay-disguises

The open-source half of **Inlay**, a private media vault for iOS and Android that lives inside an ordinary, fully working app. The ordinary app is the _disguise_: a photo compressor, a daily Sudoku, a news reader, a clock. This repository holds everything a disguise is built from, and every disguise that ships.

## What a disguise is

A disguise is a small React Native package that does one normal job well and has exactly one extra behaviour: somewhere it would ask for a number anyway, the user can type a code and hold a button, and the package hands that value to the app that runs it. The package never learns whether the code meant anything, and a wrong code does exactly what the button always does. That is the whole contract.

Every disguise is reviewed in the open, compiled into an app release and shipped inside the binary. Nothing is downloaded at runtime.

## What is here

| Path                                            | What it is                                                                                                                                                                          | npm                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `packages/disguise-sdk`                         | The SDK: the `DisguiseManifest` type, six hooks (`useTrigger`, `useLifecycle`, `useDisguiseStorage`, `useDisguiseFetch`, `useHostTheme`, `useBottomInset`) and the import allowlist | `@inlay-app/disguise-sdk` |
| `packages/ui`                                   | The shared UI kit and design tokens, used by every disguise and by the app itself                                                                                                   | `@inlay-app/ui`           |
| `packages/testkit`                              | `MockHost` and `renderDisguise()`: run a disguise in Jest or the playground without the app                                                                                         | `@inlay-app/testkit`      |
| `apps/playground`                               | An Expo development app that runs any disguise standalone against `MockHost`                                                                                                        | not published             |
| `disguises/compress`, `sudoku`, `brief`, `dial` | The disguises that ship in the app                                                                                                                                                  | `@inlay-app/disguise-*`   |
| `disguises/_template`                           | The starting point for a new one, with a complete test suite                                                                                                                        | not published             |

## Quick start

Node 22 (pinned in `.nvmrc`) and pnpm (pinned in `package.json`, through Corepack):

```sh
git clone https://github.com/arunbluez/inlay-disguises.git
cd inlay-disguises
nvm use && corepack enable && pnpm install
rsync -a --exclude node_modules disguises/_template/ disguises/<your-id>/
```

[Getting started](docs/getting-started.md) has a 15-minute path from here to a renamed disguise with its tests passing, then the full path: replace the template's field and button with your app, register it in the playground, run it on an emulator, and run the checks:

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm check-imports && pnpm check-words && pnpm format:check
```

## Playground

`apps/playground` is a development build that lists every disguise and runs one at a time against `MockHost`, a stand-in for the app. A banner shows the last code the disguise submitted, with **Reset** (runs the disguise's reset handlers, as the app does) and **Back**. With an emulator or simulator running:

```sh
pnpm --filter @inlay-app/playground android   # or: ios (macOS with Xcode)
```

The first run compiles native code; after that `pnpm --filter @inlay-app/playground start` is enough. [Getting started](docs/getting-started.md#4-register-it-in-the-playground) shows how to add your disguise to it.

## Docs

- [Getting started](docs/getting-started.md): clone, copy the template, run it, run the checks.
- [SDK reference](docs/sdk-reference.md): the manifest, the hooks, the UI kit, the import allowlist, versions and testing.
- [Trigger design](docs/trigger-design.md): how a disguise takes a code, and the reviewer's checklist.
- [Review process](docs/review-process.md): proposal and vote, review, release, and choosing the free or Pro tier.
- [Releasing](docs/releasing.md): how maintainers tag and publish the packages.

## The rules

- **Imports.** Only `react`, `react-native`, `@inlay-app/disguise-sdk`, `@inlay-app/ui` and the packages in [`packages/disguise-sdk/allowlist.json`](packages/disguise-sdk/allowlist.json). `pnpm check-imports` enforces it. Additions are requested in an issue first and land as their own pull request.
- **No telltale words.** Nothing in a disguise (strings, identifiers, file names, icon, metadata) may hint at what it covers. The list lives in [`scripts/check-words.mjs`](scripts/check-words.mjs); `pnpm check-words` enforces it.
- **The trigger.** A tap never submits. A hold of 600 ms submits the field's value once. A wrong code does exactly what a tap does. `onReset` clears the field, cancels pending work and returns home. [Trigger design](docs/trigger-design.md) has the reasoning and the review checklist.
- **No network by default.** `allowedHosts` stays empty unless the disguise needs a service.

## Contributing

Read [CONTRIBUTING](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Commits are signed off under the DCO (`git commit -s`); a check on every pull request to `develop` enforces it. Work on a branch cut from `develop` and open the pull request against `develop`. Ideas for new disguises start in [Discussions › Proposals](https://github.com/arunbluez/inlay-disguises/discussions/categories/proposals), where the community votes, or as a [disguise proposal](https://github.com/arunbluez/inlay-disguises/issues/new?template=disguise-proposal.yml) issue.

Found a security problem? Don't open an issue: see [SECURITY](SECURITY.md).

## Licence

Apache-2.0. The app that runs these disguises is a separate, private codebase; this repository contains nothing from it beyond the published package interfaces.
