import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createLifecycle,
  DisguiseHostProvider,
  elevation,
  themes,
  useDisguiseFetch,
  useDisguiseStorage,
  useHostTheme,
  useLifecycle,
  useTrigger,
  type DisguiseHostValue,
  type HostLifecycle,
  type HostTheme,
  type Trigger,
} from '../src';

interface TestHost extends DisguiseHostValue {
  submitted: string[];
  store: Map<string, string>;
  lifecycle: HostLifecycle;
}

function createHostValue(): TestHost {
  const submitted: string[] = [];
  const store = new Map<string, string>();
  const theme: HostTheme = {
    id: 'compress',
    scheme: 'light',
    colors: themes.compress.light,
    elevation,
    archivo: true,
  };
  return {
    submitted,
    store,
    trigger: {
      submit(code) {
        submitted.push(code);
      },
    },
    storage: {
      getString: (key) => store.get(key),
      set: (key, value) => {
        store.set(key, value);
      },
      delete: (key) => {
        store.delete(key);
      },
    },
    fetch: (input) => Promise.reject(new TypeError(`Request to ${input} is not permitted`)),
    theme,
    lifecycle: createLifecycle(),
  };
}

function wrapperFor(value: DisguiseHostValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DisguiseHostProvider value={value}>{children}</DisguiseHostProvider>;
  };
}

describe('hooks outside DisguiseHostProvider', () => {
  it.each([
    ['useTrigger', useTrigger],
    ['useDisguiseStorage', useDisguiseStorage],
    ['useDisguiseFetch', useDisguiseFetch],
    ['useHostTheme', useHostTheme],
    ['useLifecycle', useLifecycle],
  ] as const)('%s throws one neutral error', async (name, hook) => {
    await expect(renderHook(() => hook())).rejects.toThrow(
      `${name} must be used inside DisguiseHostProvider`,
    );
  });
});

describe('hooks inside DisguiseHostProvider', () => {
  it('each hook returns the value the host provided', async () => {
    const value = createHostValue();
    const { result } = await renderHook(
      () => ({
        trigger: useTrigger(),
        storage: useDisguiseStorage(),
        fetch: useDisguiseFetch(),
        theme: useHostTheme(),
        lifecycle: useLifecycle(),
      }),
      { wrapper: wrapperFor(value) },
    );

    expect(result.current.trigger).toBe(value.trigger);
    expect(result.current.storage).toBe(value.storage);
    expect(result.current.fetch).toBe(value.fetch);
    expect(result.current.theme).toBe(value.theme);
    expect(result.current.lifecycle).toBe(value.lifecycle);
  });

  it('submit hands the code to the host and returns nothing', async () => {
    const value = createHostValue();
    const { result } = await renderHook(() => useTrigger(), { wrapper: wrapperFor(value) });

    // Compile-time: `submit` cannot report a result.
    const submitReturnsVoid: ReturnType<Trigger['submit']> extends void ? true : false = true;
    expect(submitReturnsVoid).toBe(true);

    expect(result.current.submit('2468')).toBeUndefined();
    expect(value.submitted).toEqual(['2468']);
  });

  it('storage reads and writes through the host', async () => {
    const value = createHostValue();
    const { result } = await renderHook(() => useDisguiseStorage(), {
      wrapper: wrapperFor(value),
    });

    expect(result.current.getString('quality')).toBeUndefined();
    result.current.set('quality', '80');
    expect(result.current.getString('quality')).toBe('80');
    expect(value.store.get('quality')).toBe('80');
    result.current.delete('quality');
    expect(result.current.getString('quality')).toBeUndefined();
  });

  it('fetch is the host-provided guard', async () => {
    const value = createHostValue();
    const { result } = await renderHook(() => useDisguiseFetch(), { wrapper: wrapperFor(value) });

    await expect(result.current('https://example.com/')).rejects.toThrow(TypeError);
  });

  it('theme is the @inlay/ui theme with the disguise accent', async () => {
    const value = createHostValue();
    const { result } = await renderHook(() => useHostTheme(), { wrapper: wrapperFor(value) });

    expect(result.current.scheme).toBe('light');
    expect(result.current.colors.accent).toBe(themes.compress.light.accent);
  });
});

describe('createLifecycle', () => {
  it('reset runs every registered handler; an unregistered handler is not called', async () => {
    const value = createHostValue();
    const { lifecycle } = value;
    const { result } = await renderHook(() => useLifecycle(), { wrapper: wrapperFor(value) });
    const calls: string[] = [];

    const unregisterA = result.current.onReset(() => calls.push('a'));
    result.current.onReset(() => calls.push('b'));
    lifecycle.reset();
    expect(calls).toEqual(['a', 'b']);

    unregisterA();
    lifecycle.reset();
    expect(calls).toEqual(['a', 'b', 'b']);
  });

  it('a throwing handler does not stop the others; the first error is rethrown', () => {
    const lifecycle = createLifecycle();
    const calls: string[] = [];
    lifecycle.onReset(() => {
      throw new Error('first');
    });
    lifecycle.onReset(() => {
      throw new Error('second');
    });
    lifecycle.onReset(() => calls.push('cleared'));

    expect(() => lifecycle.reset()).toThrow('first');
    expect(calls).toEqual(['cleared']);
  });
});
