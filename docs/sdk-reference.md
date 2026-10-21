# SDK reference

`@inlay/disguise-sdk` is everything a disguise uses to talk to the app that runs it (the host): a manifest type, six hooks and the shared UI kit. The source is in `packages/disguise-sdk/src`; every exported name has a doc comment there.

```ts
import {
  useTrigger,
  useLifecycle,
  useDisguiseStorage,
  useDisguiseFetch,
  useHostTheme,
  useBottomInset,
  Button,
  NumberField,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
```

## Manifest

A disguise package's default export is a `DisguiseManifest`:

| Field                | Type                  | Contract                                                                                                                                              |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`              | Stable, unique, kebab-case. The host keys the disguise's storage by it, so never change it after release.                                             |
| `name`               | `string`              | Shown in the app and under the launcher icon.                                                                                                         |
| `version`            | `string`              | The package's semver version.                                                                                                                         |
| `minSdk`             | `string`              | Lowest SDK version the disguise runs on, as plain `x.y.z`. See [Versions](#versions).                                                                 |
| `icon`               | `DisguiseIcons`       | The launcher-icon set. See [Icon](#icon).                                                                                                             |
| `root`               | `React.ComponentType` | The disguise's root screen. The host renders it inside its provider; it takes no props.                                                               |
| `triggerDescription` | `string`              | One sentence, shown to the user when they set up the disguise, saying how a code is entered: "Type your code as the target size, then hold Compress." |
| `allowedHosts`       | `readonly string[]`   | Exact host names the disguise may fetch from. Empty when it needs no network, which is the norm.                                                      |
| `tier`               | `'free' \| 'pro'`     | Whether the disguise ships free or in the paid Pro tier. Community disguises may set either (see [Review process](review-process.md#tier)).           |

### Icon

`icon` is a structured set of bundled PNGs, each `require('../assets/icon/<name>.png')` and 1024x1024 pixels:

| Slot                 | What it is                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ios.light`          | The default iOS icon, opaque, with its own background.                                                               |
| `ios.dark`           | The iOS dark appearance: the mark on a transparent background.                                                       |
| `ios.tinted`         | The iOS tinted appearance: the mark in greyscale on transparent; the system applies the tint.                        |
| `android.foreground` | Android adaptive icon foreground: the mark on transparent, inside the central safe zone (a circle 66% of the width). |
| `android.background` | Android adaptive icon background layer.                                                                              |
| `android.monochrome` | Android themed icon: the mark in one colour on transparent.                                                          |

The icon is part of the disguise: it should look like any other app of its kind, and its name and artwork must pass `check-words` like the rest of the package. `_template` ships a neutral grey disc in every slot; replace all six.

## Hooks

Each hook must be called inside the disguise's `root` (the host provides the context); outside it, the hook throws.

### `useTrigger(): Trigger`

```ts
interface Trigger {
  submit(code: string): void;
}
```

Hands a code to the host. Fire and forget: `submit` returns nothing, and no callback, promise, event or state change ever tells the disguise whether the code meant anything. After calling it, the disguise carries on with its normal behaviour, exactly as if nothing had been submitted.

- Call it only from a deliberate gesture, never from a tap or as the user types. [Trigger design](trigger-design.md) covers when and how.
- Codes are at least 4 characters. Each disguise sets its own maximum (`maxLength` on the field) and its own alphabet (digits in a number field, for example); the host treats any value it cannot use like any other wrong code.
- Never write the value you submit to storage, history or logs.

### `useLifecycle(): Lifecycle`

```ts
interface Lifecycle {
  onReset(handler: () => void): () => void;
}
```

Registers a handler the host calls to return the disguise to its home state. The host calls every handler after it accepts a code (before the disguise is shown again) and whenever the app returns to the disguise. A handler must:

- clear any field that may hold a code;
- cancel pending work (timers, queued actions, a release still to come) so nothing started before the reset runs after it;
- return the disguise to its home screen in its default state.

`onReset` returns an unregister function. Register in an effect and return that function from it, so the handler goes away on unmount:

```tsx
const lifecycle = useLifecycle();
useEffect(() => lifecycle.onReset(() => setValue('')), [lifecycle]);
```

### `useDisguiseStorage(): DisguiseStorage`

```ts
interface DisguiseStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}
```

Synchronous key-value storage for the disguise's own settings and history. The host namespaces it by the manifest `id`, so keys never need a prefix and a disguise only ever sees its own. Store strings; use `JSON.stringify` for structured values.

### `useDisguiseFetch(): DisguiseFetch`

```ts
type DisguiseFetch = (input: string, init?: RequestInit) => Promise<Response>;
```

`fetch`, limited to the manifest's `allowedHosts`. A request whose URL host is not exactly one of them rejects without touching the network; with an empty `allowedHosts`, every request rejects. Use it instead of the global `fetch`.

