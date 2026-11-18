// The fixed feeds Brief reads, and every host it may fetch from. Each feed was checked live: valid
// RSS over HTTPS, and the exact hosts its item images come from (see the package README).
import { httpsHost } from './url';

export type Topic = 'news' | 'tech' | 'sport' | 'science';

export interface Source {
  /** Stable id, stored with each story and in the on/off settings. */
  id: string;
  name: string;
  topic: Topic;
  /** The feed, always `https:`. */
  url: string;
}

export const sources: readonly Source[] = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    topic: 'news',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
  {
    id: 'bbc-business',
    name: 'BBC Business',
    topic: 'news',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  },
  { id: 'npr-news', name: 'NPR News', topic: 'news', url: 'https://feeds.npr.org/1001/rss.xml' },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    topic: 'tech',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
  },
  {
    id: 'bbc-sport',
    name: 'BBC Sport',
    topic: 'sport',
    url: 'https://feeds.bbci.co.uk/sport/rss.xml',
  },
  {
    id: 'science-news',
    name: 'Science News',
    topic: 'science',
    url: 'https://www.sciencenews.org/feed',
  },
  { id: 'nasa', name: 'NASA', topic: 'science', url: 'https://www.nasa.gov/feed/' },
];

/**
 * Hosts the feeds' item images come from. An image on any other host is never requested by the
 * host app, so its story shows as a text card.
 */
const imageHosts = [
  'ichef.bbci.co.uk',
  'npr.brightspotcdn.com',
  'cdn.arstechnica.net',
  'www.sciencenews.org',
  'www.nasa.gov',
  'assets.science.nasa.gov',
  'images-assets.nasa.gov',
] as const;

/** The manifest's `allowedHosts`: every feed host, then every image host, each once. */
export const allowedHosts: readonly string[] = [
  ...new Set([...sources.map((source) => httpsHost(source.url)!), ...imageHosts]),
];

export function sourceById(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}
