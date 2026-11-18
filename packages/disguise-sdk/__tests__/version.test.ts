import packageJson from '../package.json';
import { satisfiesMinSdk, SDK_VERSION } from '../src';

describe('SDK_VERSION', () => {
  it('is the package version', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });
});

describe('satisfiesMinSdk', () => {
  const [major, minor, patch] = SDK_VERSION.split('.').map(Number) as [number, number, number];

  it('accepts a minSdk equal to SDK_VERSION', () => {
    expect(satisfiesMinSdk({ minSdk: SDK_VERSION })).toBe(true);
  });

  it('accepts an older minSdk', () => {
    expect(satisfiesMinSdk({ minSdk: '0.0.0' })).toBe(true);
  });

  it.each([`${major + 1}.0.0`, `${major}.${minor + 1}.0`, `${major}.${minor}.${patch + 1}`])(
    'rejects a newer minSdk %s',
    (minSdk) => {
      expect(satisfiesMinSdk({ minSdk })).toBe(false);
    },
  );

  it.each(['', '1', '1.0', '^1.0.0', '1.0.0-beta.1', 'latest'])(
    'rejects a minSdk that is not x.y.z: %j',
    (minSdk) => {
      expect(satisfiesMinSdk({ minSdk })).toBe(false);
    },
  );
});