### `useHostTheme(): HostTheme`

The theme the host resolved for the disguise: the colours for the current light or dark scheme (including the disguise's accent), the elevation tokens, the scheme and whether the Archivo font is loaded. It is the same value `useTheme()` returns inside `@inlay/ui` components.

### `useBottomInset(): number`

The height of the system area along the screen's bottom edge: the home indicator on iOS, the navigation bar on Android, 0 where there is none. The host draws the disguise down to that edge, so the disguise decides what sits behind it:

- a bar at the bottom (tabs, a button bar) adds the inset as padding under its content, so its colour reaches the edge; `TabBar` takes it as `bottomInset`;
- other content at the bottom (a button on the ground, a toast) keeps at least this far from the edge.

```tsx
const bottomInset = useBottomInset();
return <TabBar tabs={tabs} value={tab} onChange={setTab} bottomInset={bottomInset} />;
```

## UI kit

The SDK re-exports `@inlay/ui`, so `@inlay/disguise-sdk` alone gives you the design tokens (`spacing`, `layout`, `radii`, `motion`, `textStyle` and the rest), `useTheme()` and the base components: `Button` (with `onHold`), `TextField`, `NumberField`, `Slider`, `Toggle`, `Chip`/`ChipRow`, `ListGroup`/`ListRow`, `Sheet`, `Toast`, `TabBar`, `EmptyState`, `ProgressBar`, `ScreenHeader`, `FileRow` and `ActionCard`. Build from these and the theme colours rather than hard-coded values, so a disguise matches the rest of the app in light and dark.

## Imports and the allowlist

A disguise may import only:

- `react` and `react-native`;
- `@inlay/disguise-sdk` and `@inlay/ui`;
- the packages listed in [`packages/disguise-sdk/allowlist.json`](../packages/disguise-sdk/allowlist.json) (subpaths included);
- relative paths that stay inside its own package.

The same rule applies to the `dependencies`, `peerDependencies` and `optionalDependencies` in its `package.json`. `devDependencies` and files under `__tests__/` are build tooling that never ships, so tests may use `@inlay/testkit` and `@testing-library/react-native`; no shipped file may import from `__tests__/`. ESLint flags a violation as you type, and `pnpm check-imports` enforces it in CI.

`allowlist.json` is a list of `{ "name", "reason" }` entries. The list is short on purpose: every package on it ships in the app for every user, so each one costs download size and adds code to review.

### Requesting an addition

Open an issue before you build on a package that is not on the list. Include:

- the package name and version, and what your disguise needs it for;
- why `react-native`, the UI kit or an existing allowlist package cannot do it;
- its install size, whether it adds native code, and its licence;
- what it can reach: network, files, contacts, location and similar.

Maintainers decide. An approved addition lands as its own pull request that changes only `allowlist.json`, before the disguise that uses it. Prefer packages that are small, maintained, MIT/Apache/BSD licensed and supported by Expo, and expect a no for anything that duplicates an existing entry or needs broad device access.

## Versions

`SDK_VERSION` is the version of the `@inlay/disguise-sdk` build, from its `package.json`. A manifest's `minSdk` names the lowest SDK version the disguise needs. The host runs a disguise only when `satisfiesMinSdk(manifest)` is true: `SDK_VERSION` is at least `minSdk`, compared as `major.minor.patch`. A `minSdk` that is not plain `x.y.z` is never satisfied.

Set `minSdk` to the SDK version you develop against, and raise it when you start using something a later SDK added.

## Testing with `@inlay/testkit`

`@inlay/testkit` runs a disguise without the app:

- `renderDisguise(manifest, options?)` renders the disguise under `MockHost` with React Native Testing Library and resolves to the mock host plus the render queries. It is async: `const { host } = await renderDisguise(manifest)`.
- `host.submittedCodes` lists every value passed to `submit`, oldest first. `host.reset()` runs every `onReset` handler, as the app does. `host.storage` is in-memory and inspectable; `host.fetchCalls` lists the requests the fetch stub let through.
- `createMockHost(options)` and `MockHost` are the same pieces without the test renderer; the playground uses them.

A test suite needs `@inlay/testkit`, `@testing-library/react-native`, `jest`, `jest-expo` and `react-native-gesture-handler` as devDependencies, and `react-native-gesture-handler/jestSetup` in Jest `setupFiles`. `_template/package.json` has the full set. To drive a hold, use Gesture Handler's test controller with the button's `testID` plus `-hold`:

```tsx
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

const hold = createGestureController('template-apply-hold');
await act(() => hold.begin());
await act(() => hold.activate()); // the hold threshold is reached
await act(() => hold.end()); // the finger lifts
```

`disguises/_template/__tests__/template.test.tsx` is a complete example.
