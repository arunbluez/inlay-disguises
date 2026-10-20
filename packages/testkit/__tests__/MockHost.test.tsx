import type { DisguiseManifest } from '@inlay/disguise-sdk';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createMockHost, MockHost } from '../src';

const manifest: DisguiseManifest = {
  id: 'test',
  name: 'Test',
  version: '0.0.0',
  minSdk: '0.0.0',
  icon: './assets/icon.png',
  root: () => <Text>Test root</Text>,
  triggerDescription: 'Type a code.',
  allowedHosts: [],
  tier: 'free',
};

describe('MockHost', () => {
  it('renders the disguise root and records each submitted code in the debug banner', async () => {
    const host = createMockHost();
    await render(<MockHost manifest={manifest} host={host} />);

    expect(screen.getByText('Test root')).toBeOnTheScreen();
    expect(screen.getByText('Last code: (none)')).toBeOnTheScreen();

    await act(async () => {
      host.submit('2468');
      host.submit('1357');
    });

    expect(host.submittedCodes).toEqual(['2468', '1357']);
    expect(screen.getByText('Last code: 1357')).toBeOnTheScreen();
  });
});
