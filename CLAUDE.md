# Inlay — disguises repo (public, Apache-2.0, DCO)

Planning context is shared with the app repo: `.agent/` here is a symlink to `../inlay-app/.agent`. Read `.agent/README.md`, then `.agent/System/03-app-specs.md` §7 (the SDK contract). PRDs that touch this repo: E00, E02, E07, E10.

## Repo map

`packages/disguise-sdk` hooks + `allowlist.json` · `packages/ui` shared components + tokens (the app uses these too) · `packages/testkit` MockHost, `renderDisguise()` · `apps/playground` runs any disguise standalone · `disguises/compress|sudoku|brief|_template` · `docs/` getting-started, sdk-reference, trigger-design, review-process.

## Commands

Node 22, pinned in `.nvmrc`: run `nvm use` at the root first. pnpm workspaces; the root scripts fan out with `pnpm -r`. Typecheck: `pnpm typecheck`. Lint: `pnpm lint`. Test: `pnpm test`. Repo guards `pnpm check-imports` and `pnpm check-words` arrive with E02. PM pipeline root: `.agent/Tasks/`, through the symlink.

## Rules

- A disguise may import only `react`, `react-native`, `@inlay/disguise-sdk`, `@inlay/ui` and the allowlist. `pnpm check-imports` enforces it.
- No telltale words anywhere in disguise source or strings. The banned list lives in the shared planning docs (`.agent/`), and `pnpm check-words` enforces it. Disguise About screens show name, version and licences only — no links, no email.
- `useTrigger().submit(code)` never returns a result; a wrong code must do the disguise's normal thing. Clear the code field in `onReset`.
- Every disguise must run in the playground against `MockHost` and have a testkit test asserting `submit` and reset.
- This repo is public: no app internals, no keys, no store credentials, nothing from `inlay-app` beyond the published package interfaces.

## Loop

Headless first: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Jest + testkit). After any UI change: run the disguise in the playground on the emulator/simulator (`pnpm --filter @inlay/playground android`, or `ios` once Xcode is installed) → `agent-device snapshot` and compare with the design → `pnpm check-imports && pnpm check-words` (from E02).

Branches: `main` (release) and `develop` (integration); work on `epic/Exx-*` cut from `develop`, PR back to `develop`.

## Never without asking

Publishing packages, creating or pushing `sdk-*` or any release tag, changing `allowlist.json`, changing the licence or CONTRIBUTING.
