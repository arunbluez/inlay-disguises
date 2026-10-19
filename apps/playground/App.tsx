import template from '@inlay/disguise-template';
import { createMockHost, MockHost } from '@inlay/testkit';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const host = createMockHost();

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <MockHost manifest={template} host={host} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
