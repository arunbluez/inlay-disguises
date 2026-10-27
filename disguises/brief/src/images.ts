// Story images, held in memory only. The bytes come through the host's fetch (so `allowedHosts`
// applies to images too) and become a `data:` URI for React Native's `Image`; nothing is written
// to disguise storage or to any file, and `clear` drops every one.
import type { DisguiseFetch } from '@inlay/disguise-sdk';
import { useEffect, useState } from 'react';

import { withDeadline } from './feeds/fetchFeeds';
import { httpsHost } from './feeds/url';

/** Larger images are skipped (bytes); their story shows as a text card. */
export const MAX_IMAGE_BYTES = 1_500_000;

/** Images kept at once; the least recently used goes first. */
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
  // A Map keeps insertion order, so re-inserting on use makes the first key the least recent.
  const entries = new Map<string, Entry>();
  const loading = new Map<string, Promise<void>>();
  let generation = 0;

  const put = (url: string, entry: Entry) => {
    entries.delete(url);
    entries.set(url, entry);
    while (entries.size > limit) entries.delete(entries.keys().next().value!);
  };

  return {
    get(url) {
      const entry = entries.get(url);
      if (entry !== undefined) put(url, entry);
      return entry;
    },
    load(url) {
      if (entries.has(url)) return Promise.resolve();
      const pending = loading.get(url);
      if (pending) return pending;
      const started = generation;
      const host = httpsHost(url);
      const request =
        host !== undefined && hosts.includes(host) ? fetchImage(fetch, url) : Promise.resolve(null);
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
    },
  };
}

/**
 * The `data:` URI of a story's image, loading it while `active` (the story is on screen or next
 * to it). `undefined` while not loaded, `null` when it failed or the story has none.
 */
export function useStoryImage(
  images: Images,
  url: string | undefined,
  active: boolean,
): Entry | undefined {
  const [, setLoaded] = useState(0);
  const entry = url === undefined ? null : images.get(url);
  useEffect(() => {
    if (url === undefined || entry !== undefined || !active) return;
    let mounted = true;
    void images.load(url).then(() => {
      if (mounted) setLoaded((count) => count + 1);
    });
    return () => {
      mounted = false;
    };
  }, [images, url, entry, active]);
  return entry;
}
