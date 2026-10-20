import { spacing, Toast, useLifecycle, type DisguiseManifest } from '@inlay/disguise-sdk';
import { useEffect, type ComponentType } from 'react';
import { View } from 'react-native';

import packageJson from '../package.json';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { isTab, Tabs } from './screens/parts';
import { Progress } from './screens/Progress';
import { Result } from './screens/Result';
import { Settings } from './screens/Settings';
import { Setup } from './screens/Setup';
import { StoreProvider, useStore, type Screen } from './state/store';
import { strings } from './strings';

const screens: Record<Screen, ComponentType> = {
  home: Home,
  setup: Setup,
  progress: Progress,
  result: Result,
  history: History,
  settings: Settings,
};

/**
 * Space between the toast and the bottom of the screen (the UI Source's 96): clear of the tab bar
 * and the Compress button, and on Result above Save to Photos and Share.
 */
function toastBottom(screen: Screen): number {
  return screen === 'result' ? 148 : 96;
}

function Screens() {
  const { state, go, reset, dismissToast } = useStore();
  const lifecycle = useLifecycle();
  useEffect(() => lifecycle.onReset(reset), [lifecycle, reset]);

  const Current = screens[state.screen];
  return (
    <View style={{ flex: 1 }}>
      <Current />
      {isTab(state.screen) ? <Tabs value={state.screen} onChange={go} /> : null}
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: spacing[16],
          right: spacing[16],
          bottom: toastBottom(state.screen),
        }}
      >
        <Toast
          message={state.toast ?? ''}
          visible={state.toast !== null}
          onDismiss={dismissToast}
          testID="compress-toast"
        />
      </View>
    </View>
  );
}

function Root() {
  return (
    <StoreProvider>
      <Screens />
    </StoreProvider>
  );
}

const manifest: DisguiseManifest = {
  id: 'compress',
  name: strings.appName,
  version: packageJson.version,
  minSdk: '0.0.0',
  icon: {
    ios: {
      light: require('../assets/icon/ios-light.png'),
      dark: require('../assets/icon/ios-dark.png'),
      tinted: require('../assets/icon/ios-tinted.png'),
    },
    android: {
      foreground: require('../assets/icon/android-foreground.png'),
      background: require('../assets/icon/android-background.png'),
      monochrome: require('../assets/icon/android-monochrome.png'),
    },
  },
  root: Root,
  triggerDescription: 'Type your code as the target size, then hold Compress',
  allowedHosts: [],
  tier: 'free',
};

export default manifest;
