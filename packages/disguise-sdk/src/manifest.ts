import type { ComponentType } from 'react';
import type { ImageRequireSource } from 'react-native';

/** Whether a disguise ships free or needs a subscription. */
export type DisguiseTier = 'free' | 'pro';

/** A launcher-icon image: the module a bundled PNG `require('./icon.png')` returns. */
export type IconAsset = ImageRequireSource;

/** The launcher-icon set the host app installs for a disguise. */
export interface DisguiseIcons {
  /** iOS app icon variants, each a 1024x1024 PNG. */
  ios: {
    /** Default appearance. */
    light: IconAsset;
    /** Dark appearance (transparent background). */
    dark: IconAsset;
    /** Tinted appearance (grayscale on transparent; the system applies the tint). */
    tinted: IconAsset;
  };
  /** Android adaptive icon layers, each a 1024x1024 PNG with the mark inside the safe zone. */
  android: {
    /** Foreground layer (the mark, on transparent). */
    foreground: IconAsset;
    /** Background layer. */
    background: IconAsset;
    /** Monochrome layer for themed icons (single colour on transparent). */
    monochrome: IconAsset;
  };
}

/** What a disguise package exports as its default export. */
export interface DisguiseManifest {
  /** Stable, unique id (kebab-case). The host keys the disguise's storage by it. */
  id: string;
  /** Name shown in the host app and under the launcher icon. */
  name: string;
  /** The disguise package's semver version. */
  version: string;
  /** Lowest `@inlay/disguise-sdk` version the disguise runs on (`x.y.z`); see `satisfiesMinSdk`. */
  minSdk: string;
  /** Launcher icons for iOS and Android. */
  icon: DisguiseIcons;
  /** The disguise's root screen. The host renders it inside `DisguiseHostProvider`. */
  root: ComponentType;
  /** One sentence, shown in onboarding, describing how a code is entered. */
  triggerDescription: string;
  /** Exact host names the disguise may fetch from; empty when it needs no network. */
  allowedHosts: readonly string[];
  /** Whether the disguise ships free or needs a subscription. */
  tier: DisguiseTier;
}
