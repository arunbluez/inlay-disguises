import type { Theme } from '@inlay/ui';
import { createContext, type ReactNode } from 'react';

/** Hands codes to the host. */
export interface Trigger {
  /**
   * Hands a code to the host. Fire and forget: it returns nothing, and no callback, promise or
   * event ever reports whether the code meant anything. The disguise carries on with its normal
   * behaviour either way.
   */
  submit(code: string): void;
}

/**
 * Key-value storage for the disguise's own settings and history. The host namespaces it by the
 * manifest `id`, so a disguise only ever sees its own keys and never needs to prefix them.
 */
export interface DisguiseStorage {
  /** The stored value, or `undefined` when the key is not set. */
  getString(key: string): string | undefined;
  /** Stores `value` under `key`, replacing any previous value. */
  set(key: string, value: string): void;
  /** Removes `key`; a no-op when it is not set. */
  delete(key: string): void;
}

/**
 * `fetch`, limited to the manifest's `allowedHosts`. The host enforces it: a request whose URL
 * host is not exactly one of `allowedHosts` rejects without touching the network. With an empty
 * `allowedHosts`, every request rejects.
 */
export type DisguiseFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The `@inlay/ui` theme the host resolved for the disguise: base tokens, scheme and accent. */
export type HostTheme = Theme;

/** Registration for the host's reset signal. */
export interface Lifecycle {
  /**
   * Registers a handler the host calls to return the disguise to its home state. The host calls
   * every handler after it accepts a code (before the disguise is shown again) and on every
   * lock. A handler must clear any code field and cancel pending actions (timers, queued work),
   * so nothing started before the reset runs after it. Returns a function that unregisters the
   * handler; call it on unmount.
   */
  onReset(handler: () => void): () => void;
}

/** Everything a host provides to a disguise through `DisguiseHostProvider`. */
export interface DisguiseHostValue {
  /** Read by `useTrigger()`. */
  trigger: Trigger;
  /** Read by `useDisguiseStorage()`. */
  storage: DisguiseStorage;
  /** Read by `useDisguiseFetch()`. */
  fetch: DisguiseFetch;
  /** Read by `useHostTheme()`. */
  theme: HostTheme;
  /** Read by `useLifecycle()`. */
  lifecycle: Lifecycle;
}

export const DisguiseHostContext = createContext<DisguiseHostValue | null>(null);

export interface DisguiseHostProviderProps {
  /** The host's implementation of every hook. Keep it referentially stable across renders. */
  value: DisguiseHostValue;
  children: ReactNode;
}

/** Supplies a host's `DisguiseHostValue` to the disguise rendered inside it. */
export function DisguiseHostProvider({ value, children }: DisguiseHostProviderProps) {
  return <DisguiseHostContext.Provider value={value}>{children}</DisguiseHostContext.Provider>;
}

/** A `Lifecycle` plus the host-side call that runs every registered handler. */
export interface HostLifecycle extends Lifecycle {
  /**
   * Calls every registered `onReset` handler once, in registration order. Every handler runs
   * even if one throws; the first error is rethrown afterwards.
   */
  reset(): void;
}

/**
 * Creates the `onReset` registry a host passes as `DisguiseHostValue.lifecycle` and triggers
 * with `reset()`. Registering the same function twice keeps one entry.
 */
export function createLifecycle(): HostLifecycle {
  const handlers = new Set<() => void>();
  return {
    onReset(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    reset() {
      let failure: { error: unknown } | undefined;
      for (const handler of [...handlers]) {
        try {
          handler();
        } catch (error) {
          failure ??= { error };
        }
      }
      if (failure) throw failure.error;
    },
  };
}
