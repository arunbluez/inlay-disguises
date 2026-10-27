import { useBottomInset, useLifecycle, type DisguiseManifest } from '@inlay/disguise-sdk';
import { useEffect, type ComponentType } from 'react';
import { View } from 'react-native';

import packageJson from '../package.json';
import { Board } from './screens/Board';
import { Completion } from './screens/Completion';
import { isTab, Tabs } from './screens/parts';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { Today } from './screens/Today';
import { StoreProvider, useStore, type Screen } from './state/store';
import { strings } from './strings';

const screens: Record<Screen, ComponentType> = {
  today: Today,
  board: Board,
  completion: Completion,
  stats: Stats,
  settings: Settings,
};

function Screens() {
  const { state, go, reset } = useStore();
  const lifecycle = useLifecycle();
  useEffect(() => lifecycle.onReset(reset), [lifecycle, reset]);
  const bottomInset = useBottomInset();

  const Current = screens[state.screen];
  return (
    <View style={{ flex: 1 }}>
      <Current />
      {isTab(state.screen) ? (
        <Tabs value={state.screen} onChange={go} bottomInset={bottomInset} />
      ) : null}
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
  id: 'sudoku',
  name: strings.appName,
  version: packageJson.version,
  // The SDK in this repo is still 0.0.0; a higher minSdk would keep every host from running it.
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
  triggerDescription: 'Type your code as the puzzle number, then hold Play',
  allowedHosts: [],
  tier: 'pro',
};

export default manifest;
