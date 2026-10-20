import {
  Button,
  themes,
  useDisguiseFetch,
  useDisguiseStorage,
  useHostTheme,
  useLifecycle,
  useTheme,
  useTrigger,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { createMockHost, MockHost, renderDisguise, themeIdFor } from '../src';

/** A small disguise using every hook: a code field it submits and clears on reset. */
function Root() {
  const trigger = useTrigger();
  const lifecycle = useLifecycle();
  const hostTheme = useHostTheme();
  const theme = useTheme();
  const [code, setCode] = useState('');
  useEffect(() => lifecycle.onReset(() => setCode('')), [lifecycle]);
  return (
    <>
      <Text>Test root</Text>
      <Text testID="field">{code}</Text>
      <Text testID="accent">{hostTheme.colors.accent}</Text>
      <Text testID="ui-accent">{theme.colors.accent}</Text>
      <Button label="Type 2468" onPress={() => setCode('2468')} />
      <Button
        label="Go"
        onPress={() => trigger.submit(code)}
        onHold={() => trigger.submit(code)}
        testID="go"
      />
    </>
  );
}

function manifestWith(overrides: Partial<DisguiseManifest> = {}): DisguiseManifest {
  return {
    id: 'test',
    name: 'Test',
    version: '0.0.0',
    minSdk: '0.0.0',
    icon: {
      ios: { light: 1, dark: 1, tinted: 1 },
      android: { foreground: 1, background: 1, monochrome: 1 },
    },
    root: Root,
    triggerDescription: 'Type a code.',
    allowedHosts: [],
    tier: 'free',
    ...overrides,
  };
}

describe('createMockHost: trigger', () => {
  it('records each submitted code in order, notifies subscribers, and returns nothing', () => {
    const host = createMockHost();
    const notified: string[][] = [];
    const unsubscribe = host.subscribe(() => notified.push([...host.submittedCodes]));

    expect(host.trigger.submit('2468')).toBeUndefined();
    host.trigger.submit('1357');
    unsubscribe();
    host.trigger.submit('9999');

    expect(host.submittedCodes).toEqual(['2468', '1357', '9999']);
    expect(notified).toEqual([['2468'], ['2468', '1357']]);
  });
});

describe('createMockHost: storage', () => {
  it('round-trips a value, is inspectable, and clear() empties it', () => {
    const { storage } = createMockHost();

    expect(storage.getString('quality')).toBeUndefined();
    storage.set('quality', '80');
    storage.set('format', 'jpeg');
    expect(storage.getString('quality')).toBe('80');
    expect([...storage.entries]).toEqual([
      ['quality', '80'],
      ['format', 'jpeg'],
    ]);

    storage.delete('quality');
    expect(storage.getString('quality')).toBeUndefined();
    storage.delete('never-set');

    storage.clear();
    expect(storage.entries.size).toBe(0);
  });

  it('entries is a copy: changing it does not change the store', () => {
    const { storage } = createMockHost();
    storage.set('a', '1');
    (storage.entries as Map<string, string>).set('b', '2');
    expect(storage.getString('b')).toBeUndefined();
  });
});

describe('createMockHost: fetch', () => {
  it('rejects a host outside allowedHosts without recording it', async () => {
    const host = createMockHost({ allowedHosts: ['api.example.com'] });

    await expect(host.fetch('https://other.example.com/data')).rejects.toThrow(TypeError);
    await expect(host.fetch('https://api.example.com.evil.test/')).rejects.toThrow(TypeError);
    await expect(host.fetch('/relative/path')).rejects.toThrow(TypeError);
    expect(host.fetchCalls).toEqual([]);
  });

  it('rejects every request when allowedHosts is empty (the default)', async () => {
    const host = createMockHost();
    await expect(host.fetch('https://api.example.com/')).rejects.toThrow(
      'Request to https://api.example.com/ rejected: its host is not in allowedHosts',
    );
  });

  it('records a permitted request and answers it without the network', async () => {
    const respond = jest.fn(() => new Response('{"ok":true}', { status: 201 }));
    const host = createMockHost({ allowedHosts: ['api.example.com'], respond });

    const response = await host.fetch('https://user@API.example.com:8443/v1?q=1', {
      method: 'POST',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(respond).toHaveBeenCalledWith('https://user@API.example.com:8443/v1?q=1', {
      method: 'POST',
    });
    expect(host.fetchCalls).toEqual([
      { url: 'https://user@API.example.com:8443/v1?q=1', init: { method: 'POST' } },
    ]);
  });

  it('answers a permitted request with an empty 200 by default', async () => {
    const host = createMockHost({ allowedHosts: ['api.example.com'] });
    const response = await host.fetch('https://api.example.com/');
    expect(response.status).toBe(200);
    expect(host.fetchCalls).toEqual([{ url: 'https://api.example.com/' }]);
  });
});

describe('createMockHost: reset', () => {
  it('runs every registered onReset handler; an unregistered handler is not called', () => {
    const host = createMockHost();
    const calls: string[] = [];
    const unregisterA = host.lifecycle.onReset(() => calls.push('a'));
    host.lifecycle.onReset(() => calls.push('b'));

    host.reset();
    expect(calls).toEqual(['a', 'b']);

    unregisterA();
    host.reset();
    expect(calls).toEqual(['a', 'b', 'b']);
  });
});

describe('createMockHost: theme', () => {
  it('resolves the requested built-in theme and scheme', () => {
    expect(createMockHost().theme).toMatchObject({ id: 'compress', scheme: 'light' });
    const dark = createMockHost({ theme: 'sudoku', scheme: 'dark' }).theme;
    expect(dark).toMatchObject({ id: 'sudoku', scheme: 'dark', elevation: null });
    expect(dark.colors).toEqual(themes.sudoku.dark);
  });

  it('themeIdFor picks the theme named by the manifest id, else compress', () => {
    expect(themeIdFor({ id: 'brief' })).toBe('brief');
    expect(themeIdFor({ id: 'template' })).toBe('compress');
    expect(themeIdFor({ id: 'toString' })).toBe('compress');
  });
});

describe('MockHost', () => {
  it('renders the root under the banner and shows the last submitted code', async () => {
    const host = createMockHost();
    await render(<MockHost manifest={manifestWith()} host={host} />);

    expect(screen.getByText('Test root')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent('Last code: (none)');
    expect(screen.queryByTestId('mock-host-exit')).not.toBeOnTheScreen();

    await act(async () => {
      host.trigger.submit('2468');
      host.trigger.submit('1357');
    });

    expect(host.submittedCodes).toEqual(['2468', '1357']);
    expect(screen.getByTestId('mock-host-banner')).toHaveTextContent('Last code: 1357');
  });

  it('the Reset control runs the onReset handlers the disguise registered', async () => {
    const host = createMockHost();
    await render(<MockHost manifest={manifestWith()} host={host} />);

    await fireEvent.press(screen.getByText('Type 2468'));
    expect(screen.getByTestId('field')).toHaveTextContent('2468');

    await fireEvent.press(screen.getByTestId('mock-host-reset'));
    expect(screen.getByTestId('field')).toHaveTextContent('');
  });

  it('shows a Back control when onExit is given', async () => {
    const onExit = jest.fn();
    await render(<MockHost manifest={manifestWith()} host={createMockHost()} onExit={onExit} />);

    await fireEvent.press(screen.getByTestId('mock-host-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('useHostTheme and @inlay/ui components see the same theme', async () => {
    const host = createMockHost({ theme: 'brief', scheme: 'dark' });
    await render(<MockHost manifest={manifestWith()} host={host} />);

    expect(screen.getByTestId('accent')).toHaveTextContent(themes.brief.dark.accent);
    expect(screen.getByTestId('ui-accent')).toHaveTextContent(themes.brief.dark.accent);
  });
});

describe('renderDisguise', () => {
  it('returns the host with the queries; a tap submits the field value', async () => {
    const { host, getByText, getByTestId } = await renderDisguise(manifestWith());

    await fireEvent.press(getByText('Type 2468'));
    await fireEvent.press(getByTestId('go'));

    expect(host.submittedCodes).toEqual(['2468']);
    expect(getByTestId('mock-host-banner')).toHaveTextContent('Last code: 2468');
  });

  it('a hold on a hold Button submits inside the host (GestureHandlerRootView is in place)', async () => {
    const { host, getByText } = await renderDisguise(manifestWith());
    await fireEvent.press(getByText('Type 2468'));

    const hold = createGestureController('go-hold');
    await act(() => hold.begin());
    await act(() => hold.activate());
    await act(() => hold.end());

    expect(host.submittedCodes).toEqual(['2468']);
  });

  it('takes allowedHosts and the theme from the manifest, and options override them', async () => {
    const { host } = await renderDisguise(
      manifestWith({ id: 'sudoku', allowedHosts: ['api.example.com'] }),
    );
    expect(host.theme.id).toBe('sudoku');
    await expect(host.fetch('https://api.example.com/')).resolves.toBeDefined();
    await expect(host.fetch('https://example.org/')).rejects.toThrow(TypeError);

    const { host: overridden } = await renderDisguise(manifestWith({ id: 'sudoku' }), {
      theme: 'brief',
    });
    expect(overridden.theme.id).toBe('brief');
  });

  it('uses the same storage the disguise reads through useDisguiseStorage', async () => {
    function StorageRoot() {
      const storage = useDisguiseStorage();
      const fetch = useDisguiseFetch();
      return (
        <>
          <Text testID="stored">{storage.getString('history') ?? 'empty'}</Text>
          <Button label="Save" onPress={() => storage.set('history', '3')} />
          <Button label="Fetch" onPress={() => void fetch('https://x.test/').catch(() => {})} />
        </>
      );
    }
    const { host, getByText } = await renderDisguise(manifestWith({ root: StorageRoot }));

    await fireEvent.press(getByText('Save'));
    await fireEvent.press(getByText('Fetch'));

    expect(host.storage.getString('history')).toBe('3');
    expect(host.fetchCalls).toEqual([]);
  });
});
