import { useContext } from 'react';

import {
  DisguiseHostContext,
  type DisguiseFetch,
  type DisguiseHostValue,
  type DisguiseStorage,
  type HostTheme,
  type Lifecycle,
  type Trigger,
} from './context';

function useHostValue(hookName: string): DisguiseHostValue {
  const value = useContext(DisguiseHostContext);
  if (!value) throw new Error(`${hookName} must be used inside DisguiseHostProvider`);
  return value;
}

/** The host's code entry: `useTrigger().submit(code)`. It never reports a result. */
export function useTrigger(): Trigger {
  return useHostValue('useTrigger').trigger;
}

/** Key-value storage, namespaced to this disguise by the host. */
export function useDisguiseStorage(): DisguiseStorage {
  return useHostValue('useDisguiseStorage').storage;
}

/** `fetch`, limited by the host to the manifest's `allowedHosts`; rejects for any other host. */
export function useDisguiseFetch(): DisguiseFetch {
  return useHostValue('useDisguiseFetch').fetch;
}

/** The `@inlay/ui` theme (base tokens, scheme and this disguise's accent). */
export function useHostTheme(): HostTheme {
  return useHostValue('useHostTheme').theme;
}

/** `onReset` registration; register in an effect and return the unregister function from it. */
export function useLifecycle(): Lifecycle {
  return useHostValue('useLifecycle').lifecycle;
}
