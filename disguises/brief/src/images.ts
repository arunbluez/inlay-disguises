// Story images, held in memory only. The bytes come through the host's fetch (so `allowedHosts`
// applies to images too) and become a `data:` URI for React Native's `Image`; nothing is written
// to disguise storage or to any file, and `clear` drops every one.
import type { DisguiseFetch } from '@inlay/disguise-sdk';
import { useEffect, useSyncExternalStore } from 'react';

import { withDeadline } from './feeds/fetchFeeds';
import { IMAGE_WIDTH } from './feeds/parse';
import { httpsHost } from './feeds/url';

/** Larger images are skipped (bytes); their story shows as a text card. */
export const MAX_IMAGE_BYTES = 1_500_000;

/** Images kept at once; the one loaded first goes first. */
export const IMAGE_LIMIT = 24;

/** How long one image may take, in ms. */
const IMAGE_TIMEOUT_MS = 15_000;

/** `null`: the image failed or was skipped, so the story stays a text card. */
type Entry = string | null;

export interface Images {
  /** The loaded `data:` URI, `null` when it failed, `undefined` when not loaded (yet). */
  get(url: string): Entry | undefined;
  /** Loads `url` unless it is loaded or loading; resolves once it is in (or failed). */
  load(url: string): Promise<void>;
  /** Drops every image and ignores loads still in flight. */
  clear(): void;
  /** Calls `listener` whenever an image comes in, goes or is cleared; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/**
 * Larger renditions on the image hosts that name the size in the path, as `[pattern, swap]`:
 * BBC's `/ace/standard/240/` (the feeds only offer 240) and NPR's `/resize/2666x1777!/` (the
 * originals, mostly over `MAX_IMAGE_BYTES`) both serve any width.
 */
const RENDITIONS: readonly (readonly [RegExp, string])[] = [
  [/^(https:\/\/ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//i, `$1${IMAGE_WIDTH}/`],
  [/^(https:\/\/npr\.brightspotcdn\.com\/dims3\/.*?\/resize\/)[^/]+\//i, `$1${IMAGE_WIDTH}/`],
];

/** `url` at `IMAGE_WIDTH` when its host serves sizes by path; otherwise `url` as it is. */
export function rendition(url: string): string {
  for (const [pattern, swap] of RENDITIONS) {
    if (pattern.test(url)) return url.replace(pattern, swap);
  }
  return url;
}

/** Bytes to base64, in chunks small enough for `String.fromCharCode`. */
function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

function fetchImage(fetch: DisguiseFetch, url: string): Promise<Entry> {
  return withDeadline(IMAGE_TIMEOUT_MS, async (signal) => {
    const response = await fetch(url, { signal });
    const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
    const length = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || !type.startsWith('image/') || length > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${base64(bytes)}`;
  });
}

/**
 * An image store over `fetch`. An image whose host isn't one of `hosts` (the manifest's
 * `allowedHosts`) is never requested: the host would refuse it anyway.
 */
export function createImages(
  fetch: DisguiseFetch,
  hosts: readonly string[],
  limit = IMAGE_LIMIT,
): Images {
  // A Map keeps insertion order, so its first key is the image loaded first.
  const entries = new Map<string, Entry>();
  const loading = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  let generation = 0;

  const changed = () => listeners.forEach((listener) => listener());
  const put = (url: string, entry: Entry) => {
    entries.set(url, entry);
    while (entries.size > limit) entries.delete(entries.keys().next().value!);
    changed();
  };

  return {
    get: (url) => entries.get(url),
    load(url) {
      if (entries.has(url)) return Promise.resolve();
      const pending = loading.get(url);
      if (pending) return pending;
      const started = generation;
      const host = httpsHost(url);
      const request =
        host !== undefined && hosts.includes(host)
          ? fetchImage(fetch, rendition(url))
          : Promise.resolve(null);
      const load = request.then((entry) => {
        if (generation !== started) return;
        loading.delete(url);
        put(url, entry);
      });
      loading.set(url, load);
      return load;
    },
    clear() {
      generation += 1;
      entries.clear();
      loading.clear();
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * The `data:` URI of a story's image, loading it while `active` (the story is on screen or next
 * to it). `undefined` while not loaded, `null` when it failed or the story has none. Every card
 * and page that shows `url` reads the one store and re-renders when the image comes in, whichever
 * of them asked for it.
 */
export function useStoryImage(
  images: Images,
  url: string | undefined,
  active: boolean,
): Entry | undefined {
  const entry = useSyncExternalStore(images.subscribe, () =>
    url === undefined ? null : images.get(url),
  );
  useEffect(() => {
    if (url !== undefined && entry === undefined && active) void images.load(url);
  }, [images, url, entry, active]);
  return entry;
}
