import {
  controls,
  TabBar,
  useBottomInset,
  type DisguiseManifest,
  type TabBarTab,
} from '@inlay/disguise-sdk';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import packageJson from '../package.json';
import { Clock } from './screens/Clock';
import { ClockGlyph, SettingsGlyph, ThemesGlyph } from './screens/glyphs';
import { Settings } from './screens/Settings';
import { Themes } from './screens/Themes';
import { StoreProvider, useStore, type Screen } from './state/store';
import { strings } from './strings';

const screens: Record<Screen, ComponentType> = {
  clock: Clock,
  themes: Themes,
  settings: Settings,
};

const tabs: readonly TabBarTab<Screen>[] = [
  {
    key: 'clock',
    label: strings.tabs.clock,
    icon: (color) => <ClockGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'themes',
    label: strings.tabs.themes,
    icon: (color) => <ThemesGlyph size={controls.icon} color={color} />,
  },
  {
    key: 'settings',
    label: strings.tabs.settings,
    icon: (color) => <SettingsGlyph size={controls.icon} color={color} />,
  },
];

function Screens() {
  const { screen, go } = useStore();
  const bottomInset = useBottomInset();
  const Current = screens[screen];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Current />
      </View>
      <TabBar
        tabs={tabs}
        value={screen}
        onChange={go}
        bottomInset={bottomInset}
        testID="dial-tabs"
      />
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
  id: 'dial',
  name: strings.appName,
  version: packageJson.version,
  // The SDK version this was built against (packages/disguise-sdk/package.json).
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
  triggerDescription: 'Tap the centre, turn the hands to your code, then hold the centre.',
  allowedHosts: [],
  tier: 'pro',
};

export default manifest;
