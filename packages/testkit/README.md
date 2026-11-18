# @inlay-app/testkit

Runs a disguise without the app that hosts it.

- `renderDisguise(manifest, options?)` renders a disguise under `MockHost` with React Native Testing Library and resolves to the mock host plus the render queries.
- `host.submittedCodes`, `host.reset()`, `host.storage` and `host.fetchCalls` let a test assert what the disguise did.
- `createMockHost(options)` and `MockHost` are the same pieces without the test renderer, for a playground app.

```tsx
import { renderDisguise } from '@inlay-app/testkit';

const { host } = await renderDisguise(manifest);
```

Peer dependencies: `react`, `react-native`, `react-native-gesture-handler`, and `@testing-library/react-native` for `renderDisguise`.

Docs: [SDK reference › Testing](https://github.com/arunbluez/inlay-disguises/blob/main/docs/sdk-reference.md#testing-with-inlaytestkit)

Apache-2.0.
