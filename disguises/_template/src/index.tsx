import type { DisguiseManifest } from '@inlay/disguise-sdk';
import { StyleSheet, Text, View } from 'react-native';

function Root() {
  return (
    <View style={styles.container}>
      <Text>Hello disguise</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const manifest: DisguiseManifest = {
  id: 'template',
  name: 'Template',
  version: '0.0.0',
  minSdk: '0.0.0',
  icon: './assets/icon.png',
  root: Root,
  triggerDescription: 'Describe, in one sentence, how a code is entered.',
  allowedHosts: [],
  tier: 'pro',
};

export default manifest;
