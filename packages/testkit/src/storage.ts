import type { DisguiseStorage } from '@inlay/disguise-sdk';

/** In-memory `DisguiseStorage` a test can inspect and empty. Nothing touches disk. */
export interface MockStorage extends DisguiseStorage {
  /** A copy of every stored key and value. */
  readonly entries: ReadonlyMap<string, string>;
  /** Removes every key. */
  clear(): void;
}

export function createMockStorage(): MockStorage {
  const store = new Map<string, string>();
  return {
    get entries() {
      return new Map(store);
    },
    getString: (key) => store.get(key),
    set(key, value) {
      store.set(key, value);
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}
