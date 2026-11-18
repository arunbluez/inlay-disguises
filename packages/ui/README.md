# @inlay/ui

The shared UI kit for Inlay disguises: design tokens (spacing, type, radii, elevation, motion), light and dark grounds, the theme mechanism with each disguise's accent, and the base components (`Button` with its hold gesture, `TextField`, `NumberField`, `Slider`, `Toggle`, `Chip`, `ListRow`, `Sheet`, `Toast`, `TabBar`, `EmptyState`, `ProgressBar`, `ScreenHeader` and more).

A disguise normally imports these through [`@inlay/disguise-sdk`](https://www.npmjs.com/package/@inlay/disguise-sdk), which re-exports this package.

The source is TypeScript and ships as is; Metro and Jest (`jest-expo`) compile it. Peer dependencies: `react`, `react-native` and `react-native-gesture-handler`.

Docs: [SDK reference › UI kit](https://github.com/arunbluez/inlay-disguises/blob/main/docs/sdk-reference.md#ui-kit)

Apache-2.0.
