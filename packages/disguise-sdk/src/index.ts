// The disguise SDK contract. Types only for now: the host implements these hooks
// (and the SDK exports them) in E02.
import type { ComponentType } from 'react';

export type DisguiseTier = 'free' | 'pro';

/** What a disguise package exports as its default export. */
export interface DisguiseManifest {
  /** Stable, unique id (kebab-case). */
  id: string;
  /** Name shown in the host app. */
  name: string;
  /** The disguise package's semver version. */
  version: string;
  /** Lowest `@inlay/disguise-sdk` version the disguise runs on. */
  minSdk: string;
  /** Path to the 1024x1024 launcher icon PNG, relative to the disguise package root. */
  icon: string;
  /** The disguise's root screen. */
  root: ComponentType;
  /** One sentence, shown in onboarding, describing how a code is entered. */
  triggerDescription: string;
  /** Network domains the disguise may call; empty when it needs no network. */
  allowedHosts: readonly string[];
  tier: DisguiseTier;
}

export interface Trigger {
  /** Hands a code to the host. Fire and forget: it never reports a result. */
  submit(code: string): void;
}

/** Key-value storage namespaced to the disguise. */
export interface DisguiseStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

/** `fetch`, limited to the manifest's `allowedHosts`; rejects for any other host. */
export type DisguiseFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface HostTheme {
  scheme: 'light' | 'dark';
  /** The disguise's accent colour. */
  accent: string;
}

export interface Lifecycle {
  /**
   * Registers a handler the host calls to return the disguise to its home state
   * (after a code is accepted and on every lock). Returns an unregister function.
   */
  onReset(handler: () => void): () => void;
}

export type UseTrigger = () => Trigger;
export type UseDisguiseStorage = () => DisguiseStorage;
export type UseDisguiseFetch = () => DisguiseFetch;
export type UseHostTheme = () => HostTheme;
export type UseLifecycle = () => Lifecycle;
