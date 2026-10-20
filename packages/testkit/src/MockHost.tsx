import type { DisguiseManifest, Trigger } from '@inlay/disguise-sdk';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Stands in for the host's gatekeeper: records every submitted code. */
export interface MockHostRecorder extends Trigger {
  readonly submittedCodes: readonly string[];
  subscribe(listener: () => void): () => void;
}

export function createMockHost(): MockHostRecorder {
  let submittedCodes: readonly string[] = [];
  const listeners = new Set<() => void>();
  return {
    get submittedCodes() {
      return submittedCodes;
    },
    submit(code) {
      submittedCodes = [...submittedCodes, code];
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export interface MockHostProps {
  manifest: DisguiseManifest;
  host: MockHostRecorder;
}

/** Renders a disguise's root under a debug banner showing the last submitted code. */
export function MockHost({ manifest, host }: MockHostProps) {
  const codes = useSyncExternalStore(host.subscribe, () => host.submittedCodes);
  const Root = manifest.root;
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Last code: {codes.at(-1) ?? '(none)'}</Text>
      </View>
      <View style={styles.container}>
        <Root />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#222' },
  bannerText: { color: '#fff', fontFamily: 'monospace', fontSize: 12 },
});
