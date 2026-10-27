// Brief's feed code on its own: the parser over synthetic RSS, Atom and RDF fixtures, the gist,
// URL checks, dates, the story cache and the preset list. Nothing here touches the network.
import { createMockHost } from '@inlay/testkit';

import {
  loadSaved,
  loadSourcesOff,
  loadStories,
  mergeStories,
  saveSaved,
  STORIES_KEY,
  STORY_LIMIT,
  storeStories,
} from '../src/feeds/cache';
import { allowedHosts, sources, type Source } from '../src/feeds/defaults';
import { parseDate, parseFeed, type Story } from '../src/feeds/parse';
import { decodeEntities, gist, GIST_MAX, plainText } from '../src/feeds/text';
import { absoluteHttps, httpsHost, isHttps } from '../src/feeds/url';

// Jest runs on Node; the package carries no Node types, so its two globals used here are declared.
declare const __dirname: string;
const fs: { readFileSync(path: string, encoding: 'utf8'): string } = require('fs');
const fixture = (name: string) => fs.readFileSync(`${__dirname}/fixtures/${name}.xml`, 'utf8');

const wire: Source = {
  id: 'wire',
  name: 'Example Wire',
  topic: 'news',
  url: 'https://news.example.org/feed.xml',
};

function story(id: string, published: number, extra: Partial<Story> = {}): Story {
  return {
    id,
    title: `Story ${id}`,
    link: `https://news.example.org/${id}`,
    source: 'wire',
    published,
    gist: '',
    ...extra,
  };
}

describe('parseFeed: RSS 2.0', () => {
  const stories = parseFeed(fixture('rss'), wire, STORY_LIMIT)!;
  const byLink = (suffix: string) => stories.find((s) => s.link.endsWith(suffix));

  it('reads every titled item, in document order, and skips the one without a title', () => {
    console.log(stories.map((s) => `${s.id} | ${s.title} | ${s.image ?? '(no image)'}`).join('\n'));
    expect(stories).toHaveLength(9);
    expect(stories.map((s) => s.source)).toEqual(Array(9).fill('wire'));
    expect(stories.some((s) => s.link.endsWith('/a/10'))).toBe(false);
  });

  it('uses the guid as the id, else the link', () => {
    expect(stories[0]!.id).toBe('wire-1');
    expect(byLink('/a/3')!.id).toBe('https://news.example.org/a/3');
  });

  it('decodes entities and character references in titles', () => {
    expect(stories[0]!.title).toBe('Media content image & a “quoted” title');
  });

  it('takes media:content of medium image first, skipping video', () => {
    expect(stories[0]!.image).toBe('https://images.example.org/1.jpg');
  });

  it('takes media:content of an image MIME type', () => {
    expect(byLink('/a/2')!.image).toBe('https://images.example.org/2.png');
  });

  it('takes media:thumbnail, with its query decoded', () => {
    expect(byLink('/a/3')!.image).toBe('https://images.example.org/3.jpg?w=240&h=135');
  });

  it('takes an image enclosure and ignores an audio one', () => {
    expect(byLink('/a/4')!.image).toBe('https://images.example.org/4.jpg');
  });

  it('takes the first <img> in content:encoded before the description, resolved to https', () => {
    expect(byLink('/a/5')!.image).toBe('https://news.example.org/img/5.jpg?a=1&b=2');
  });

  it('takes the first <img> in the description, protocol-relative made https', () => {
    expect(byLink('/a/6')!.image).toBe('https://images.example.org/6.jpg');
  });

  it('gives no image for an http: image or an item without one', () => {
    expect(byLink('/a/7')!.image).toBeUndefined();
    expect(byLink('/a/8')!.image).toBeUndefined();
  });

  it('keeps a non-https link as given (it never opens)', () => {
    expect(stories.find((s) => s.id === 'wire-9')!.link).toBe('javascript:alert(1)');
  });

  it('reduces the description to a plain-text gist', () => {
    expect(stories[0]!.gist).toBe('First story body.');
    expect(byLink('/a/5')!.gist).toBe('Fifth story.');
  });

  it('reads RFC 822 dates with offsets and zone names, and dc:date', () => {
    expect(stories[0]!.published).toBe(Date.UTC(2026, 9, 27, 17, 1, 37));
    expect(byLink('/a/2')!.published).toBe(Date.UTC(2026, 9, 27, 17, 0, 51));
    expect(byLink('/a/3')!.published).toBe(Date.UTC(2026, 9, 27, 12, 0, 0));
    expect(byLink('/a/8')!.published).toBe(Date.UTC(2026, 9, 26, 9, 30, 0));
    expect(byLink('/a/4')!.published).toBe(0);
  });
});

