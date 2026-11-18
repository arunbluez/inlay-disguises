// Every piece of copy Brief shows, in one place. `pnpm check-words` scans this file.
import type { Topic } from './feeds/defaults';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "now", "5m", "3h", "2d", else "12 Oct": how long ago a story came out. */
function ago(published: number, now: number): string {
  const elapsed = now - published;
  if (elapsed < MINUTE) return 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  const date = new Date(published);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export const strings = {
  appName: 'Brief',
  tabs: { feed: 'Feed', saved: 'Saved', settings: 'Settings' },
  topics: {
    all: 'All',
    news: 'News',
    tech: 'Tech',
    sport: 'Sport',
    science: 'Science',
  } satisfies Record<Topic | 'all', string>,
  feed: {
    search: 'Search',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'Pull down to refresh, or check Sources.',
    refreshFailed: 'Couldn’t refresh',
  },
  story: {
    /** "BBC World · 3h"; the time is left out when the feed gives none. */
    meta: (source: string, published: number, now: number) =>
      published > 0 ? `${source} · ${ago(published, now)}` : source,
    save: 'Save',
    unsave: 'Saved',
    saved: 'Saved for later',
    more: 'Tap to know more',
  },
  search: {
    emptyTitle: 'No results',
    emptyBody: 'Try another word, or check Sources.',
  },
  saved: {
    title: 'Saved',
    emptyTitle: 'Nothing saved yet',
    emptyBody: 'Save a story to read it later.',
  },
  sources: {
    title: 'Sources',
    note: 'Stories come from these feeds. Switch one off to leave it out of Feed.',
  },
  settings: {
    title: 'Settings',
    layout: 'Layout',
    list: 'List',
    shorts: 'Shorts',
    feeds: 'Feeds',
    sources: 'Sources',
    /** "6 of 7": sources switched on. */
    sourcesOn: (on: number, total: number) => `${on} of ${total}`,
    about: 'About',
    name: 'Name',
    version: 'Version',
    licence: 'Licence',
    licenceValue: 'Apache-2.0',
    parser: 'fast-xml-parser',
    parserLicence: 'MIT',
  },
} as const;
