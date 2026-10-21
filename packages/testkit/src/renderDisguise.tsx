// `@testing-library/react-native` is an optional peer dependency, not a dependency: the test
// suite that calls `renderDisguise` must share one copy with it (for `screen`, `act` and the
// matchers), so it comes from that suite's own devDependencies. The playground never loads this
// file; it imports `@inlay/testkit/MockHost`.
import type { DisguiseManifest } from '@inlay/disguise-sdk';
import { render } from '@testing-library/react-native';

import { createMockHost, MockHost, themeIdFor, type MockHostOptions } from './MockHost';

/**
 * Renders a disguise under `MockHost` and returns the host with the render queries. The host
 * takes the manifest's `allowedHosts` and the theme named by its `id` unless `options` says
 * otherwise. Suites that render a hold `Button` add `react-native-gesture-handler/jestSetup` to
 * Jest `setupFiles`.
 */
export async function renderDisguise(manifest: DisguiseManifest, options: MockHostOptions = {}) {
  const host = createMockHost({
    allowedHosts: manifest.allowedHosts,
    theme: themeIdFor(manifest),
    ...options,
  });
  const queries = await render(<MockHost manifest={manifest} host={host} />);
  return { host, ...queries };
}
