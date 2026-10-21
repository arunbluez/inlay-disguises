import {
  Button,
  createLifecycle,
  DisguiseHostProvider,
  elevation,
  spacing,
  strokes,
  tabularNums,
  textStyle,
  ThemeProvider,
  themes,
  useTheme,
  type BuiltInThemeId,
  type ColorScheme,
  type DisguiseHostValue,
  type DisguiseManifest,
  type HostLifecycle,
  type HostTheme,
} from '@inlay/disguise-sdk';
import { useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { createMockFetch, type FetchCall, type FetchResponder } from './fetch';
import { createMockStorage, type MockStorage } from './storage';

export interface MockHostOptions {
  /** Exact host names the fetch stub lets through; empty (the default) rejects every request. */
  allowedHosts?: readonly string[];
  /** Answers a permitted request (default: an empty 200 response). */
  respond?: FetchResponder;
  /** The built-in theme whose accent the disguise gets (default: `compress`). */
  theme?: BuiltInThemeId;
  /** Default: `light`. */
  scheme?: ColorScheme;
  /** The system area under the disguise, as `useBottomInset()` reports it (default: 0). */
  bottomInset?: number;
}

/** A complete stand-in for the host app: every `DisguiseHostValue` member, plus inspection. */
export interface MockHostValue extends DisguiseHostValue {
  /** Every code handed to `trigger.submit`, oldest first. */
  readonly submittedCodes: readonly string[];
  /** Calls `listener` after each submitted code; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Every request the fetch stub let through, in order. */
  readonly fetchCalls: readonly FetchCall[];
  storage: MockStorage;
  lifecycle: HostLifecycle;
  theme: HostTheme & { id: BuiltInThemeId };
  /** What the host does after it accepts a code and on lock: runs every `onReset` handler. */
  reset(): void;
}

/** The built-in theme named by the manifest `id`, else `compress`. */
export function themeIdFor(manifest: Pick<DisguiseManifest, 'id'>): BuiltInThemeId {
  return Object.hasOwn(themes, manifest.id) ? (manifest.id as BuiltInThemeId) : 'compress';
}

export function createMockHost({
  allowedHosts = [],
  respond,
  theme = 'compress',
  scheme = 'light',
  bottomInset = 0,
}: MockHostOptions = {}): MockHostValue {
  let submittedCodes: readonly string[] = [];
  const listeners = new Set<() => void>();
  const mockFetch = createMockFetch(allowedHosts, respond);
  const lifecycle = createLifecycle();
  return {
    get submittedCodes() {
      return submittedCodes;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    trigger: {
      submit(code) {
        submittedCodes = [...submittedCodes, code];
        listeners.forEach((listener) => listener());
      },
    },
    storage: createMockStorage(),
    fetch: mockFetch.fetch,
    fetchCalls: mockFetch.calls,
    // Resolved as `ThemeProvider` resolves it; `MockHost` renders one with these same values.
    theme: {
      id: theme,
      scheme,
      colors: themes[theme][scheme],
      elevation: scheme === 'light' ? elevation : null,
      archivo: true,
    },
    lifecycle,
    bottomInset,
    reset: () => lifecycle.reset(),
  };
}

export interface MockHostProps {
  manifest: DisguiseManifest;
  host: MockHostValue;
  /** Shows a Back control in the banner. */
  onExit?: () => void;
}

/**
 * Renders a disguise's root the way the host app does (inside `GestureHandlerRootView`,
 * `DisguiseHostProvider` and a `ThemeProvider` with the host's theme), under a debug banner with
 * the last submitted code and a Reset control.
 */
export function MockHost({ manifest, host, onExit }: MockHostProps) {
  const Root = manifest.root;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DisguiseHostProvider value={host}>
        <ThemeProvider
          theme={host.theme.id}
          scheme={host.theme.scheme}
          fontsLoaded={host.theme.archivo}
        >
          <Ground>
            <Banner host={host} onExit={onExit} />
            <View style={{ flex: 1 }}>
              <Root />
            </View>
          </Ground>
        </ThemeProvider>
      </DisguiseHostProvider>
    </GestureHandlerRootView>
  );
}

function Ground({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
}

function Banner({ host, onExit }: Pick<MockHostProps, 'host' | 'onExit'>) {
  const { colors, archivo } = useTheme();
  const codes = useSyncExternalStore(host.subscribe, () => host.submittedCodes);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[8],
        paddingHorizontal: spacing[12],
        backgroundColor: colors.surface,
        borderBottomWidth: strokes.hairline,
        borderBottomColor: colors.rule,
      }}
    >
      {onExit ? (
        <Button variant="text" label="Back" onPress={onExit} testID="mock-host-exit" />
      ) : null}
      <Text
        testID="mock-host-banner"
        numberOfLines={1}
        style={[
          textStyle('caption', 13, archivo),
          { flex: 1, color: colors.ink, fontVariant: [...tabularNums] },
        ]}
      >
        Last code: {codes.at(-1) ?? '(none)'}
      </Text>
      <Button variant="text" label="Reset" onPress={host.reset} testID="mock-host-reset" />
    </View>
  );
}
