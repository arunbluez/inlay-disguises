import packageJson from '../package.json';

import type { DisguiseManifest } from './manifest';

/** The version of this `@inlay/disguise-sdk` build, from its `package.json`. */
export const SDK_VERSION: string = packageJson.version;

function parseVersion(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Whether this SDK can run the disguise: `SDK_VERSION` is at least the manifest's `minSdk`.
 * A `minSdk` that is not a plain `x.y.z` version is never satisfied. Hosts render a disguise
 * only when this returns true.
 */
export function satisfiesMinSdk(manifest: Pick<DisguiseManifest, 'minSdk'>): boolean {
  const required = parseVersion(manifest.minSdk);
  const current = parseVersion(SDK_VERSION);
  if (!required || !current) return false;
  for (let i = 0; i < 3; i++) {
    if (current[i]! !== required[i]!) return current[i]! > required[i]!;
  }
  return true;
}
