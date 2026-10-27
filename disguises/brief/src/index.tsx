import {
  spacing,
  Toast,
  useBottomInset,
  useLifecycle,
  type DisguiseManifest,
} from '@inlay/disguise-sdk';
import { useEffect, type ComponentType } from 'react';
import { View } from 'react-native';

import packageJson from '../package.json';
import { allowedHosts } from './feeds/defaults';
import { Feed } from './screens/Feed';
import { isTab, Tabs } from './screens/parts';
import { Saved } from './screens/Saved';
import { Settings } from './screens/Settings';
import { Sources } from './screens/Sources';
import { StoreProvider, useStore, type Screen } from './state/store';
import { strings } from './strings';

const screens: Record<Screen, ComponentType> = {
  feed: Feed,
  saved: Saved,
  settings: Settings,
  sources: Sources,
};

/** Space between the toast and the bottom of the screen: clear of the tab bar. */
const TOAST_BOTTOM = 96;

function Screens() {
  const { state, go, reset, dismissToast } = useStore();
  const lifecycle = useLifecycle();
  useEffect(() => lifecycle.onReset(reset), [lifecycle, reset]);
  const bottomInset = useBottomInset();

  const Current = screens[state.screen];
  return (
    <View style={{ flex: 1 }}>
      <View key={state.epoch} style={{ flex: 1 }}>
        <Current />
      </View>
      {isTab(state.screen) ? (
        <Tabs value={state.screen} onChange={go} bottomInset={bottomInset} />
      ) : null}
      <View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          left: spacing[16],
          right: spacing[16],
          bottom: TOAST_BOTTOM + bottomInset,
        }}
      >
        <Toast
          message={state.toast ?? ''}
          visible={state.toast !== null}
          onDismiss={dismissToast}
          testID="brief-toast"
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
  id: 'brief',
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
  triggerDescription: 'Type your code in Search, then hold the Brief title',
  allowedHosts,
  tier: 'pro',
};

export default manifest;
