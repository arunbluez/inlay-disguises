# Getting started

This guide takes you from a fresh clone to your own disguise running in the playground, with every check passing. It takes about half an hour, most of it the first native build.

A disguise is a small, ordinary-looking app screen (a photo compressor, a puzzle, a news reader) that ships inside the Inlay app. It is an npm package in `disguises/` that exports a manifest. The [SDK reference](sdk-reference.md) describes the manifest and the hooks; [Trigger design](trigger-design.md) explains how a disguise takes a code.

## 1. Tools

- **Node 22.** The version is pinned in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm): `nvm install` once, then `nvm use` in every new shell.
- **pnpm.** The version is pinned in `package.json` (`packageManager`). Run `corepack enable` once and Node picks it up.
- **An emulator or simulator.** Android Studio with an Android emulator (any OS), or Xcode with an iOS simulator (macOS only). The playground is a development build, not Expo Go, so the first run compiles native code.

## 2. Clone and install

```sh
git clone https://github.com/arunbluez/inlay-disguises.git
cd inlay-disguises
nvm use
corepack enable
pnpm install
```

The repo is a pnpm workspace: `packages/disguise-sdk` (the SDK), `packages/ui` (shared components and tokens), `packages/testkit` (a mock host for tests and the playground), `apps/playground` (runs disguises standalone) and `disguises/*` (one package per disguise).

## 3. Copy the template

Pick a short kebab-case id for your disguise, for example `unit-converter`, and copy `_template` without its installed modules:

```sh
rsync -a --exclude node_modules disguises/_template/ disguises/unit-converter/
```

Then edit the copy:

1. `package.json`: set `name` to `@inlay/disguise-unit-converter` and write a one-line `description`.
2. `src/index.tsx`: set the manifest `id` (the same kebab-case id), `name` (what appears under the launcher icon) and `triggerDescription` (one sentence: how a code is entered). Keep `version` at `0.0.0` and `minSdk` at the SDK version you build against.
3. `assets/icon/`: replace the six neutral placeholders with your own 1024x1024 PNGs. The [icon set](sdk-reference.md#icon) lists what each one is.
4. Replace the template's field, button and `runNormalAction` with your disguise. Keep the hold, `submit` and `onReset` wiring; [Trigger design](trigger-design.md) explains why each part is there.
5. Update `__tests__/template.test.tsx` (rename it after your disguise) so it drives your screens.

Run `pnpm install` again so the workspace links the new package.

## 4. Register it in the playground

The playground lists every disguise in `apps/playground/src/disguises.ts` and runs one at a time against `MockHost`, a stand-in for the real app.

1. Add your package to `apps/playground/package.json` under `dependencies`:

   ```json
   "@inlay/disguise-unit-converter": "workspace:*"
   ```

   If your disguise uses a native package from the [allowlist](sdk-reference.md#imports-and-the-allowlist) that the playground does not have yet, add that package too, at the version Expo recommends (`npx expo install <package>` inside `apps/playground`).

2. Add one line to `apps/playground/src/disguises.ts`:

   ```ts
   import unitConverter from '@inlay/disguise-unit-converter';

   export const disguises: readonly DisguiseManifest[] = [
     template, // _template
     unitConverter,
   ];
   ```

3. Run `pnpm install`.

## 5. Run it on an emulator or simulator

Start an Android emulator or boot an iOS simulator, then from the repo root:

```sh
pnpm --filter @inlay/playground android   # Android
pnpm --filter @inlay/playground ios       # iOS, macOS with Xcode only
```

This builds the development app, installs it and starts Metro. If port 8081 is taken, add `--port 8083` (any free port). After the first build, `pnpm --filter @inlay/playground start` is enough until you add a native package.

In the playground, tap your disguise in the list. A banner across the top shows **Last code**, the last value your disguise handed to `submit`, with **Reset** (runs your `onReset` handlers, as the real app does after it accepts a code) and **Back** (returns to the list). Try a hold with a value in your field: the banner shows the value, and your screen should carry on exactly as it would after a tap.

## 6. Run the checks

Every pull request runs these at the repo root, and so should you before you push:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm check-imports
pnpm check-words
pnpm format:check
```

- `check-imports` fails when a disguise imports, or depends on, a package outside the [import boundary](sdk-reference.md#imports-and-the-allowlist).
- `check-words` fails when a disguise, the shared UI kit or these docs contain a word that would hint at what a disguise covers. It prints the file, the line and the word. If the hit is a platform keyword rather than text (a style value, a config field), add an exact-pattern entry with a reason to `check-words.allow.json`; never reword a style or drop a field to get past it.
- `pnpm format` rewrites files with Prettier when `format:check` fails.

To run one package's tests while you work: `pnpm --filter @inlay/disguise-unit-converter test`.

When everything passes, read [CONTRIBUTING](../CONTRIBUTING.md) for sign-off and the [review process](review-process.md), and open a pull request.
