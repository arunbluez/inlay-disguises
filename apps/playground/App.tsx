import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import template from '@inlay/disguise-template';
import { createMockHost, MockHost } from '@inlay/testkit';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const host = createMockHost();

export default function App() {
  // The font files ship inside the build; the keys are the family names `@inlay/ui` uses.
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_800ExtraBold,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <MockHost manifest={template} host={host} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
