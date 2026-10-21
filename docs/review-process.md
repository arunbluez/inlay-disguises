# Review process

A community disguise goes from idea to the app in four steps: proposal and community vote, pull request, maintainer and security review, and a release that bundles it into the app.

## 1. Propose it

Open an issue titled `Disguise proposal: <name>` before you write much code. Describe:

- what the app does and who would plausibly have it on their phone;
- the trigger: which field takes the code and which button the user holds (see [Trigger design](trigger-design.md));
- any package you need that is not on the [allowlist](sdk-reference.md#imports-and-the-allowlist);
- a sketch or screenshots, if you have them.

**Community vote.** Anyone can vote with a 👍 reaction on the proposal and discuss it in the comments. Maintainers use the votes to decide which proposals to take on and in what order; a well-supported proposal with a sound trigger is the one most likely to be reviewed soon. A maintainer labels the issue when it is accepted for review, or explains why not.

## 2. Open a pull request

Build the disguise from `_template` ([Getting started](getting-started.md)), link the proposal issue, and make sure that:

- every commit is signed off (DCO, see [CONTRIBUTING](../CONTRIBUTING.md));
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check-imports`, `pnpm check-words` and `pnpm format:check` pass;
- the disguise is registered in the playground and has a test that asserts `submit` on a hold and a cleared field after `host.reset()`;
- the pull request description includes playground screenshots in light and dark.

## 3. Maintainer and security review

A maintainer reviews the disguise as an app: does it look and behave like a real one, is it built from the shared UI kit and tokens, are the copy and the icon convincing, does it work in light and dark, on small and large screens.

A security review follows, against a fixed list:

- **Trigger.** A tap never submits; a hold submits once; a wrong code does exactly the normal thing (no message, haptic, delay or log); `onReset` clears the field and cancels pending work. The [checklist](trigger-design.md#checklist) is the reference.
- **Boundary.** Only allowed imports and dependencies; no dynamic `require`/`import`; no files under `__tests__/` imported by shipped code.
- **Data.** Nothing from the code field is stored, logged or sent. Storage holds only the disguise's own settings and history.
- **Network.** `allowedHosts` is empty unless the disguise genuinely needs a service, and every listed host is justified.
- **Words.** `check-words` passes, and any new allow entry is an exact pattern with a sound reason.
- **Size.** The disguise adds little to the app download; large assets are questioned.

Reviewers may ask for changes in either pass. A pull request is merged when both reviews approve it.

## 4. Bundled into a release

Merged disguises are compiled into the next app release, with their code, icons and assets inside the app binary. Nothing is downloaded at runtime: a disguise cannot be added, updated or changed after the app ships, except by a new app release, and every release goes through the same review. That is why every change to a merged disguise, however small, comes back through a pull request.

## Tier

Each manifest sets `tier: 'free' | 'pro'`. A community disguise can ship either way: free for everyone, or in the app's paid Pro tier. The contributor picks one and says so in the pull request; `_template` starts at `'pro'`, so change it to `'free'` if that is what you want.
