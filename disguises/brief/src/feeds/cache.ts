// What Brief keeps in disguise storage: the story cache, Saved, the sources switched off and the
// layout. Only `Story` fields are stored, never image bytes. Keys carry a version; a value that
// doesn't parse reads as the default.
import type { DisguiseStorage } from '@inlay/disguise-sdk';

import type { Story } from './parse';

/** Stories the cache keeps, newest first. */
export const STORY_LIMIT = 200;

export const STORIES_KEY = 'stories.v1';
export const SAVED_KEY = 'saved.v1';
export const SOURCES_OFF_KEY = 'sources-off.v1';
export const LAYOUT_KEY = 'layout.v1';

export type Layout = 'list' | 'shorts';

function isStory(value: unknown): value is Story {
  if (typeof value !== 'object' || value === null) return false;
  const story = value as Record<string, unknown>;
  return (
    typeof story.id === 'string' &&
    typeof story.title === 'string' &&
    typeof story.link === 'string' &&
    typeof story.source === 'string' &&
    typeof story.published === 'number' &&
    typeof story.gist === 'string' &&
    (story.image === undefined || typeof story.image === 'string')
  );
}

/** Copies only the `Story` fields, so nothing else a caller attached is ever stored. */
function stored({ id, title, link, source, published, gist, image }: Story): Story {
  return image === undefined
    ? { id, title, link, source, published, gist }
    : { id, title, link, source, published, gist, image };
}

function readList<T>(storage: DisguiseStorage, key: string, valid: (value: unknown) => value is T) {
  try {
    const parsed: unknown = JSON.parse(storage.getString(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch {
    return [];
  }
}

export function loadStories(storage: DisguiseStorage): Story[] {
  return readList(storage, STORIES_KEY, isStory);
}

export function loadSaved(storage: DisguiseStorage): Story[] {
  return readList(storage, SAVED_KEY, isStory);
}

export function saveSaved(storage: DisguiseStorage, saved: readonly Story[]): void {
  storage.set(SAVED_KEY, JSON.stringify(saved.map(stored)));
}

export function loadSourcesOff(storage: DisguiseStorage): string[] {
  return readList(storage, SOURCES_OFF_KEY, (value): value is string => typeof value === 'string');
}

export function saveSourcesOff(storage: DisguiseStorage, off: readonly string[]): void {
  storage.set(SOURCES_OFF_KEY, JSON.stringify(off));
}

export function loadLayout(storage: DisguiseStorage): Layout {
  return storage.getString(LAYOUT_KEY) === 'shorts' ? 'shorts' : 'list';
}

export function saveLayout(storage: DisguiseStorage, layout: Layout): void {
  storage.set(LAYOUT_KEY, layout);
}

/**
 * `fresh` merged into `cached`: a story whose id or link is already known is dropped (the fresh
 * copy replaces the cached one), then the newest `STORY_LIMIT` are kept, newest first.
 */
export function mergeStories(cached: readonly Story[], fresh: readonly Story[]): Story[] {
  const ids = new Set<string>();
  const links = new Set<string>();
  const merged: Story[] = [];
  for (const story of [...fresh, ...cached]) {
    if (ids.has(story.id) || (story.link !== '' && links.has(story.link))) continue;
    ids.add(story.id);
    if (story.link !== '') links.add(story.link);
    merged.push(story);
  }
  return merged.sort((a, b) => b.published - a.published).slice(0, STORY_LIMIT);
}

/** Merges `fresh` into the stored cache, stores the result and returns it. */
export function storeStories(storage: DisguiseStorage, fresh: readonly Story[]): Story[] {
  const merged = mergeStories(loadStories(storage), fresh);
  storage.set(STORIES_KEY, JSON.stringify(merged.map(stored)));
  return merged;
}
