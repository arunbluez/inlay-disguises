# @inlay/disguise-sdk

Everything a disguise uses to talk to the app that runs it: the `DisguiseManifest` type, six hooks (`useTrigger`, `useLifecycle`, `useDisguiseStorage`, `useDisguiseFetch`, `useHostTheme`, `useBottomInset`), the host provider, `satisfiesMinSdk` and the import allowlist (`allowlist.json`). It re-exports [`@inlay/ui`](https://www.npmjs.com/package/@inlay/ui), so a disguise can depend on this package alone.

```ts
import {
  Button,
  NumberField,
  useLifecycle,
  useTrigger,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
```

The source is TypeScript and ships as is; Metro and Jest (`jest-expo`) compile it. Peer dependencies: `react` and `react-native`.

Docs: [SDK reference](https://github.com/arunbluez/inlay-disguises/blob/main/docs/sdk-reference.md) · [Getting started](https://github.com/arunbluez/inlay-disguises/blob/main/docs/getting-started.md) · [Trigger design](https://github.com/arunbluez/inlay-disguises/blob/main/docs/trigger-design.md)

Apache-2.0.
