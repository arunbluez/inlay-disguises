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

// Placeholder: every icon slot points at the one sample PNG. Replace each with its own artwork.
const icon = require('../assets/icon.png');

const manifest: DisguiseManifest = {
  id: 'template',
  name: 'Template',
  version: '0.0.0',
  minSdk: '0.0.0',
  icon: {
    ios: { light: icon, dark: icon, tinted: icon },
    android: { foreground: icon, background: icon, monochrome: icon },
  },
  root: Root,
  triggerDescription: 'Describe, in one sentence, how a code is entered.',
  allowedHosts: [],
  tier: 'pro',
};

export default manifest;