describe('parseFeed: Atom 1.0', () => {
  const stories = parseFeed(fixture('atom'), wire, STORY_LIMIT)!;

  it('reads entries with the alternate link, id, html title and dates', () => {
    console.log(JSON.stringify(stories, null, 1));
    expect(stories).toHaveLength(3);
    expect(stories[0]).toMatchObject({
      id: 'urn:example:journal:1',
      title: 'Atom entry one',
      link: 'https://journal.example.org/1',
      published: Date.UTC(2026, 9, 27, 9, 0, 0),
      gist: 'Summary one.',
      image: 'https://journal.example.org/pictures/1.jpg',
    });
    expect(stories[1]!.link).toBe('https://journal.example.org/2');
  });

  it('prefers media:thumbnail to an <img> in content', () => {
    expect(stories[1]!.image).toBe('https://images.example.org/atom-2-thumb.jpg');
    expect(stories[1]!.gist).toBe('Content two.');
  });

  it('gives no image when an entry has none', () => {
    expect(stories[2]!.image).toBeUndefined();
    expect(stories[2]!.gist).toBe('Plain summary three.');
  });
});

describe('parseFeed: RSS 1.0 (RDF)', () => {
  const stories = parseFeed(fixture('rdf'), wire, STORY_LIMIT)!;

  it('reads the items beside the channel, with dc:date and rdf:about', () => {
    console.log(JSON.stringify(stories, null, 1));
    expect(stories).toHaveLength(2);
    expect(stories[0]).toMatchObject({
      id: 'https://bulletin.example.org/1',
      title: 'RDF item one',
      published: Date.UTC(2026, 9, 27, 6, 0, 0),
      image: 'https://images.example.org/rdf-1.jpg',
      gist: 'First bulletin.',
    });
    expect(stories[1]!.link).toBe('https://bulletin.example.org/2');
  });
});

describe('parseFeed: hostile and broken input', () => {
  it('never expands DOCTYPE entities (billion laughs)', () => {
    const started = Date.now();
    const stories = parseFeed(fixture('entities'), wire, STORY_LIMIT);
    console.log('entities result:', JSON.stringify(stories), `${Date.now() - started} ms`);
    for (const parsed of stories ?? []) {
      expect(parsed.title.length).toBeLessThan(100);
      expect(parsed.gist).not.toContain('lollollol');
    }
  });

  it('returns null for something that is not a feed', () => {
    expect(parseFeed('<html><body>Not found</body></html>', wire, STORY_LIMIT)).toBeNull();
    expect(parseFeed('{"items": []}', wire, STORY_LIMIT)).toBeNull();
    expect(parseFeed('', wire, STORY_LIMIT)).toBeNull();
  });

  it('never throws on malformed XML', () => {
    for (const xml of [
      '<rss><channel><item><title>Broken',
      '<rss><channel><item><title>One</title></channel>',
      '<<<>>>',
      '<rss version="2.0"><channel></channel></rss>',
      '<feed></feed>',
    ]) {
      const result = parseFeed(xml, wire, STORY_LIMIT);
      console.log(JSON.stringify(xml), '→', JSON.stringify(result));
      expect(result === null || Array.isArray(result)).toBe(true);
    }
  });

  it('keeps only the first `limit` of a huge feed', () => {
    const items = Array.from(
      { length: 5000 },
      (_, i) =>
        `<item><title>Item ${i}</title><link>https://news.example.org/${i}</link><description>Body ${i}</description></item>`,
    ).join('');
    const started = Date.now();
    const stories = parseFeed(`<rss><channel>${items}</channel></rss>`, wire, STORY_LIMIT)!;
    console.log(`5000 items parsed in ${Date.now() - started} ms`);
    expect(stories).toHaveLength(STORY_LIMIT);
    expect(stories[0]!.title).toBe('Item 0');
  });
});

describe('text', () => {
  it('decodes named entities and character references once', () => {
    expect(decodeEntities('a &amp;lt; b &#38; c &#x2014; d &eacute; &Eacute; &bogus;')).toBe(
      'a &lt; b & c — d é &Eacute; &bogus;',
    );
  });

  it('strips tags, scripts and comments and collapses whitespace', () => {
    expect(
      plainText('<p>One\n\n <b>two</b></p><script>alert(1)</script><!-- x --><style>p{}</style>'),
    ).toBe('One two');
  });

  it('keeps a short summary whole', () => {
    expect(gist('<p>Short.</p>')).toBe('Short.');
  });

  it(`trims a long summary to ${GIST_MAX} characters on a word boundary`, () => {
    const long = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const trimmed = gist(long);
    console.log(trimmed);
    expect(trimmed.endsWith('…')).toBe(true);
    expect(trimmed.length).toBeLessThanOrEqual(GIST_MAX + 1);
    expect(long.startsWith(trimmed.slice(0, -1))).toBe(true);
    expect(long[trimmed.length - 1]).toBe(' ');
  });

  it('cuts a single huge word mid-word', () => {
    expect(gist('x'.repeat(400))).toBe(`${'x'.repeat(GIST_MAX)}…`);
  });
});

