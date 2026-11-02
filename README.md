# inlay-disguises

The open-source half of **Inlay**, a private media vault for iOS and Android that lives inside an ordinary, fully working app. The ordinary app is the _disguise_: a photo compressor, a daily Sudoku, a news reader. This repository holds everything a disguise is built from, and every disguise that ships.

A disguise is a small React Native package that does one normal job well and has exactly one extra behaviour: somewhere it would ask for a number anyway, the user can type a code and hold a button, and the package hands that value to the app that runs it. The package never learns whether the code meant anything. That is the whole contract.

## What is here

| Path                                    | What it is                                                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/disguise-sdk`                 | The SDK: the `DisguiseManifest` type, six hooks (`useTrigger`, `useLifecycle`, `useDisguiseStorage`, `useDisguiseFetch`, `useHostTheme`, `useBottomInset`) and the import allowlist |
| `packages/ui`                           | The shared UI kit and design tokens, used by every disguise and by the app itself                                                                                                   |
| `packages/testkit`                      | `MockHost` and `renderDisguise()`: run a disguise in Jest or the playground without the app                                                                                         |
| `apps/playground`                       | An Expo dev app that runs any disguise standalone against `MockHost`                                                                                                                |
| `disguises/compress`, `sudoku`, `brief` | The three disguises that ship in the app                                                                                                                                            |
| `disguises/_template`                   | The starting point for a new one, with a complete test suite                                                                                                                        |
| `docs/`                                 | [Getting started](docs/getting-started.md) · [SDK reference](docs/sdk-reference.md) · [Trigger design](docs/trigger-design.md) · [Review process](docs/review-process.md)           |

## Build a disguise

```sh
git clone https://github.com/arunbluez/inlay-disguises.git
cd inlay-disguises
nvm use && corepack enable && pnpm install
rsync -a --exclude node_modules disguises/_template/ disguises/<your-id>/
```

Then follow [Getting started](docs/getting-started.md): rename the package, replace the template's field and button with your app, register it in `apps/playground`, run it on an emulator, and run the checks:

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm check-imports && pnpm check-words && pnpm format:check
```

## The rules

- **Imports.** Only `react`, `react-native`, `@inlay/disguise-sdk`, `@inlay/ui` and the packages in [`packages/disguise-sdk/allowlist.json`](packages/disguise-sdk/allowlist.json). `pnpm check-imports` enforces it. Additions are requested in an issue first and land as their own pull request.
- **No telltale words.** Nothing in a disguise (strings, identifiers, file names, icon, metadata) may hint at what it covers. The list lives in [`scripts/check-words.mjs`](scripts/check-words.mjs); `pnpm check-words` enforces it.
- **The trigger.** A tap never submits. A hold of 600 ms submits the field's value once. A wrong code does exactly what a tap does. `onReset` clears the field, cancels pending work and returns home. [Trigger design](docs/trigger-design.md) has the reasoning and the review checklist.
- **No network by default.** `allowedHosts` stays empty unless the disguise needs a service.

## Contributing

Read [CONTRIBUTING](CONTRIBUTING.md). Commits are signed off under the DCO (`git commit -s`). Work on a branch cut from `develop` and open the pull request against `develop`. Disguises are reviewed for the trigger rules first and for app quality second; what passes review is bundled into a release of the app. Nothing is downloaded at runtime.

## Licence

Apache-2.0. The app that runs these disguises is a separate, private codebase; this repository contains nothing from it beyond the published package interfaces.
