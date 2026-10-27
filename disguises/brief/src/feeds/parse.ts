// RSS 2.0, RSS 1.0 (RDF) and Atom 1.0 to `Story` records. Only the feed's own fields are read:
// nothing here requests the article or any other page.
import { XMLParser } from 'fast-xml-parser';

import type { Source } from './defaults';
import { decodeEntities, gist, plainText } from './text';
import { absoluteHttps } from './url';

/** One feed item, as Brief keeps it. Image bytes are never part of it, only the image's URL. */
export interface Story {
  /** The item's guid or Atom id, else its link. */
  id: string;
  title: string;
  /** The article, as the feed gives it; only an `https:` link ever opens. */
  link: string;
  /** `Source.id` of the feed it came from. */
  source: string;
  /** Publication (or last update) time in ms since the epoch; 0 when the feed gives none. */
  published: number;
  /** The summary as plain text, trimmed (see `gist`). */
  gist: string;
  /** Absolute `https:` URL of the item's image, when it has one. */
  image?: string;
}

/** Elements that may repeat; the parser returns them as arrays even when there is one. */
const REPEATED = new Set([
  'item',
  'entry',
  'link',
  'media:content',
  'media:thumbnail',
  'enclosure',
]);

// Entities: the parser decodes only XML's five predefined ones (`decodeEntities` does character
// references); a DOCTYPE may define none (`maxEntityCount: 0`), so a billion-laughs document
// expands nothing and its references stay as plain text.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: { enabled: true, maxEntityCount: 0 },
  isArray: (name, _path, _leaf, isAttribute) => !isAttribute && REPEATED.has(name),
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/** An element's text: the string itself, or its `#text` when it has attributes. */
function text(value: unknown): string {
  const first = list(value)[0];
  if (typeof first === 'string') return first.trim();
  if (isNode(first) && typeof first['#text'] === 'string') return first['#text'].trim();
  return '';
}

function attribute(value: unknown, name: string): string {
  const found = isNode(value) ? value[`@_${name}`] : undefined;
  return typeof found === 'string' ? found.trim() : '';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ZONES: Readonly<Record<string, number>> = {
  UT: 0,
  UTC: 0,
  GMT: 0,
  Z: 0,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  PST: -8,
  PDT: -7,
};

/** RFC 822 dates (RSS: "Tue, 27 Oct 2026 13:01:37 -0400") and ISO 8601 (Atom), in ms; else 0. */
export function parseDate(value: string): number {
  const rfc822 =
    /^(?:[a-z]{3},?\s+)?(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-]\d{4}|[a-z]{1,3})?\s*$/i.exec(
      value.trim(),
    );
  if (!rfc822) {
    const iso = Date.parse(value);
    return Number.isNaN(iso) ? 0 : iso;
  }
  const [, day, monthName, yearText, hours, minutes, seconds, zone = 'GMT'] = rfc822;
  const month = MONTHS.indexOf(monthName!.toLowerCase());
  if (month < 0) return 0;
  const year = Number(yearText) < 100 ? 2000 + Number(yearText) : Number(yearText);
  let offsetMinutes: number;
  if (/^[+-]\d{4}$/.test(zone)) {
    const sign = zone[0] === '-' ? -1 : 1;
    offsetMinutes = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3)));
  } else {
    const hoursOff = ZONES[zone.toUpperCase()];
    if (hoursOff === undefined) return 0;
    offsetMinutes = hoursOff * 60;
  }
  const utc = Date.UTC(
    year,
    month,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds ?? 0),
  );
  return utc - offsetMinutes * 60_000;
}

/** The first `<img src>` in a piece of HTML. */
function firstImgSrc(html: string): string | undefined {
  const match = /<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(html);
  const src = match ? (match[1] ?? match[2] ?? match[3]) : undefined;
  return src === undefined ? undefined : decodeEntities(src);
}

/**
 * The item's image, first match of: `media:content` that is an image, `media:thumbnail`,
 * an `enclosure` of an image type, the first `<img>` in `content:encoded` (Atom: `content`), then
 * in `description` (Atom: `summary`). Resolved against `base`; `undefined` unless `https:`.
 */
function imageOf(item: Node, base: string): string | undefined {
  const groups = [item, ...list(item['media:group']).filter(isNode)];
  const media = groups.flatMap((group) => list(group['media:content']));
  const thumbnails = groups.flatMap((group) => list(group['media:thumbnail']));
  const candidates = [
    ...media
      .filter(
        (node) =>
          attribute(node, 'medium') === 'image' || attribute(node, 'type').startsWith('image/'),
      )
      .map((node) => attribute(node, 'url')),
    ...thumbnails.map((node) => attribute(node, 'url')),
    ...list(item.enclosure)
      .filter((node) => attribute(node, 'type').startsWith('image/'))
      .map((node) => attribute(node, 'url')),
    firstImgSrc(text(item['content:encoded']) || text(item.content)),
    firstImgSrc(text(item.description) || text(item.summary)),
  ];
  const found = candidates.find((url) => url !== undefined && url !== '');
  return found === undefined ? undefined : absoluteHttps(found, base);
}

/** The Atom entry's article link: `rel="alternate"` or no `rel`. */
function atomLink(entry: Node): string {
  const links = list(entry.link);
  const alternate = links.find((link) => ['', 'alternate'].includes(attribute(link, 'rel')));
  return attribute(alternate, 'href');
}

function storyOf(item: Node, atom: boolean, source: Source): Story | null {
  const title = plainText(text(item.title));
  const link = atom ? atomLink(item) : text(item.link) || attribute(item, 'rdf:about');
  const id = text(atom ? item.id : item.guid) || link;
  if (title === '' || id === '') return null;
  const published = parseDate(
    text(item.pubDate) || text(item['dc:date']) || text(item.published) || text(item.updated),
  );
  const summary = atom
    ? text(item.summary) || text(item.content)
    : text(item.description) || text(item['content:encoded']);
  const image = imageOf(item, link || source.url);
  const story: Story = { id, title, link, source: source.id, published, gist: gist(summary) };
  return image === undefined ? story : { ...story, image };
}

/**
 * The feed's newest `limit` items in document order, as stories (items without a title, or
 * without both an id and a link, are skipped). `null` when the text is not RSS, RDF or Atom.
 */
export function parseFeed(xml: string, source: Source, limit: number): Story[] | null {
  let document: unknown;
  try {
    document = parser.parse(xml);
  } catch {
    return null;
  }
  if (!isNode(document)) return null;
  const rss = document.rss;
  const rdf = document['rdf:RDF'];
  const atom = document.feed;
  let items: unknown[];
  if (isNode(rss)) items = isNode(rss.channel) ? list(rss.channel.item) : [];
  else if (isNode(rdf)) items = list(rdf.item);
  else if (isNode(atom)) items = list(atom.entry);
  else if (rss === '' || rdf === '' || atom === '') items = [];
  else return null;
  return items
    .slice(0, limit)
    .filter(isNode)
    .map((item) => storyOf(item, isNode(atom), source))
    .filter((story): story is Story => story !== null);
}
