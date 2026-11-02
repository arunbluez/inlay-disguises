// Fetches the enabled feeds through the host's fetch (which enforces `allowedHosts`). Never
// throws: a feed that fails only counts as failed, and the others still arrive.
import type { DisguiseFetch } from '@inlay/disguise-sdk';

import { STORY_LIMIT } from './cache';
import type { Source } from './defaults';
import { parseFeed, type Story } from './parse';

/** How long one feed may take, in ms. */
export const FEED_TIMEOUT_MS = 15_000;

/** Larger feeds are not parsed (characters). */
const MAX_FEED_LENGTH = 5_000_000;

export interface FeedsResult {
  stories: Story[];
  /** Ids of the sources that failed (network, HTTP status, timeout, or not a feed). */
  failed: string[];
}

/**
 * `work` with a deadline: after `ms` it is aborted and the result is `null`, even when the
 * request ignores the abort. A rejection is `null` too.
 */
export async function withDeadline<T>(
  ms: number,
  work: (signal: AbortSignal) => Promise<T | null>,
): Promise<T | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, ms);
  });
  try {
    return await Promise.race([work(controller.signal).catch(() => null), late]);
  } finally {
    clearTimeout(timer);
  }
}

function fetchFeed(fetch: DisguiseFetch, source: Source): Promise<Story[] | null> {
  return withDeadline(FEED_TIMEOUT_MS, async (signal) => {
    const response = await fetch(source.url, { signal });
    if (!response.ok) return null;
    const xml = await response.text();
    return xml.length > MAX_FEED_LENGTH ? null : parseFeed(xml, source, STORY_LIMIT);
  });
}

/** Fetches every source in `enabled` at once; the result lists their stories and the failures. */
export async function fetchFeeds(
  fetch: DisguiseFetch,
  enabled: readonly Source[],
): Promise<FeedsResult> {
  const results = await Promise.all(enabled.map((source) => fetchFeed(fetch, source)));
  return {
    stories: results.flatMap((stories) => stories ?? []),
    failed: enabled.filter((_, index) => results[index] === null).map((source) => source.id),
  };
}
