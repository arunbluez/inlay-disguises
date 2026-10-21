// The disguise SDK: the manifest a disguise exports, the hooks it uses to talk to its host, and
// the provider and helpers a host uses to run it. Re-exports `@inlay/ui` so a disguise can depend
// on this package alone.
export * from '@inlay/ui';
export type { DisguiseIcons, DisguiseManifest, DisguiseTier, IconAsset } from './manifest';
export {
  createLifecycle,
  DisguiseHostProvider,
  type DisguiseFetch,
  type DisguiseHostProviderProps,
  type DisguiseHostValue,
  type DisguiseStorage,
  type HostLifecycle,
  type HostTheme,
  type Lifecycle,
  type Trigger,
} from './context';
export {
  useBottomInset,
  useDisguiseFetch,
  useDisguiseStorage,
  useHostTheme,
  useLifecycle,
  useTrigger,
} from './hooks';
export { satisfiesMinSdk, SDK_VERSION } from './version';
