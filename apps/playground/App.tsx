import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { ThemeProvider, useTheme, type DisguiseManifest } from '@inlay/disguise-sdk';
// The runtime-only entry: the package root also exports the Jest helper.
import { createMockHost, MockHost, themeIdFor, type MockHostValue } from '@inlay/testkit/MockHost';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DisguiseList } from './src/DisguiseList';
import { disguises } from './src/disguises';

interface Running {
  manifest: DisguiseManifest;
  host: MockHostValue;
}

export default function App() {
  // The font files ship inside the build; the keys are the family names `@inlay/ui` uses.
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
  });
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [running, setRunning] = useState<Running | null>(null);

  // Android back returns from a running disguise to the list.
  useEffect(() => {
    if (!running) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRunning(null);
      return true;
    });
    return () => subscription.remove();
  }, [running]);

  if (!fontsLoaded) return null;

  // Each run gets a fresh host: no codes, storage or handlers carry over between runs.
  const open = (manifest: DisguiseManifest) =>
    setRunning({
      manifest,
      host: createMockHost({
        allowedHosts: manifest.allowedHosts,
        theme: themeIdFor(manifest),
        scheme,
      }),
    });

  return (
    <SafeAreaProvider>
      <ThemeProvider theme="compress" scheme={scheme}>
        <Screen>
          {running ? (
            <MockHost
              manifest={running.manifest}
              host={running.host}
              onExit={() => setRunning(null)}
            />
          ) : (
            <DisguiseList disguises={disguises} onOpen={open} />
          )}
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>{children}</SafeAreaView>;
}