describe('url', () => {
  it('finds the host of https URLs only', () => {
    expect(httpsHost('https://Feeds.BBCI.co.uk/news/rss.xml')).toBe('feeds.bbci.co.uk');
    expect(httpsHost('http://feeds.bbci.co.uk/')).toBeUndefined();
    expect(httpsHost('https://user@feeds.bbci.co.uk/')).toBeUndefined();
    expect(isHttps('javascript:alert(1)')).toBe(false);
    expect(isHttps('intent://x#Intent;end')).toBe(false);
  });

  it('resolves relative references against an https base', () => {
    const base = 'https://news.example.org/a/b/page.html?x=1';
    expect(absoluteHttps('/i.jpg', base)).toBe('https://news.example.org/i.jpg');
    expect(absoluteHttps('i.jpg', base)).toBe('https://news.example.org/a/b/i.jpg');
    expect(absoluteHttps('//cdn.example.org/i.jpg', base)).toBe('https://cdn.example.org/i.jpg');
    expect(absoluteHttps('http://cdn.example.org/i.jpg', base)).toBeUndefined();
    expect(absoluteHttps('data:image/png;base64,AAAA', base)).toBeUndefined();
    expect(absoluteHttps('i.jpg', 'http://news.example.org/')).toBeUndefined();
  });
});

describe('parseDate', () => {
  it('reads RFC 822 and ISO 8601, else 0', () => {
    expect(parseDate('Tue, 27 Oct 2026 13:01:37 -0400')).toBe(Date.UTC(2026, 9, 27, 17, 1, 37));
    expect(parseDate('27 Oct 26 13:01 PDT')).toBe(Date.UTC(2026, 9, 27, 20, 1, 0));
    expect(parseDate('2026-10-27T10:00:00+02:00')).toBe(Date.UTC(2026, 9, 27, 8, 0, 0));
    expect(parseDate('yesterday')).toBe(0);
    expect(parseDate('Tue, 27 Foo 2026 13:01:37 GMT')).toBe(0);
  });
});

describe('cache', () => {
  it('dedupes by id and by link, the fresh copy winning', () => {
    const merged = mergeStories(
      [story('a', 1, { title: 'old' }), story('b', 2)],
      [story('a', 1, { title: 'new' }), story('c', 3, { link: 'https://news.example.org/b' })],
    );
    console.log(merged.map((s) => `${s.id} ${s.title}`));
    expect(merged.map((s) => s.id)).toEqual(['c', 'a']);
    expect(merged[1]!.title).toBe('new');
  });

  it(`keeps the newest ${STORY_LIMIT}, newest first`, () => {
    const many = Array.from({ length: 450 }, (_, i) => story(`s${i}`, i));
    const merged = mergeStories(many.slice(0, 200), many.slice(200));
    expect(merged).toHaveLength(STORY_LIMIT);
    expect(merged[0]!.id).toBe('s449');
    expect(merged.at(-1)!.id).toBe('s250');
  });

  it('stores only Story fields, under a versioned key, capped', () => {
    const storage = createMockHost().storage;
    const extra = { ...story('x', 5), bytes: 'AAAA', data: 'data:image/png;base64,AAAA' };
    storeStories(storage, [extra, ...Array.from({ length: 300 }, (_, i) => story(`s${i}`, i))]);
    const raw = storage.getString(STORIES_KEY)!;
    expect(raw).not.toContain('data:');
    expect(raw).not.toContain('bytes');
    expect(loadStories(storage)).toHaveLength(STORY_LIMIT);
    expect([...storage.entries.keys()]).toEqual([STORIES_KEY]);
  });

  it('reads damaged values as empty', () => {
    const storage = createMockHost().storage;
    storage.set(STORIES_KEY, '{not json');
    storage.set('saved.v1', JSON.stringify([{ id: 1 }, story('ok', 1)]));
    storage.set('sources-off.v1', JSON.stringify(['bbc-sport', 4]));
    expect(loadStories(storage)).toEqual([]);
    expect(loadSaved(storage).map((s) => s.id)).toEqual(['ok']);
    expect(loadSourcesOff(storage)).toEqual(['bbc-sport']);
    saveSaved(storage, []);
    expect(loadSaved(storage)).toEqual([]);
  });
});

describe('presets', () => {
  it('has six or seven https feeds across the four topics', () => {
    console.log(sources.map((s) => `${s.id} (${s.topic}) ${s.url}`).join('\n'));
    expect(sources.length).toBeGreaterThanOrEqual(6);
    expect(sources.length).toBeLessThanOrEqual(7);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
    expect(new Set(sources.map((s) => s.topic))).toEqual(
      new Set(['news', 'tech', 'sport', 'science']),
    );
    for (const source of sources) expect(isHttps(source.url)).toBe(true);
  });

  it('allows exactly the feed hosts and the image hosts: exact names, no wildcard, no IP', () => {
    console.log(allowedHosts.join('\n'));
    expect(allowedHosts).toEqual([
      'feeds.bbci.co.uk',
      'feeds.npr.org',
      'feeds.arstechnica.com',
      'www.sciencenews.org',
      'www.nasa.gov',
      'ichef.bbci.co.uk',
      'npr.brightspotcdn.com',
      'cdn.arstechnica.net',
      'assets.science.nasa.gov',
      'images-assets.nasa.gov',
    ]);
    for (const host of allowedHosts) {
      expect(host).toMatch(/^[a-z\d-]+(\.[a-z\d-]+)+$/);
      expect(host).not.toMatch(/^[\d.]+$/);
      expect(host).not.toBe('localhost');
    }
  });
});
